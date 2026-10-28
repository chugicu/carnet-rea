// Point d'entrée : coque de l'application, routage par rôle, synchronisation, hooks (badges, connexions)
import { h, clear, icon, dayKey } from './util.js';
import { S, subscribe, restoreSession, sync, cfg, pendingCount, curSem, isReadOnly, put, tutees, fullName, needsProfile } from './store.js';
import { fillAvatar } from './photo.js';
import { setRerender, currentPath, go, appName, appLogo, savePubFromConfig } from './nav.js';
import { applyTheme } from './theme.js';
import { toast, closeAllSheets } from './ui.js';
import { semesterProgress, newlyEarned } from './logic.js';
import { renderAuth, renderMustChange, renderProfileGate } from './views/auth.js';
import { gestesHome, gesteDetailView, historiqueView } from './views/gestes.js';
import { objectifsView, radarView } from './views/suivi.js';
import { badgesView, celebrateBadge } from './views/badges.js';
import { moiView } from './views/moi.js';
import { bilanView } from './views/bilan.js';
import { seniorPromoView, seniorInternView, tutoratView, equipePromoView, internesView } from './views/promo.js';
import { dossierView } from './views/dossier.js';
import { retoursView } from './views/retours.js';
import { adminHome, ADMIN_VIEWS } from './views/admin.js';
import { echoContenuView, echoModuleView, echoTabView } from './views/admin-echo-contenu.js';
import { renderLock, unlockOffer } from './views/echo-ui.js';
import { needsUnlock, unlockEnabled, touchUnlock } from './unlock.js';

const root = document.getElementById('app');

/* ---------- Routes par rôle ---------- */
const guardTutee = uid => S.me.role === 'equipe' || tutees(S.me.id).some(u => u.id === uid);
const ROUTES = {
  interne: [
    ['/gestes', () => gestesHome()], ['/gestes/all', () => historiqueView()], ['/gestes/:type', p => gesteDetailView(p.type)],
    ['/objectifs', () => objectifsView()], ['/radar', () => radarView()], ['/badges', () => badgesView()],
    ['/bilan', () => bilanView(S.me.id)], ['/moi', () => moiView()]
  ],
  senior: [
    ['/promo', () => seniorPromoView()], ['/promo/:uid', p => seniorInternView(p.uid)], ['/tutorat', () => tutoratView()],
    ['/dossier/:uid', p => dossierView(p.uid)], ['/bilan/:uid', p => (guardTutee(p.uid) ? bilanView(p.uid) : h('div', { class: 'empty' }, 'Accès non autorisé.'))], ['/moi', () => moiView()]
  ],
  equipe: [
    ['/promo', () => equipePromoView()], ['/internes', () => internesView()], ['/dossier/:uid', p => dossierView(p.uid)], ['/bilan/:uid', p => bilanView(p.uid)],
    ['/retours', () => retoursView()], ['/admin', () => adminHome()], ['/admin/echo-contenu', () => echoContenuView()], ['/admin/echo-contenu/:mod', p => echoModuleView(p.mod)], ['/admin/echo-contenu/:mod/:tab', p => echoTabView(p.mod, p.tab)], ['/admin/:section', p => (ADMIN_VIEWS[p.section] ? ADMIN_VIEWS[p.section]() : adminHome())], ['/moi', () => moiView()]
  ]
};
function tabsFor(role) {
  const m = cfg('modules');
  if (role === 'interne') return [m.gestes !== false && ['/gestes', 'Gestes'], m.objectifs !== false && ['/objectifs', 'Objectifs'], m.radar !== false && ['/radar', 'Radar'], m.badges !== false && ['/badges', 'Badges'], ['/moi', 'Moi']].filter(Boolean);
  if (role === 'senior') return [['/promo', 'Promo'], tutees(S.me.id).length && ['/tutorat', 'Tutorat'], ['/moi', 'Moi']].filter(Boolean);
  return [['/promo', 'Promo'], ['/internes', 'Internes'], (m.flash !== false || m.retours !== false) && ['/retours', 'Retours'], ['/admin', 'Admin'], ['/moi', 'Moi']].filter(Boolean);
}
function match(path) {
  const list = ROUTES[S.me.role] || [];
  for (const [pat, fn] of list) {
    const names = [];
    const re = new RegExp('^' + pat.replace(/:([a-z]+)/g, (_, n) => { names.push(n); return '([^/]+)'; }) + '$');
    const m = path.match(re);
    if (m) { const p = {}; names.forEach((n, i) => (p[n] = decodeURIComponent(m[i + 1]))); return { fn, p }; }
  }
  return null;
}
function activeTab(path, tabs) {
  const hit = tabs.filter(t => path === t[0] || path.startsWith(t[0] + '/')).sort((a, b) => b[0].length - a[0].length)[0];
  if (hit) return hit[0];
  if (path.startsWith('/bilan')) return S.me.role === 'interne' ? '/moi' : (S.me.role === 'equipe' ? '/internes' : '/tutorat');
  if (path.startsWith('/dossier')) return S.me.role === 'equipe' ? '/internes' : '/tutorat';
  return null;
}

