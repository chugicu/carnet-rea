// Règles métier : gestes, autonomie, badges, séries, radar, semaines
import { all, cfg, get, curSem, semInfo, PREMIERS, PREM_MODS, PREM_RES } from './store.js';
import { addDays, dayKey, parseDay, isoWeekKey, weekKeyToMonday, fmtDate } from './util.js';

export const ENTRETIENS = [
  { id: 'debut', nom: 'Début de stage', court: 'Début' },
  { id: 'mi', nom: 'Mi-stage', court: 'Mi-stage' },
  { id: 'fin', nom: 'Fin de stage', court: 'Fin' }
];
export const STATUTS = [
  { id: 'afaire', nom: 'À faire' },
  { id: 'encours', nom: 'En cours' },
  { id: 'acquis', nom: 'Acquis' }
];
export const statutNom = id => (STATUTS.find(s => s.id === id) || STATUTS[0]).nom;

/* ---------- Gestes ---------- */
export function gesteDefs(withInactive) {
  // les familles « Premiers KTC / KTA » (parcours débutant) n'apparaissent pas dans les listes ordinaires : voir tileDefs()
  return (cfg('gestes') || []).filter(g => !g.premierDe && (withInactive || g.actif !== false));
}
/** Définition d'un geste ; avec « uid », telle que la voit cet utilisateur (profil DJ : noms, seuils, sites et modalités réglés par l'équipe) */
export function gesteDef(id, uid) {
  const d = (cfg('gestes') || []).find(g => g.id === id) || null;
  return d && uid ? defFor(d, uid) : d;
}
export function profilDJ() {
  return Object.assign({ actif: true, masques: [], noms: {}, seuils: {}, listes: {} }, cfg('profilDJ') || {});
}
export function isDJ(uid) { const u = get('users', uid); return !!u && u.role === 'interne' && u.profil === 'dj' && profilDJ().actif !== false; }
/** Même règle que le serveur (applyProfil) */
export function defFor(d, uid) {
  if (!d || d.premierDe || !isDJ(uid)) return d;
  const p = profilDJ(), l = p.listes[d.id] || {}, o = Object.assign({}, d);
  if (p.noms[d.id]) o.nom = p.noms[d.id];
  if (l.sites && l.sites.length && d.sites && d.sites.length) o.sites = l.sites;
  if (l.modalites && l.modalites.length && d.modalites && d.modalites.length) o.modalites = l.modalites;
  if (d.autonomie) {
    const a = Object.assign({}, d.autonomie);
    if (p.seuils[d.id]) a.seuil = p.seuils[d.id];
    a.compte = a.compte.filter(m => (o.modalites || []).indexOf(m) >= 0);
    o.autonomie = a;
  }
  return o;
}
export function gesteColor(id) { const g = gesteDef(id); return g ? g.couleur : '#9AA4B8'; }
export function gesteName(g) {
  const d = gesteDef(g.type);
  const base = d ? d.nom : g.type;
  return d && d.libre && g.nom ? base + ' · ' + g.nom : base;
}
export function gesteDetail(g) {
  return [g.site, g.modalite, g.resultat].filter(Boolean).join(' · ');
}
export function gestesOf(uid, sem) {
  sem = sem || semFor(uid);
  return all('gestes').filter(g => g.uid === uid && g.sem === sem).sort((a, b) => b.ts - a.ts);
}
export function semFor(uid) {
  const u = get('users', uid);
  return u && u.sem ? u.sem : curSem();
}
export function countsByType(gestes) {
  const m = {};
  gestes.forEach(g => (m[g.type] = (m[g.type] || 0) + 1));
  return m;
}
/* ---------- Parcours « Premiers KT » ---------- */
export { PREMIERS };
export function parcoursCfg() {
  const c = Object.assign({ actif: true, seuilAvant: 5, quatreMains: 2, supervises: 3, comptes: 5 }, cfg('parcours') || {});
  return c;
}
/** Nombre de KTC (base « ktc ») ou de KTA déclaré avant le stage ; null si non renseigné */
export function ktAvant(u, base) {
  const v = u && u[base === 'ktc' ? 'ktcAvant' : 'ktaAvant'];
  return v === null || v === undefined || v === '' ? null : Number(v);
}
/** État du parcours débutant d'un interne pour « ktc » ou « kta » (même règle que le serveur) */
export function premiersState(uid, base, exceptId) {
  const pc = parcoursCfg();
  const u = get('users', uid);
  const sem = semFor(uid);
  const rows = all('gestes').filter(g => g.uid === uid && g.sem === sem && g.type === PREMIERS[base] && g.id !== exceptId);
  const ok = rows.filter(g => g.resultat === PREM_RES[0]);
  const q = ok.filter(g => g.modalite === PREM_MODS[0]).length;
  const s = ok.filter(g => g.modalite === PREM_MODS[1]).length;
  const declared = ktAvant(u, base);
  const eligible = !!u && u.role === 'interne' && pc.actif !== false && declared !== null && declared <= pc.seuilAvant;
  const graduated = s >= pc.supervises;
  return { pc, q, s, entries: rows.length, ok: Math.min(ok.length, pc.comptes), eligible, graduated, active: eligible && !graduated, done: eligible && graduated };
}
/** Tuiles proposées à un interne : « Premiers KTC / KTA » à la place de KTC / KTA tant que son parcours débutant est en cours */
export function tileDefs(uid) {
  const out = [];
  const dj = isDJ(uid), masques = dj ? profilDJ().masques : [];
  gesteDefs().forEach(d => {
    if (masques.indexOf(d.id) >= 0) return;
    if (PREMIERS[d.id] && premiersState(uid, d.id).active) { const p = gesteDef(PREMIERS[d.id]); out.push(p || d); } else out.push(defFor(d, uid));
  });
  return out;
}
/** Gestes « comptables » d'un interne : les premiers KT réussis du parcours débutant (au plus « comptes ») s'ajoutent à KTC / KTA */
export function effGestes(gestes) {
  const pc = parcoursCfg();
  const rest = [], by = {};
  gestes.forEach(g => {
    const base = Object.keys(PREMIERS).find(b => PREMIERS[b] === g.type);
    if (base) { if (g.resultat === PREM_RES[0]) (by[base] = by[base] || []).push(g); } else rest.push(g);
  });
  Object.keys(by).forEach(b => by[b].sort((x, y) => x.ts - y.ts).slice(0, pc.comptes).forEach(g => rest.push(Object.assign({}, g, { type: b }))));
  return rest.sort((x, y) => y.ts - x.ts);
}
export function autonomie(def, gestes) {
  const a = def && def.autonomie;
  if (!a) return null;
  const n = gestes.filter(g => g.type === def.id && a.compte.indexOf(g.modalite) >= 0).length;
  return { seuil: a.seuil, n, unlocked: n >= a.seuil, reste: Math.max(0, a.seuil - n), bloque: a.bloque, compte: a.compte };
}
export function iotStats(gestes, def) {
  const res = (def && def.resultats) || [];
  const okLabel = res[0], koLabel = res[1];
  const list = gestes.filter(g => g.type === (def ? def.id : 'iot'));
  const ok = list.filter(g => g.resultat === okLabel).length;
  const ko = list.filter(g => g.resultat === koLabel).length;
  return { ok, ko, total: list.length, rate: ok + ko ? Math.round((ok * 100) / (ok + ko)) : null };
}
export function breakdown(def, gestes) {
  // répartition par site / modalité / résultat pour un geste
  const list = gestes.filter(g => g.type === def.id);
  const out = [];
  ['sites', 'modalites', 'resultats'].forEach(k => {
    const field = k === 'sites' ? 'site' : k === 'modalites' ? 'modalite' : 'resultat';
    if (def[k] && def[k].length) out.push({ titre: k === 'sites' ? 'Sites' : k === 'modalites' ? 'Modalités' : 'Résultats', items: def[k].map(v => ({ label: v, n: list.filter(g => g[field] === v).length })) });
  });
  return out;
}

