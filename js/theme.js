// Thème clair / sombre / automatique (réglage propre à l'appareil)
import { lsGet, lsSet } from './store.js';

const K = 'cr:theme';
export function getTheme() { return lsGet(K) || 'auto'; }
export function setTheme(t) { lsSet(K, t); applyTheme(); }
export function applyTheme() {
  const t = getTheme();
  const root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', t);
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0B0F1A' : '#F5F6FA');
}
if (typeof matchMedia !== 'undefined') matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
