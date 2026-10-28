// Couche de données : stockage local, file d'attente hors ligne, synchronisation, authentification
import { API_URL } from './config.js';
import { DEFAULTS } from './defaults.js';
import { uid as makeId, debounce, clone } from './util.js';

export const TABLES = ['users', 'gestes', 'objectifs', 'entretiens', 'meteo', 'flash', 'retours', 'badges', 'connexions', 'photos', 'echo_items', 'echo_valid', 'config'];
export class NetError extends Error {}
export class ApiError extends Error {}

// Session commune à Carnet Réa et EchoLearn (même domaine) : une connexion dans l'une ouvre l'autre
export const K_SESSION = 'cr:session';
const K_UNLOCK = ['cr:unlock', 'cr:unlockAt', 'cr:unlockAsked'];
const kDb = uid => 'cr:db:' + uid;
const OVERLAP = 10000;            // marge de recouvrement de la synchro incrémentale
const FULL_EVERY = 24 * 3600e3;   // resynchronisation complète quotidienne

/* ---------- Stockage local tolérant aux pannes ---------- */
const mem = {};
export function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return k in mem ? mem[k] : null; } }
export function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { mem[k] = v; return false; } }
export function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } delete mem[k]; }

/* ---------- État ---------- */
export const S = {
  session: null, me: null, db: null,
  online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  syncing: false, lastSync: 0, error: '', mustChange: false, notice: '', storageFull: false
};
const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(kind, payload) { listeners.forEach(fn => { try { fn(kind, payload); } catch (e) { console.error(e); } }); }

function emptyDb() {
  const rows = {}; TABLES.forEach(t => (rows[t] = {}));
  return { rows, ops: [], since: 0, lastFull: 0, stats: null, forceFull: false };
}
function loadDb(uid) {
  const raw = lsGet(kDb(uid));
  if (raw) {
    try {
      const d = JSON.parse(raw);
      const base = emptyDb();
      TABLES.forEach(t => { if (d.rows && d.rows[t]) base.rows[t] = d.rows[t]; });
      base.ops = (d.ops || []).map(o => { delete o.sent; return o; });
      base.since = d.since || 0; base.lastFull = d.lastFull || 0; base.stats = d.stats || null;
      return base;
    } catch (e) { /* base corrompue : on repart de zéro (le serveur refait tout) */ }
  }
  return emptyDb();
}
const cache = {};
let cfgCache = null;
function touch(tbl) { delete cache[tbl]; if (tbl === 'config') cfgCache = null; }
function touchAll() { Object.keys(cache).forEach(k => delete cache[k]); cfgCache = null; }

const persistNow = () => {
  if (!S.db || !S.me) return;
  const ok = lsSet(kDb(S.me.id), JSON.stringify(S.db));
  if (!ok && !S.storageFull) { S.storageFull = true; emit('status'); }
};
const persistSoon = debounce(persistNow, 400);
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persistNow(); else onVisible(); });
  window.addEventListener('pagehide', persistNow);
  window.addEventListener('online', () => { S.online = true; emit('status'); sync(); });
  window.addEventListener('offline', () => { S.online = false; emit('status'); });
}

function saveSession() { if (S.session) lsSet(K_SESSION, JSON.stringify({ token: S.session.token, user: S.me })); }

/* ---------- Lecture ---------- */
export function all(tbl) {
  if (!S.db) return [];
  return cache[tbl] || (cache[tbl] = Object.values(S.db.rows[tbl] || {}));
}
export function get(tbl, id) { return S.db && S.db.rows[tbl] ? S.db.rows[tbl][id] || null : null; }
export function cfg(key) {
  if (!cfgCache) {
    cfgCache = {};
    all('config').forEach(r => { if (r.valeur !== null && r.valeur !== undefined) cfgCache[r.id] = r.valeur; });
  }
  const v = cfgCache[key];
  const d = DEFAULTS[key];
  if (key === 'gestes') return withEcho(v === undefined ? d : v);
  if (v === undefined) return d;
  if (v && d && typeof v === 'object' && typeof d === 'object' && !Array.isArray(v) && !Array.isArray(d)) return Object.assign({}, d, v);
  return v;
}
/** La famille de gestes « Écho » est ajoutée si une configuration plus ancienne ne la contient pas. */
function withEcho(list) {
  if (!Array.isArray(list) || list.some(g => g.id === 'echo')) return list;
  return list.concat((DEFAULTS.gestes || []).filter(g => g.id === 'echo'));
}
export function pendingCount() { return S.db ? S.db.ops.length : 0; }
export function isPending(tbl, id) { return !!S.db && S.db.ops.some(o => o.tbl === tbl && o.row.id === id); }
export function stats() { return S.db ? S.db.stats : null; }
export function curSem() { return S.me && S.me.role === 'interne' && S.me.sem ? S.me.sem : cfg('semestreCourant'); }
export function semInfo(id) { return (cfg('semestres') || []).find(s => s.id === id) || null; }
export function isReadOnly() { return !!S.me && S.me.role === 'interne' && S.me.sem !== cfg('semestreCourant'); }