/* ---------- Coque ---------- */
let lastPath = null;
function headerSub() {
  if (S.me.role === 'interne') {
    const sp = semesterProgress(S.me.sem);
    if (!sp) return '';
    return sp.before ? 'Stage à venir' : sp.after ? 'Stage terminé' : 'Semaine ' + sp.week + ' / ' + sp.total;
  }
  return cfg('app').service || '';
}
function buildShell() {
  const tabs = tabsFor(S.me.role);
  const path = currentPath();
  const cur = activeTab(path, tabs);
  const shell = h('div', { class: 'shell' },
    h('header', { class: 'top no-print' },
      h('div', { class: 'brand' }, h('img', { src: appLogo(), alt: '' }), h('div', null, h('div', { class: 't' }, appName()), h('div', { class: 's' }, headerSub()))),
      fillAvatar(h('a', { class: 'avatar', href: '#/moi', 'aria-label': 'Mon profil' }), S.me)),
    h('div', { class: 'sync no-print', id: 'sync', role: 'status' }),
    h('main', { class: 'view', id: 'view' }),
    h('nav', { class: 'tabbar no-print', 'aria-label': 'Navigation' }, h('div', { class: 'tabbar-in' }, tabs.map(([p, l]) => h('a', { class: 'tab', href: '#' + p, 'aria-current': cur === p ? 'page' : null }, l)))));
  return shell;
}
function updateChrome(tabs, path) {
  const inn = document.querySelector('.tabbar-in');
  if (inn) {
    const sig = tabs.map(t => t[0]).join('|');
    if (inn.dataset.tabs !== sig) { clear(inn); tabs.forEach(([p, l]) => inn.append(h('a', { class: 'tab', href: '#' + p }, l))); inn.dataset.tabs = sig; }
    const cur = activeTab(path, tabs);
    inn.querySelectorAll('.tab').forEach(a => { if (a.getAttribute('href') === '#' + cur) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  }
  const av = document.querySelector('.top .avatar');
  if (av) fillAvatar(av, S.me);
  const tb = document.querySelector('.brand');
  if (tb) { tb.querySelector('.t').textContent = appName(); tb.querySelector('.s').textContent = headerSub(); const img = tb.querySelector('img'); const src = appLogo(); if (img.getAttribute('src') !== src) img.setAttribute('src', src); }
}
function renderApp() {
  closeAllSheets();
  clear(root);
  document.title = appName();
  if (!S.session || !S.me) { renderAuth(root, 'login'); return; }
  if (needsUnlock(S.me.id)) { renderLock(root, renderApp); return; } // déverrouillage par le téléphone
  if (S.mustChange) { renderMustChange(root); return; }
  if (needsProfile()) { renderProfileGate(root); return; }
  root.append(buildShell());
  renderView(false);
  renderSync();
}
function renderView(keepScroll) {
  if (!S.session || !S.me || S.mustChange) return;
  if (document.getElementById('lock')) return; // écran de déverrouillage affiché
  if (needsProfile()) { if (!document.getElementById('gate')) renderApp(); return; } // écran « Complète ton profil » (aussi si l'équipe vide ces champs)
  let view = document.getElementById('view');
  if (!view) { renderApp(); return; }
  const tabs = tabsFor(S.me.role);
  let path = currentPath();
  let m = match(path);
  if (!m) { const first = tabs[0][0]; if (path !== first) { history.replaceState(null, '', '#' + first); } path = first; m = match(first); }
  const y = window.scrollY;
  const same = keepScroll && lastPath === path;
  lastPath = path;
  let node;
  try { node = m.fn(m.p); }
  catch (e) { console.error(e); node = h('div', { class: 'banner bad' }, icon('alert', 18), h('span', null, 'Une erreur est survenue sur cet écran. Recharge la page ; si le problème persiste, préviens l’équipe. (' + e.message + ')')); }
  updateChrome(tabs, path);
  view = document.getElementById('view');
  clear(view);
  view.append(node);
  const offer = path.indexOf('/bilan') === 0 ? null : unlockOffer();
  if (offer) view.prepend(offer);
  if (same) window.scrollTo(0, y); else window.scrollTo(0, 0);
}
setRerender(() => renderView(true));

/* ---------- Bandeau de synchronisation ---------- */
function renderSync() {
  const el = document.getElementById('sync');
  if (!el) return;
  clear(el);
  const n = pendingCount();
  let cls = '', txt = '', btn = null;
  if (!S.online) { cls = 'off'; txt = 'Hors ligne' + (n ? ' · ' + n + ' modification' + (n > 1 ? 's' : '') + ' à envoyer' : ' · tes données restent disponibles'); }
  else if (S.syncing) { cls = 'busy'; txt = 'Synchronisation…'; }
  else if (S.error) { cls = 'err'; txt = S.error; btn = ['Réessayer', () => sync({ force: true })]; }
  else if (n) { cls = 'busy'; txt = n + ' modification' + (n > 1 ? 's' : '') + ' à envoyer'; btn = ['Envoyer', () => sync()]; }
  else if (S.storageFull) { cls = 'err'; txt = 'Mémoire du téléphone pleine : certaines données ne sont pas conservées hors ligne.'; }
  el.className = 'sync no-print ' + cls;
  el.hidden = !txt;
  if (txt) { el.append(h('span', { class: 'dot' }), h('span', null, txt)); if (btn) el.append(h('button', { onclick: btn[1] }, btn[0])); }
}

/* ---------- Rendu différé (évite d'effacer un champ en cours de saisie) ---------- */
let raf = 0, pendingAfterBlur = false;
function typing() {
  const a = document.activeElement;
  return !!(a && a !== document.body && a.closest && a.closest('#view') && /^(INPUT|TEXTAREA)$/.test(a.tagName) && !/^(checkbox|radio|button|submit|file|color|range)$/.test(a.type || ''));
}
function scheduleView() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    if (typing()) { pendingAfterBlur = true; return; }
    renderView(true);
  });
}
document.addEventListener('focusout', () => { if (pendingAfterBlur) { pendingAfterBlur = false; setTimeout(scheduleView, 80); } });