/* ---------- Jours fériés / jours ouvrés ---------- */
const hcache = {};
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, mo - 1, da, 12);
}
function holidaysOf(y) {
  if (hcache[y]) return hcache[y];
  const set = new Set();
  const add = (m, d) => set.add(dayKey(new Date(y, m - 1, d, 12)));
  [[1, 1], [5, 1], [5, 8], [7, 14], [8, 15], [11, 1], [11, 11], [12, 25], [5, 27], [7, 21]].forEach(x => add(x[0], x[1]));
  const e = easter(y);
  [-2, 1, 39, 50].forEach(n => set.add(dayKey(addDays(e, n))));
  return (hcache[y] = set);
}
export function isBusinessDay(key) {
  const d = parseDay(key);
  const w = d.getDay();
  if (w === 0 || w === 6) return false;
  if (holidaysOf(d.getFullYear()).has(key)) return false;
  return (cfg('feries') || []).indexOf(key) < 0;
}
function nextBusinessDay(key) {
  let d = addDays(parseDay(key), 1);
  for (let i = 0; i < 14; i++) { const k = dayKey(d); if (isBusinessDay(k)) return k; d = addDays(d, 1); }
  return dayKey(d);
}
export function loginStreak(days) {
  const biz = Array.from(new Set(days.filter(isBusinessDay))).sort();
  let best = 0, run = 0, prev = null;
  biz.forEach(k => {
    run = prev && nextBusinessDay(prev) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  });
  return best;
}
export function meteoStreak(weeks) {
  const ws = Array.from(new Set(weeks)).sort();
  let best = 0, run = 0, prev = null;
  ws.forEach(w => {
    run = prev && dayKey(addDays(weekKeyToMonday(prev), 7)) === dayKey(weekKeyToMonday(w)) ? run + 1 : 1;
    best = Math.max(best, run);
    prev = w;
  });
  return best;
}