/* ---------- Écriture locale + file d'attente ---------- */
function queueOp(t, tbl, row, isNew) {
  const ops = S.db.ops;
  const i = ops.findIndex(o => !o.sent && o.tbl === tbl && o.row.id === row.id);
  if (t === 'put') {
    if (i >= 0 && ops[i].t === 'put') ops[i].row = Object.assign({}, ops[i].row, row);
    else ops.push({ id: makeId(), t: 'put', tbl, row: Object.assign({}, row), isNew: !!isNew, ts: Date.now() });
  } else {
    if (i >= 0 && ops[i].t === 'put' && ops[i].isNew) { ops.splice(i, 1); return; }
    if (i >= 0) ops.splice(i, 1);
    ops.push({ id: makeId(), t: 'del', tbl, row: { id: row.id }, ts: Date.now() });
  }
}
function afterLocal() { persistSoon(); emit('data'); scheduleSync(); }
const scheduleSync = debounce(() => sync(), 700);

export function put(tbl, row) {
  if (!S.db) throw new Error('Non connecté');
  if (!row.id) row.id = makeId();
  const cur = S.db.rows[tbl][row.id];
  S.db.rows[tbl][row.id] = Object.assign({}, cur || {}, row);
  touch(tbl);
  queueOp('put', tbl, row, !cur);
  afterLocal();
  return S.db.rows[tbl][row.id];
}
export function del(tbl, id) {
  if (!S.db) return;
  delete S.db.rows[tbl][id];
  touch(tbl);
  queueOp('del', tbl, { id });
  afterLocal();
}
export function saveCfg(key, valeur) { return put('config', { id: key, valeur: clone(valeur) }); }
/** Enregistre un compte en renvoyant tous les champs (le serveur remplace ce qui n'est pas fourni) */
export function saveUser(u, patch) {
  return put('users', Object.assign({ id: u.id, nom: u.nom, prenom: u.prenom, email: u.email || '', role: u.role, specialite: u.specialite || '', rang: u.rang || 0, actif: u.actif !== false, tuteurId: u.tuteurId || '', etab: u.etab, service: u.service }, patch));
}

/* ---------- Profil (DES d'origine, semestre de DES, photo) ---------- */
/** Fiche à jour : les modifications locales (pas encore synchronisées) priment sur la copie reçue à la connexion */
export function meNow() { return S.me ? Object.assign({}, S.me, get('users', S.me.id) || {}) : null; }
export function profileComplete(u) { return !!(u && u.specialite && Number(u.rang) >= 1 && Number(u.rang) <= 12); }
export function needsProfile() { const m = meNow(); return !!(m && m.role === 'interne' && !profileComplete(m)); }
export function photoOf(uid) { const p = get('photos', uid); return p && p.data ? p.data : ''; }
export function setPhoto(uid, data) { return put('photos', { id: uid, uid, data: data || '' }); }
/** « Anesthésie-Réanimation · S3 » */
export function desLabel(u) { return u ? [u.specialite, u.rang ? 'S' + u.rang : null].filter(Boolean).join(' · ') : ''; }

