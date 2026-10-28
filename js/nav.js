// Navigation minimale par hash + infos publiques mises en cache pour l'écran de connexion
import { api, lsGet, lsSet, cfg, S } from './store.js';
import { DEFAULTS } from './defaults.js';

let rr = () => {};
export function setRerender(f) { rr = f; }
export function rerender() { rr(); }
export function go(path) {
  const h = '#' + path;
  if (location.hash === h) rerender(); else location.hash = h;
}
export function currentPath() { return (location.hash || '').replace(/^#/, '') || '/'; }

/* ---------- Infos publiques (nom de l'app, spécialités…) ---------- */
const K_PUB = 'cr:pub';
export function pubInfo() {
  let p = null;
  try { p = JSON.parse(lsGet(K_PUB) || 'null'); } catch (e) { p = null; }
  p = p || {};
  return {
    app: Object.assign({}, DEFAULTS.app, p.app || {}),
    specialites: p.specialites || DEFAULTS.specialites,
    rgpd: p.rgpd || DEFAULTS.textes.rgpd,
    inscription: p.inscription !== false,
    mdpMin: p.mdpMin || 8
  };
}
export async function refreshPub() {
  try {
    const r = await api({ a: 'pub' }, 12000);
    if (r && r.ok) { delete r.ok; lsSet(K_PUB, JSON.stringify(r)); return true; }
  } catch (e) { /* hors ligne : on garde le cache */ }
  return false;
}
export function savePubFromConfig() {
  if (!S.me) return;
  const cur = pubInfo();
  const next = { app: cfg('app'), specialites: cfg('specialites'), rgpd: (cfg('textes') || {}).rgpd, inscription: (cfg('securite') || {}).inscriptionOuverte !== false, mdpMin: (cfg('securite') || {}).mdpMin || 8 };
  if (JSON.stringify(cur.app) !== JSON.stringify(next.app) || JSON.stringify(cur.specialites) !== JSON.stringify(next.specialites)) lsSet(K_PUB, JSON.stringify(next));
}
export function appName() { return (S.me ? cfg('app') : pubInfo().app).nom || 'Carnet Réa'; }
export function appLogo() { const l = (S.me ? cfg('app') : pubInfo().app).logo; return l || 'assets/logo-mark.png'; }
