// Écrans liés à EchoLearn et au déverrouillage par le téléphone
import { h, icon, clear } from '../util.js';
import { S, logout } from '../store.js';
import { appName, appLogo, rerender } from '../nav.js';
import { toast } from '../ui.js';
import { echoUrl, echoSummary } from '../echo.js';
import { unlockSupported, platformAvailable, unlockEnabled, enableUnlock, disableUnlock, verifyUnlock, offerWanted, markOffered } from '../unlock.js';

/* ---------- Tuile EchoLearn ---------- */
export function echoCard() {
  const url = echoUrl();
  if (!url || !S.me) return null;
  let sub = 'Suivi de l’apprentissage en échographie';
  if (S.me.role === 'interne') {
    const s = echoSummary(S.me.id, S.me.sem);
    if (s.any) sub = s.acq + '/' + s.total + ' items acquis · ' + s.exams + ' examen' + (s.exams > 1 ? 's' : '');
  }
  return h('div', { class: 'card list echo-card', style: { padding: '2px 14px' } },
    h('a', { class: 'item', href: url, style: { textDecoration: 'none', color: 'inherit' } }, icon('activity', 22), h('span', { class: 'tx' }, h('b', null, 'EchoLearn'), h('span', null, sub)), icon('chevron-right', 16)));
}

/* ---------- Déverrouillage par le téléphone ---------- */
let platOk = null;
platformAvailable().then(v => { platOk = v; });

export function renderLock(root, onDone) {
  clear(root);
  const me = S.me;
  const err = h('div', { class: 'err', role: 'alert', hidden: true });
  const btn = h('button', { class: 'btn primary block', type: 'button', id: 'unlock-btn' }, icon('lock', 18), 'Déverrouiller');
  let busy = false;
  async function attempt(manual) {
    if (busy) return;
    busy = true; err.hidden = true; btn.disabled = true;
    const ok = await verifyUnlock(me.id);
    busy = false; btn.disabled = false;
    if (ok) { onDone(); return; }
    if (manual) { err.textContent = 'Déverrouillage impossible. Réessaie, ou reconnecte-toi avec ton mot de passe.'; err.hidden = false; }
  }
  btn.addEventListener('click', () => attempt(true));
  root.append(h('div', { class: 'auth', id: 'lock' }, h('div', { class: 'auth-box' },
    h('div', { class: 'auth-logo' }, h('img', { src: appLogo(), alt: '' }), h('div', { class: 't' }, appName())),
    h('div', { class: 'grad-line' }),
    h('h1', { class: 'h3' }, 'Bonjour ' + (me.prenom || '')),
    h('p', { class: 'soft small' }, 'Confirme que c’est bien toi avec Face ID, ton empreinte ou le code du téléphone.'),
    err, btn,
    h('button', { class: 'linkbtn', type: 'button', onclick: () => logout() }, 'Se connecter avec un autre compte'))));
  setTimeout(() => attempt(false), 250); // tentative silencieuse (certains navigateurs exigent un appui : le bouton prend alors le relais)
}

async function activate() {
  try { await enableUnlock(S.me, appName()); toast('Déverrouillage par le téléphone activé.'); return true; }
  catch (e) { toast('Activation impossible sur cet appareil.', { err: true }); return false; }
}
/** Bandeau proposé une seule fois après la connexion */
export function unlockOffer() {
  if (!S.me || platOk !== true || !unlockSupported() || !offerWanted(S.me.id)) return null;
  const box = h('div', { class: 'banner info', id: 'unlock-offer' }, icon('lock', 18),
    h('span', { style: { flex: 1 } }, 'Protège tes données : active le déverrouillage par Face ID, empreinte ou code du téléphone.'),
    h('button', { class: 'btn sm primary', type: 'button', onclick: async () => { markOffered(S.me.id); if (await activate()) rerender(); else box.remove(); } }, 'Activer'),
    h('button', { class: 'btn sm ghost', type: 'button', onclick: () => { markOffered(S.me.id); box.remove(); } }, 'Plus tard'));
  return box;
}
/** Réglage dans « Moi » */
export function toggleUnlock() {
  if (unlockEnabled(S.me.id)) { disableUnlock(); toast('Déverrouillage par le téléphone désactivé.'); rerender(); return; }
  activate().then(ok => { if (ok) rerender(); });
}
export function unlockAvailable() { return unlockSupported() && platOk !== false; }
