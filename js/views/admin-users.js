// Administration : comptes (création, rôles, tuteurs, réinitialisation, suppression)
import { h, icon, clear, download, toCSV } from '../util.js';
import { ktAvant } from '../logic.js';
import { S, cfg, users, fullName, seniors, userById, saveUser, adminCall, profileComplete } from '../store.js';
import { avatar, photoField, savePhoto } from '../photo.js';
import { openSheet, toast, field, textInput, selectInput, checkbox, textArea, segmented, confirmSheet, empty, closeAllSheets } from '../ui.js';
import { adminShell } from './admin-ui.js';
import { roleLabel } from './moi.js';
import { norm } from './promo.js';
import { etabServiceField } from './etab-service.js';
import { echoCfg, etabServiceOn } from '../echo.js';

const ROLES = [{ v: 'interne', label: 'Interne' }, { v: 'senior', label: 'Senior' }, { v: 'equipe', label: 'Équipe péda.' }];

function copyText(t) { try { navigator.clipboard.writeText(t); toast('Copié.'); } catch (e) { toast('Copie impossible.', { err: true }); } }

function showCredentials(results, title = 'Identifiants créés') {
  const okRows = results.filter(r => r.ok);
  const body = h('div', { class: 'col' },
    h('div', { class: 'banner' }, icon('alert', 18), h('span', null, 'Les mots de passe provisoires ne seront plus affichés. Note-les ou télécharge le fichier maintenant. Chacun devra en choisir un nouveau à sa première connexion.')),
    h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'Nom'), h('th', null, 'Identifiant'), h('th', null, 'Mot de passe'), h('th', null, 'E-mail'))),
      h('tbody', null, results.map(r => r.ok
        ? h('tr', null, h('td', null, r.prenom + ' ' + r.nom), h('td', { class: 'mono' }, r.username), h('td', { class: 'mono' }, r.tmp), h('td', null, r.sent ? 'envoyé' : (r.email ? 'non envoyé' : '—')))
        : h('tr', null, h('td', null, (r.prenom || '') + ' ' + (r.nom || '')), h('td', { colspan: 3, class: 'err', style: { whiteSpace: 'normal' } }, r.err)))))));
  openSheet({
    title, body,
    actions: okRows.length ? [
      { label: 'Copier', kind: 'ghost', close: false, onClick: () => { copyText(okRows.map(r => r.prenom + ' ' + r.nom + ' : ' + r.username + ' / ' + r.tmp).join('\n')); return false; } },
      { label: 'Télécharger (CSV)', kind: 'primary', close: false, onClick: () => { download('comptes-crees.csv', toCSV([['Prénom', 'Nom', 'Identifiant', 'Mot de passe provisoire', 'E-mail']].concat(okRows.map(r => [r.prenom, r.nom, r.username, r.tmp, r.email])))); return false; } }
    ] : []
  });
}

function parseLines(txt) {
  const out = [];
  txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(line => {
    const m = line.match(/[^\s;,\t]+@[^\s;,\t]+\.[^\s;,\t]+/);
    const email = m ? m[0] : '';
    let rest = email ? line.replace(email, ' ') : line;
    let parts = rest.split(/[;\t,]/).map(s => s.trim()).filter(Boolean);
    let prenom, nom;
    if (parts.length >= 2) { prenom = parts[0]; nom = parts.slice(1).join(' '); }
    else { const w = (parts[0] || '').split(/\s+/); prenom = w[0]; nom = w.slice(1).join(' '); }
    if (prenom && nom) out.push({ prenom, nom, email });
  });
  return out;
}