/* ---------- Données d'un interne ---------- */
export function objectifsOf(uid, sem) {
  sem = sem || semFor(uid);
  return all('objectifs').filter(o => o.uid === uid && o.sem === sem).sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || String(a.id).localeCompare(b.id));
}
export function entretienId(uid, sem, type) { return uid + '_' + sem + '_' + type; }
export function entretienOf(uid, type, sem) {
  sem = sem || semFor(uid);
  return get('entretiens', entretienId(uid, sem, type));
}
export function meteoOf(uid, sem) {
  sem = sem || semFor(uid);
  return all('meteo').filter(m => m.uid === uid && m.sem === sem).sort((a, b) => b.ts - a.ts);
}
export function meteoDef(id) { return ((cfg('meteo') || {}).niveaux || []).find(n => n.id === id) || null; }
export function weeklyMeteo(uid, week, sem) {
  return meteoOf(uid, sem).find(m => !m.extra && m.semaine === week) || null;
}
export function flashOf(uid) { return all('flash').filter(f => f.uid === uid && f.sem === semFor(uid)).sort((a, b) => b.ts - a.ts); }
export function retoursOf(uid) { return all('retours').filter(f => f.uid === uid && f.sem === semFor(uid)).sort((a, b) => b.ts - a.ts); }
export function badgesOf(uid, sem) {
  sem = sem || semFor(uid);
  return all('badges').filter(b => b.uid === uid && b.sem === sem);
}
export function connexionsOf(uid) { return all('connexions').filter(c => c.uid === uid).map(c => c.jour); }

/* ---------- Radar ---------- */
export function radarCfg() { return cfg('radar'); }
export function letterValue(letter) {
  const e = radarCfg().echelle;
  const i = e.findIndex(x => x.l === letter);
  return i < 0 ? 0 : (e.length - i) / e.length;
}
export function radarComplete(obj) {
  if (!obj) return false;
  return radarCfg().axes.every(a => !!obj[a.id]);
}
export function lastEntretienWith(uid, field) {
  for (let i = ENTRETIENS.length - 1; i >= 0; i--) {
    const e = entretienOf(uid, ENTRETIENS[i].id);
    if (e && e[field] && Object.keys(e[field]).length) return e;
  }
  return null;
}