/* ---------- Réseau ---------- */
export async function api(req, timeout = 30000) {
  if (!API_URL) throw new NetError("L'adresse du serveur n'est pas configurée (fichier js/config.js).");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  let txt;
  try {
    const r = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(req), signal: ctrl.signal, redirect: 'follow' });
    txt = await r.text();
  } catch (e) {
    throw new NetError('Pas de connexion au serveur.');
  } finally { clearTimeout(timer); }
  try { return JSON.parse(txt); } catch (e) { throw new NetError('Réponse inattendue du serveur.'); }
}
function authLost(msg) {
  const uid = S.me && S.me.id;
  persistNow();
  lsDel(K_SESSION);
  S.session = null; S.me = null; S.db = null; S.mustChange = false;
  S.notice = msg || 'Ta session a expiré, reconnecte-toi.';
  S.lostUid = uid;
  touchAll();
  emit('session');
}
export async function callAuth(req) {
  if (!S.session) throw new ApiError('Non connecté.');
  const r = await api(Object.assign({}, req, { token: S.session.token }));
  if (!r.ok) {
    if (r.err === 'auth') { authLost(); throw new ApiError('Session expirée.'); }
    throw new ApiError(r.err || 'Erreur.');
  }
  return r;
}

/* ---------- Authentification ---------- */
function startSession(r) {
  S.session = { token: r.token };
  S.me = r.user;
  S.mustChange = !!r.mustChange;
  S.notice = '';
  S.error = '';
  S.db = loadDb(r.user.id);
  touchAll();
  saveSession();
  lsSet('cr:unlockAt', String(Date.now())); // on vient de saisir le mot de passe : pas de second contrôle
  emit('session');
  sync({ force: !S.db.since });
}
export async function login(username, password) {
  const r = await api({ a: 'login', username, password });
  if (!r.ok) throw new ApiError(r.err || 'Connexion impossible.');
  startSession(r);
  return r;
}
export async function register(p) {
  const r = await api(Object.assign({ a: 'register' }, p));
  if (!r.ok) throw new ApiError(r.err || 'Inscription impossible.');
  startSession(r);
  return r;
}
export async function forgot(username) {
  const r = await api({ a: 'forgot', username });
  if (!r.ok) throw new ApiError(r.err || 'Erreur.');
  return r;
}
export async function resetPw(username, code, password) {
  const r = await api({ a: 'reset', username, code, password });
  if (!r.ok) throw new ApiError(r.err || 'Erreur.');
  return r;
}
export async function changePw(old, password) {
  await callAuth({ a: 'chpw', old, password });
  S.mustChange = false;
  emit('session');
}
export function restoreSession() {
  const raw = lsGet(K_SESSION);
  if (!raw) return false;
  try {
    const s = JSON.parse(raw);
    if (!s.token || !s.user || !s.user.id) return false;
    S.session = { token: s.token };
    S.me = s.user;
    S.db = loadDb(s.user.id);
    touchAll();
    return true;
  } catch (e) { return false; }
}
export async function logout() {
  const s = S.session, uid = S.me && S.me.id;
  if (!s) return;
  if (S.db && S.db.ops.length) { try { await sync(); } catch (e) { /* hors ligne */ } }
  api({ a: 'logout', token: s.token }, 8000).catch(() => {});
  lsDel(K_SESSION); K_UNLOCK.forEach(lsDel);
  if (uid) lsDel(kDb(uid));
  S.session = null; S.me = null; S.db = null; S.mustChange = false; S.notice = ''; S.lostUid = null;
  touchAll();
  emit('session');
}
export function wipeLocal() {
  const uid = S.me && S.me.id;
  lsDel(K_SESSION); K_UNLOCK.forEach(lsDel);
  if (uid) lsDel(kDb(uid));
  S.session = null; S.me = null; S.db = null; S.mustChange = false;
  touchAll();
  emit('session');
}