function openCreate() {
  const role = selectInput(ROLES.map(r => ({ v: r.v, label: r.label })), 'interne');
  const mode = segmented([{ v: 'one', label: 'Un compte' }, { v: 'many', label: 'Une liste' }], 'one', () => draw());
  const prenom = textInput({ max: 60 }), nom = textInput({ max: 60 }), email = textInput({ type: 'email', autocapitalize: 'none' });
  const list = textArea({ rows: 8, placeholder: 'Une personne par ligne :\nMarie Dupont; marie.dupont@exemple.fr\nJean Martin; jean.martin@exemple.fr' });
  const send = checkbox('Envoyer les identifiants par e-mail (quota Gmail : environ 100 e-mails par jour)', true);
  const form = h('div', { class: 'col' });
  const draw = () => {
    clear(form);
    if (mode.value === 'one') form.append(h('div', { class: 'row' }, h('div', { class: 'grow' }, field('Prénom', prenom)), h('div', { class: 'grow' }, field('Nom', nom))), field('E-mail', email));
    else form.append(field('Liste (prénom nom ; e-mail)', list, 'Séparateurs acceptés : point-virgule, virgule, tabulation. Colle directement depuis un tableur. 60 comptes maximum à la fois.'));
  };
  draw();
  openSheet({
    title: 'Créer des comptes',
    body: h('div', { class: 'col gap-l' }, field('Rôle', role), mode, form, send),
    actions: [{ label: 'Créer', kind: 'primary', onClick: async () => {
      let req;
      if (mode.value === 'one') {
        if (!prenom.value.trim() || !nom.value.trim()) { toast('Prénom et nom obligatoires.', { err: true }); return false; }
        req = { a: 'user.create', many: true, role: role.value, users: [{ prenom: prenom.value, nom: nom.value, email: email.value }], sendMail: send.input.checked };
      } else {
        const l = parseLines(list.value);
        if (!l.length) { toast('Aucune ligne exploitable.', { err: true }); return false; }
        req = { a: 'user.create', many: true, role: role.value, users: l, sendMail: send.input.checked };
      }
      try { const r = await adminCall(req); showCredentials(r.results); }
      catch (e) { toast(e.message, { err: true }); return false; }
    } }]
  });
}

function openUser(u) {
  const prenom = textInput({ value: u.prenom, max: 60 }), nom = textInput({ value: u.nom, max: 60 }), email = textInput({ type: 'email', value: u.email || '', autocapitalize: 'none' });
  const role = selectInput(ROLES, u.role);
  const photo = photoField(u);
  const spec = selectInput([{ v: '', label: '—' }].concat((cfg('specialites') || []).map(s => ({ v: s, label: s }))), u.specialite || '');
  const rang = selectInput([{ v: 0, label: '—' }].concat(Array.from({ length: 12 }, (_, i) => ({ v: i + 1, label: 'Semestre ' + (i + 1) }))), u.rang || 0);
  const tut = selectInput([{ v: '', label: 'Aucun tuteur' }].concat(seniors().map(s => ({ v: s.id, label: fullName(s) }))), u.tuteurId || '');
  const actif = checkbox('Compte actif (décoche pour bloquer la connexion)', u.actif !== false);
  const es = etabServiceField({ etabService: etabServiceOn(), etabs: echoCfg().etabs, services: echoCfg().services }, u);
  const ktOf = b => (ktAvant(u, b) === null ? '' : String(ktAvant(u, b)));
  const ktc = textInput({ type: 'number', inputmode: 'numeric', min: '0', max: '999', value: ktOf('ktc'), placeholder: 'non renseigné' });
  const kta = textInput({ type: 'number', inputmode: 'numeric', min: '0', max: '999', value: ktOf('kta'), placeholder: 'non renseigné' });
  const profil = selectInput([{ v: '', label: 'Interne' }, { v: 'dj', label: 'DJ' }], u.profil || '');
  const extra = h('div', { class: 'col' });
  const drawExtra = () => { clear(extra); if (role.value === 'interne') extra.append(field('DES d’origine', spec), field('Semestre de DES en cours', rang, 'Si tu vides un de ces champs, l’interne devra le renseigner à sa prochaine connexion.'), field('Tuteur', tut), field('Profil', profil, 'Les réglages des DJ se font dans Admin → Gestes.'),
    h('div', { class: 'card col' }, h('b', { class: 'small' }, 'KT posés avant le stage'), h('div', { class: 'row' }, h('div', { class: 'grow' }, field('KTC', ktc)), h('div', { class: 'grow' }, field('KTA', kta))), h('p', { class: 'tiny muted' }, 'Avec 5 KT ou moins (seuil réglable dans Admin → Gestes), l’interne suit le parcours « Premiers KTC / KTA ». Vide = tuiles habituelles.'))); };
  role.addEventListener('change', drawExtra);
  drawExtra();
  const self = u.id === S.me.id;
  openSheet({
    title: fullName(u),
    body: h('div', { class: 'col' },
      h('p', { class: 'small muted' }, 'Identifiant : ' + u.username),
      field('Photo', photo),
      h('div', { class: 'row' }, h('div', { class: 'grow' }, field('Prénom', prenom)), h('div', { class: 'grow' }, field('Nom', nom))),
      field('E-mail', email), es.nodes, self ? h('p', { class: 'tiny muted' }, 'Tu ne peux pas modifier ton propre rôle ici.') : field('Rôle', role), extra, self ? null : actif,
      u.role === 'interne' ? h('a', { class: 'btn block', href: '#/dossier/' + u.id }, icon('user', 16), 'Ouvrir le dossier') : null,
      h('button', { class: 'btn block', onclick: async () => {
        if (!await confirmSheet({ title: 'Réinitialiser le mot de passe ?', text: 'Un mot de passe provisoire sera créé pour ' + fullName(u) + '. Ses connexions actuelles seront fermées.', ok: 'Réinitialiser' })) return;
        try { const r = await adminCall({ a: 'user.resetpw', uid: u.id, sendMail: !!u.email }); showCredentials([{ ok: true, prenom: u.prenom, nom: u.nom, username: r.username, tmp: r.tmp, sent: r.sent, email: u.email }], 'Nouveau mot de passe'); }
        catch (e) { toast(e.message, { err: true }); }
      } }, icon('key', 16), 'Réinitialiser le mot de passe'),
      self ? null : h('button', { class: 'btn danger block', onclick: async () => {
        if (!await confirmSheet({ title: 'Supprimer ce compte ?', text: fullName(u) + ' : ses données personnelles sont effacées définitivement ; ses gestes sont conservés de façon anonyme.', ok: 'Supprimer', danger: true })) return;
        try { await adminCall({ a: 'user.delete', uid: u.id }); toast('Compte supprimé.'); closeAll(); }
        catch (e) { toast(e.message, { err: true }); }
      } }, icon('trash', 16), 'Supprimer le compte')),
    actions: [{ label: 'Enregistrer', kind: 'primary', onClick: () => {
      if (!prenom.value.trim() || !nom.value.trim()) { toast('Prénom et nom obligatoires.', { err: true }); return false; }
      const r = self ? u.role : role.value;
      const ktv = el => { const t = el.value.trim(); return t === '' ? null : Number(t); };
      if (r === 'interne') for (const el of [ktc, kta]) { const v = ktv(el); if (v !== null && !(Number.isInteger(v) && v >= 0 && v <= 999)) { toast('Nombre de KT invalide (0 à 999).', { err: true }); return false; } }
      saveUser(u, { prenom: prenom.value.trim(), nom: nom.value.trim(), email: email.value.trim(), role: r, specialite: r === 'interne' ? spec.value : '', rang: r === 'interne' ? Number(rang.value) : 0, tuteurId: r === 'interne' ? tut.value : '', actif: self ? true : actif.input.checked, etab: es.active ? es.etab.value : u.etab, service: es.active ? es.service.value : u.service, ktcAvant: r === 'interne' ? ktv(ktc) : null, ktaAvant: r === 'interne' ? ktv(kta) : null, profil: r === 'interne' ? profil.value : '' });
      savePhoto(u, photo);
      toast('Enregistré.');
    } }]
  });
}
const closeAll = closeAllSheets;