/* ---------- Badges ---------- */
export function badgeData(uid) {
  return {
    gestes: effGestes(gestesOf(uid)),
    objectifs: objectifsOf(uid),
    entretiens: ENTRETIENS.map(t => entretienOf(uid, t.id)).filter(Boolean),
    meteo: meteoOf(uid),
    connexions: connexionsOf(uid)
  };
}
export function ruleProgress(r, c) {
  const G = c.gestes;
  const norm = (v, max) => ({ v: Math.min(v, max), max, done: v >= max });
  switch (r && r.type) {
    case 'count': {
      const n = G.filter(g => g.type === r.geste && (!r.resultat || g.resultat === r.resultat) && (!r.modalites || r.modalites.indexOf(g.modalite) >= 0)).length;
      return norm(n, r.min || 1);
    }
    case 'sites': {
      const n = new Set(G.filter(g => g.type === r.geste && g.site).map(g => g.site)).size;
      return norm(n, r.min || 1);
    }
    case 'sites_all': {
      const have = new Set(G.filter(g => g.type === r.geste && g.site).map(g => g.site));
      return norm((r.sites || []).filter(s => have.has(s)).length, (r.sites || []).length || 1);
    }
    case 'types': {
      const need = gesteDefs().filter(d => (r.exclure || []).indexOf(d.id) < 0);
      const have = new Set(G.map(g => g.type));
      return norm(need.filter(d => have.has(d.id)).length, need.length || 1);
    }
    case 'total': return norm(G.length, r.min || 1);
    case 'login_streak': return norm(loginStreak(c.connexions), r.min || 1);
    case 'meteo_streak': return norm(meteoStreak(c.meteo.filter(m => !m.extra).map(m => m.semaine)), r.min || 1);
    case 'autoeval': return norm(c.entretiens.some(e => radarComplete(e.auto)) ? 1 : 0, 1);
    case 'entretien': return norm(c.entretiens.some(e => e.type === r.entretien && e.fait) ? 1 : 0, 1);
    case 'objectifs_acquis': {
      const t = c.objectifs.length, a = c.objectifs.filter(o => o.statut === 'acquis').length;
      return { v: a, max: Math.max(t, 1), done: t > 0 && a === t };
    }
  }
  return { v: 0, max: 1, done: false };
}
export function badgeStatus(uid) {
  const c = badgeData(uid);
  const got = new Map(badgesOf(uid).map(b => [b.badge, b]));
  return (cfg('badges') || []).filter(b => b.actif !== false).map(b => {
    const p = ruleProgress(b.regle, c);
    return Object.assign({ def: b, row: got.get(b.id) || null, earned: p.done || got.has(b.id) }, { prog: p });
  });
}
export function newlyEarned(uid) {
  // badges dont la règle est remplie mais pas encore enregistrés
  const c = badgeData(uid);
  const got = new Set(badgesOf(uid).map(b => b.badge));
  return (cfg('badges') || []).filter(b => b.actif !== false && !got.has(b.id) && ruleProgress(b.regle, c).done);
}

/* ---------- Semaines du stage ---------- */
export function semesterProgress(sem) {
  const s = semInfo(sem || curSem());
  if (!s) return null;
  const d0 = parseDay(s.debut), d1 = parseDay(s.fin), now = new Date();
  const total = Math.max(1, Math.ceil((d1 - d0) / (7 * 864e5)));
  const w = Math.floor((now - d0) / (7 * 864e5)) + 1;
  return { s, total, week: Math.max(0, Math.min(total, w)), before: now < d0, after: now > d1 };
}
export function weekLabel(weekKey) {
  const mon = weekKeyToMonday(weekKey);
  const sun = addDays(mon, 6);
  return 'Sem. ' + weekKey.split('-W')[1].replace(/^0/, '') + ' · ' + fmtDate(mon) + ' – ' + fmtDate(sun);
}
export function currentWeek() { return isoWeekKey(new Date()); }
export function semesterWeeks(sem) {
  const s = semInfo(sem || curSem());
  if (!s) return [];
  const out = [];
  let d = parseDay(s.debut);
  const end = parseDay(s.fin);
  while (d <= end) { const k = isoWeekKey(d); if (out[out.length - 1] !== k) out.push(k); d = addDays(d, 7); }
  const last = isoWeekKey(end);
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}