/* ---------- Badges et connexions (internes) ---------- */
let hookTimer = 0;
function afterData() {
  clearTimeout(hookTimer);
  hookTimer = setTimeout(() => {
    if (!S.session || !S.me || S.me.role !== 'interne' || isReadOnly() || !S.db || !S.db.since || needsProfile()) return;
    const today = dayKey();
    const cid = S.me.id + '_' + today;
    if (!S.db.rows.connexions[cid]) put('connexions', { id: cid, uid: S.me.id, jour: today });
    if (cfg('modules').badges === false) return;
    const fresh = newlyEarned(S.me.id);
    if (fresh.length) {
      fresh.forEach(b => put('badges', { id: S.me.id + '_' + S.me.sem + '_' + b.id, uid: S.me.id, sem: S.me.sem, badge: b.id, ts: Date.now() }));
      celebrateBadge(fresh);
    }
  }, 3800); // laisse le temps d'annuler une saisie avant d'attribuer un badge (non révocable)
}

subscribe((kind, payload) => {
  if (kind === 'session') { renderApp(); return; }
  if (kind === 'status') { renderSync(); return; }
  if (kind === 'opError') { toast(payload, { err: true }); return; }
  if (kind === 'data') { renderSync(); savePubFromConfig(); scheduleView(); afterData(); }
});
/* ---------- Déverrouillage : l'échéance est repoussée tant que l'application est utilisée ---------- */
const keepUnlocked = () => { if (S.session && S.me && unlockEnabled(S.me.id) && !document.getElementById('lock')) touchUnlock(); };
document.addEventListener('visibilitychange', () => {
  if (!S.session || !S.me) return;
  if (document.visibilityState === 'hidden') keepUnlocked();
  else if (needsUnlock(S.me.id) && !document.getElementById('lock')) renderApp();
});
window.addEventListener('pagehide', keepUnlocked);
setInterval(() => { if (document.visibilityState === 'visible') keepUnlocked(); }, 60000);
window.addEventListener('hashchange', () => { if (S.session && S.me && !S.mustChange) renderView(false); });

/* ---------- Démarrage ---------- */
applyTheme();
restoreSession();
renderApp();
if (S.session) { sync(); afterData(); }

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (had) toast('Nouvelle version disponible.', { ms: 12000, action: { label: 'Recharger', fn: () => location.reload() } });
  });
}