let qMem = '', rfMem = 'all';
export function usersAdmin() {
  let q = qMem, rf = rfMem;
  const box = h('div');
  const draw = () => {
    clear(box);
    const l = users().filter(u => !u.anon && (rf === 'all' || u.role === rf) && (!q || norm(fullName(u) + ' ' + (u.email || '') + ' ' + u.username).includes(norm(q)))).sort((a, b) => fullName(a).localeCompare(fullName(b), 'fr'));
    box.append(l.length ? h('div', { class: 'card list', style: { padding: '2px 14px' } }, l.map(u => h('button', { class: 'item', onclick: () => openUser(u) },
      avatar(u, 'sm'),
      h('span', { class: 'tx' }, h('b', null, fullName(u)), h('span', null, roleLabel(u) + (u.role === 'interne' && u.sem && u.sem !== cfg('semestreCourant') ? ' · archive ' + u.sem : '') + (u.email ? ' · ' + u.email : ''))),
      u.profil === 'dj' && u.role === 'interne' ? h('span', { class: 'pill' }, 'DJ') : null, u.actif === false ? h('span', { class: 'pill warn' }, 'désactivé') : null, u.role === 'interne' && !u.anon && !profileComplete(u) ? h('span', { class: 'pill warn' }, 'profil à compléter') : null, u.mustChange ? h('span', { class: 'pill' }, 'jamais connecté') : null, icon('chevron-right', 16)))) : empty('users', 'Aucun compte.'));
  };
  const search = textInput({ type: 'search', placeholder: 'Rechercher…', value: q });
  search.addEventListener('input', () => { q = qMem = search.value; draw(); });
  const seg = segmented([{ v: 'all', label: 'Tous' }].concat(ROLES.map(r => ({ v: r.v, label: r.v === 'interne' ? 'Internes' : r.v === 'senior' ? 'Seniors' : 'Équipe' }))), rf, v => { rf = rfMem = v; draw(); });
  draw();
  return adminShell('Comptes', h('button', { class: 'btn primary block', onclick: openCreate }, icon('plus', 18), 'Créer des comptes'), search, seg, box);
}