/* ---------- Synchronisation ---------- */
let syncP = null, again = false;
export function sync(opts) {
  if (!S.session || !S.db) return Promise.resolve();
  if (syncP) { again = true; if (opts && opts.force) S.db.forceFull = true; return syncP; }
  syncP = doSync(opts || {}).finally(() => {
    syncP = null;
    if (again) { again = false; setTimeout(() => sync(), 60); }
  });
  return syncP;
}
async function doSync(opts) {
  S.syncing = true; emit('status');
  const IGNORABLE = /déjà envoyé|Un retour déjà/;
  try {
    for (let loop = 0; loop < 4; loop++) {
      const db = S.db; if (!db || !S.session) return;
      const full = !!(opts.force || db.forceFull || !db.since || Date.now() - db.lastFull > FULL_EVERY);
      opts = {};
      const sent = db.ops.slice(0, 100);
      sent.forEach(o => (o.sent = true));
      let res;
      try {
        res = await api({ a: 'sync', token: S.session.token, since: full ? 0 : Math.max(1, db.since - OVERLAP), ops: sent.map(o => ({ id: o.id, t: o.t, tbl: o.tbl, row: o.row })) });
      } catch (e) {
        sent.forEach(o => delete o.sent);
        throw e;
      }
      if (!S.db || S.db !== db) return; // déconnexion pendant l'appel
      if (!res.ok) {
        sent.forEach(o => delete o.sent);
        if (res.err === 'auth') { authLost(); return; }
        throw new ApiError(res.err || 'Erreur serveur.');
      }
      let failed = 0;
      const byId = {};
      (res.results || []).forEach(r => (byId[r.id] = r));
      const sentIds = new Set(sent.map(o => o.id));
      sent.forEach(o => {
        const r = byId[o.id];
        if (r && !r.ok) {
          failed++;
          if (!IGNORABLE.test(r.err || '')) emit('opError', r.err || 'Une modification a été refusée.');
        }
      });
      db.ops = db.ops.filter(o => !sentIds.has(o.id));
      // lignes serveur
      if (res.full) { TABLES.forEach(t => (db.rows[t] = {})); }
      Object.keys(res.rows || {}).forEach(t => {
        if (!db.rows[t]) return;
        res.rows[t].forEach(r => { if (r.del) delete db.rows[t][r.id]; else db.rows[t][r.id] = r; });
      });
      // les modifications encore en attente restent prioritaires sur ce que dit le serveur
      db.ops.forEach(o => {
        if (!db.rows[o.tbl]) return;
        if (o.t === 'put') db.rows[o.tbl][o.row.id] = Object.assign({}, db.rows[o.tbl][o.row.id] || {}, o.row);
        else delete db.rows[o.tbl][o.row.id];
      });
      const nRows = Object.keys(res.rows || {}).reduce((n, t) => n + res.rows[t].length, 0);
      const statsChanged = !!res.stats && JSON.stringify(res.stats) !== JSON.stringify(db.stats);
      const meChanged = !!res.user && JSON.stringify(res.user) !== JSON.stringify(S.me);
      const changed = nRows > 0 || statsChanged || meChanged || sent.length > 0 || !!res.full;
      db.since = res.now;
      if (res.full) db.lastFull = Date.now();
      if (res.stats) db.stats = res.stats;
      db.forceFull = failed > 0; // une opération refusée : on réaligne tout sur le serveur
      if (res.user) { S.me = res.user; saveSession(); }
      S.mustChange = !!res.mustChange;
      touchAll();
      persistSoon();
      S.lastSync = Date.now(); S.online = true; S.error = '';
      if (changed) emit('data');
      if (!db.ops.length && !db.forceFull) break;
    }
  } catch (e) {
    if (e instanceof NetError) { S.online = false; S.error = ''; }
    else S.error = e.message || 'Erreur de synchronisation.';
  } finally {
    S.syncing = false; emit('status');
  }
}
function onVisible() {
  if (S.session && Date.now() - S.lastSync > 30000) sync();
}
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    if (!S.session || (typeof document !== 'undefined' && document.visibilityState !== 'visible')) return;
    if (S.db && (S.db.ops.length || Date.now() - S.lastSync > 150000)) sync();
  }, 45000);
}

/* ---------- Actions d'administration ---------- */
export async function adminCall(req) {
  if (req.a === 'user.create' || req.a === 'user.resetpw') req = Object.assign({ appUrl: location.href.split('#')[0].split('?')[0] }, req); // pour l'e-mail d'identifiants
  const r = await callAuth(req);
  sync();
  return r;
}
export async function deleteMyAccount(password) {
  await callAuth({ a: 'account.delete', password });
  wipeLocal();
}

/* ---------- Utilisateurs ---------- */
export function users() { return all('users').filter(u => !u.del); }
export function userById(id) { return get('users', id); }
export function fullName(u) { return u ? ((u.prenom || '') + ' ' + (u.nom || '')).trim() || u.username || '—' : '—'; }
export function initials(u) { return u ? (((u.prenom || '').charAt(0) + (u.nom || '').charAt(0)).toUpperCase() || '?') : '?'; }
export function interns() { return users().filter(u => u.role === 'interne' && !u.anon && u.actif !== false && u.sem === cfg('semestreCourant')); }
export function seniors() { return users().filter(u => u.role === 'senior' && !u.anon && u.actif !== false); }
export function tutees(seniorId) { return interns().filter(u => u.tuteurId === seniorId); }
