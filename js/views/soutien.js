// Ressources de soutien : écran bienveillant après une météo d'alerte, et réglages (équipe)
import { h, icon, clear, clone } from '../util.js';
import { cfg, saveCfg } from '../store.js';
import { openSheet, toast, field, textInput, textArea, checkbox } from '../ui.js';
import { adminShell } from './admin-ui.js';

export function soutienCfg() { return cfg('soutien') || {}; }
export function soutienOn() { const s = soutienCfg(); return s.actif !== false && Array.isArray(s.ressources) && s.ressources.length > 0; }
const okMail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const okUrl = v => /^https:\/\/[A-Za-z0-9._~\-\/]{4,200}$/.test(v);

function resourceCard(r) {
  const lines = [];
  if (r.detail) lines.push(h('div', { class: 'small soft' }, r.detail));
  if (r.tel) lines.push(h('div', { class: 'small' }, icon('smartphone', 14), ' Tél. ', h('b', { class: 'mono' }, r.tel)));
  if (r.email) lines.push(h('div', { class: 'small' }, icon('mail', 14), ' ', h('a', { href: 'mailto:' + r.email }, r.email)));
  if (r.url) lines.push(h('div', null, h('a', { class: 'btn sm', href: r.url, target: '_blank', rel: 'noopener noreferrer' }, r.urlLabel || 'Ouvrir le lien')));
  return h('div', { class: 'card col', style: { gap: '6px' } }, h('b', null, r.nom), ...lines);
}

/** Écran de soutien. `conf` permet de prévisualiser des réglages non enregistrés. */
export function openSoutien(conf) {
  const s = conf || soutienCfg();
  document.querySelectorAll('.toast').forEach(t => t.remove()); // les confirmations ne doivent pas recouvrir l'écran
  const body = h('div', { class: 'col', style: { gap: '12px' } },
    h('div', { class: 'row', style: { gap: '10px', alignItems: 'flex-start' } }, h('span', { style: { color: 'var(--accent, #d4476b)', flex: 'none' } }, icon('heart', 22)), h('p', { class: 'soft' }, s.intro || '')),
    ...(s.ressources || []).map(resourceCard),
    s.outro ? h('p', { class: 'small muted' }, s.outro) : null);
  return openSheet({ title: s.titre || 'Tu n’es pas seul(e)', body, actions: [{ label: 'Merci, je ferme', kind: 'primary' }] });
}

/** Appelé juste après l'enregistrement d'une météo : ouvre l'écran de soutien si le niveau choisi est un niveau d'alerte */
export function soutienIfAlert(def) {
  if (def && def.alerte && soutienOn()) setTimeout(() => openSoutien(), 250);
}

/* ---------- Réglages (Admin → Ressources de soutien) ---------- */
export function soutienAdmin() {
  const s = clone(soutienCfg());
  const actif = checkbox('Afficher cet écran après une météo d’alerte (et le lien dans « Moi »)', s.actif !== false);
  const titre = textInput({ value: s.titre || '', max: 80 });
  const intro = textArea({ value: s.intro || '', rows: 4, max: 600 });
  const outro = textArea({ value: s.outro || '', rows: 2, max: 300 });
  const list = (s.ressources || []).map(r => Object.assign({ nom: '', detail: '', tel: '', email: '', url: '', urlLabel: '' }, r));
  const box = h('div', { class: 'col' });
  const read = () => ({ actif: actif.input.checked, titre: titre.value.trim(), intro: intro.value.trim(), outro: outro.value.trim(), ressources: list.map(r => ({ nom: r.nom.trim(), detail: r.detail.trim(), tel: r.tel.trim(), email: r.email.trim(), url: r.url.trim(), urlLabel: r.urlLabel.trim() })).filter(r => r.nom) });
  const draw = () => {
    clear(box);
    list.forEach((r, i) => {
      const bind = (el, k) => { el.addEventListener('input', () => (r[k] = el.value)); return el; };
      box.append(h('div', { class: 'card col gap-s' },
        field('Nom', bind(textInput({ value: r.nom, max: 80, placeholder: 'Ex. : Psychologues du travail' }), 'nom')),
        field('Précisions', bind(textInput({ value: r.detail, max: 200, placeholder: 'Ex. : Mme X et Mme Y, par mail ou par téléphone' }), 'detail')),
        h('div', { class: 'row' }, h('div', { class: 'grow' }, field('Téléphone ou poste', bind(textInput({ value: r.tel, max: 40, placeholder: 'Ex. : 1612 / 1613' }), 'tel'))), h('div', { class: 'grow' }, field('E-mail', bind(textInput({ type: 'email', value: r.email, max: 120, autocapitalize: 'none' }), 'email')))),
        h('div', { class: 'row' }, h('div', { class: 'grow' }, field('Lien (https://…)', bind(textInput({ value: r.url, max: 200, autocapitalize: 'none', placeholder: 'https://' }), 'url'))), h('div', { class: 'grow' }, field('Texte du bouton', bind(textInput({ value: r.urlLabel, max: 60, placeholder: 'Ouvrir le lien' }), 'urlLabel')))),
        h('div', { class: 'row' },
          h('button', { class: 'btn sm ghost', disabled: i === 0, 'aria-label': 'Monter', onclick: () => { list.splice(i - 1, 0, list.splice(i, 1)[0]); draw(); } }, icon('up', 14)),
          h('button', { class: 'btn sm ghost', disabled: i === list.length - 1, 'aria-label': 'Descendre', onclick: () => { list.splice(i + 1, 0, list.splice(i, 1)[0]); draw(); } }, icon('down', 14)),
          h('span', { class: 'grow' }),
          h('button', { class: 'btn sm danger', onclick: () => { list.splice(i, 1); draw(); } }, icon('trash', 14), 'Retirer'))));
    });
    if (list.length < 12) box.append(h('button', { class: 'btn ghost', onclick: () => { list.push({ nom: '', detail: '', tel: '', email: '', url: '', urlLabel: '' }); draw(); } }, icon('plus', 16), 'Ajouter une ressource'));
  };
  draw();
  return adminShell('Ressources de soutien',
    h('p', { class: 'small muted' }, 'Quand un interne choisit un niveau de météo marqué « alerte » (Admin → Météo), cet écran s’ouvre pour lui. Il reste consultable dans « Moi ». Le texte et les coordonnées sont à toi.'),
    h('div', { class: 'card col' }, actif, field('Titre', titre), field('Message d’accueil', intro, 'Ton bienveillant, à la deuxième personne.')),
    sectionTitle('Personnes et services'), box,
    h('div', { class: 'card col' }, field('Mot de fin', outro)),
    h('div', { class: 'row' },
      h('button', { class: 'btn grow', onclick: () => openSoutien(Object.assign(read(), { actif: true })) }, icon('eye', 16), 'Aperçu'),
      h('button', { class: 'btn primary grow', onclick: () => {
        const c = read();
        const bad = c.ressources.find(r => (r.email && !okMail(r.email)) || (r.url && !okUrl(r.url)));
        if (bad) { toast('« ' + bad.nom + ' » : e-mail ou lien invalide (le lien doit commencer par https://).', { err: true }); return; }
        saveCfg('soutien', c); toast('Enregistré.');
      } }, 'Enregistrer')));
}
function sectionTitle(t) { return h('div', { class: 'h2', style: { marginTop: '4px' } }, t); }
