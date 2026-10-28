// Profil, météo, feedbacks reçus, réglages
import { h, icon, clear, fmtDate, fmtDateLong, relDay, download, toCSV, dayKey, uid as newId, isoWeekKey } from '../util.js';
import { S, put, cfg, get, userById, fullName, meNow, tutees, logout, changePw, deleteMyAccount, sync, pendingCount, isReadOnly, curSem, semInfo, ApiError, NetError } from '../store.js';
import { meteoOf, meteoDef, flashOf, semesterWeeks, weekLabel, currentWeek, gestesOf, gesteName, gesteDetail, objectifsOf, statutNom, semFor } from '../logic.js';
import { openSheet, toast, field, textInput, textArea, choices, segmented, confirmSheet, empty, sectionHead, selectInput } from '../ui.js';
import { getTheme, setTheme } from '../theme.js';
import { meteoRow, openMeteoComment } from './gestes.js';
import { pubInfo, appName } from '../nav.js';
import { avatar, photoField, savePhoto } from '../photo.js';
import { echoCard, toggleUnlock, unlockAvailable } from './echo-ui.js';
import { unlockEnabled } from '../unlock.js';
import { etabServiceField } from './etab-service.js';
import { echoCfg, etabServiceOn } from '../echo.js';

export const ROLE_LABEL = { interne: 'Interne', senior: 'Senior', equipe: 'Équipe pédagogique' };
export function roleLabel(u) { return u.role === 'senior' && tutees(u.id).length ? 'Senior · tuteur' : ROLE_LABEL[u.role] || u.role; }

/* ---------- Météo ---------- */
function openExtraMeteo() {
  const st = { n: '' };
  const niv = cfg('meteo').niveaux || [];
  const t = textArea({ placeholder: 'Que se passe-t-il ? (facultatif)', max: 300 });
  openSheet({
    title: 'Ajouter une météo',
    body: h('div', { class: 'col' }, h('p', { class: 'small soft' }, 'Un coup dur, une belle journée : tu peux ajouter une météo en dehors de celle de la semaine.'),
      field('Ta météo', choices(niv.map(n => ({ v: n.id, label: n.nom, c: n.couleur })), '', v => (st.n = v))), field('Un mot', t), h('p', { class: 'tiny muted' }, cfg('meteo').mention)),
    actions: [{ label: 'Enregistrer', kind: 'primary', onClick: () => {
      if (!st.n) { toast('Choisis une météo.', { err: true }); return false; }
      put('meteo', { id: S.me.id + '_x_' + newId(), uid: S.me.id, sem: S.me.sem, semaine: currentWeek(), niveau: st.n, commentaire: t.value.trim(), extra: true, ts: Date.now() });
      toast('Météo ajoutée.');
    } }]
  });
}
function openMeteoDetail(m) {
  const d = meteoDef(m.niveau);
  openSheet({ title: d ? d.nom : 'Météo', body: h('div', { class: 'col' }, h('p', { class: 'small muted' }, fmtDateLong(m.ts) + (m.extra ? ' · météo ajoutée' : ' · ' + weekLabel(m.semaine))), m.commentaire ? h('p', { class: 'soft', style: { whiteSpace: 'pre-wrap' } }, m.commentaire) : h('p', { class: 'muted' }, 'Pas de commentaire.')),
    actions: S.me.role === 'interne' && !isReadOnly() ? [{ label: 'Ajouter / modifier un mot', kind: 'primary', close: true, onClick: () => { openMeteoComment(m); } }] : [] });
}
export function meteoHistory(uid, sem) {
  const all = meteoOf(uid, sem);
  const weeks = semesterWeeks(sem || semFor(uid));
  const by = new Map(all.filter(m => !m.extra).map(m => [m.semaine, m]));
  const cur = currentWeek();
  const grid = h('div', { class: 'weeks' }, weeks.map(w => {
    const m = by.get(w);
    const d = m && meteoDef(m.niveau);
    return h('button', { class: 'wk' + (m ? '' : ' empty'), style: { '--c': d ? d.couleur : 'var(--line2)', outline: w === cur ? '2px solid var(--line2)' : '' }, title: weekLabel(w) + (d ? ' : ' + d.nom : ''), 'aria-label': weekLabel(w) + (d ? ' : ' + d.nom : ' : pas de météo'), onclick: () => m && openMeteoDetail(m) }, d ? icon(d.icone || 'cloud', 16) : null);
  }));
  const extras = all.filter(m => m.extra);
  return h('div', { class: 'col' }, grid,
    extras.length ? h('div', { class: 'card list', style: { padding: '2px 14px' } }, extras.slice(0, 8).map(m => { const d = meteoDef(m.niveau); return h('button', { class: 'item', onclick: () => openMeteoDetail(m) }, icon(d ? d.icone : 'cloud', 20), h('span', { class: 'tx' }, h('b', null, d ? d.nom : m.niveau), h('span', null, relDay(m.ts) + (m.commentaire ? ' · ' + m.commentaire : ''))), icon('chevron-right', 16)); })) : null);
}

/* ---------- Feedbacks flash reçus ---------- */
export function flashList(uid, withAuthor) {
  const list = flashOf(uid);
  if (!list.length) return empty('message', 'Aucun feedback flash pour l’instant.');
  return h('div', { class: 'col' }, list.map(f => h('div', { class: 'card' },
    h('p', { style: { whiteSpace: 'pre-wrap' } }, f.texte),
    h('div', { class: 'tiny muted', style: { marginTop: '6px' } }, relDay(f.ts) + (withAuthor ? ' · ' + (f.auteur ? fullName(userById(f.auteur)) : 'auteur masqué') : ' · anonyme')))));
}

/* ---------- Réglages ---------- */
function openProfile() {
  const me = meNow();
  const prenom = textInput({ value: me.prenom, max: 60 }), nom = textInput({ value: me.nom, max: 60 }), email = textInput({ type: 'email', value: me.email || '', autocapitalize: 'none' });
  const specs = cfg('specialites') || [];
  const spec = selectInput([{ v: '', label: 'Choisir…' }].concat(specs.map(s => ({ v: s, label: s }))), me.specialite || '');
  const rang = selectInput([{ v: '', label: 'Choisir…' }].concat(Array.from({ length: 12 }, (_, i) => ({ v: i + 1, label: 'Semestre ' + (i + 1) }))), me.rang || '');
  const photo = photoField(me);
  const es = etabServiceField({ etabService: etabServiceOn(), etabs: echoCfg().etabs, services: echoCfg().services }, me);
  openSheet({
    title: 'Mon profil',
    body: h('div', { class: 'col' }, field('Photo (facultative)', photo),
      h('div', { class: 'row' }, h('div', { class: 'grow' }, field('Prénom', prenom)), h('div', { class: 'grow' }, field('Nom', nom))), field('E-mail', email, 'Sert à réinitialiser ton mot de passe.'), es.nodes,
      me.role === 'interne' ? [field('DES d’origine', spec), field('Semestre de DES en cours', rang, 'Visibles de l’équipe pédagogique et des seniors.')] : null,
      h('p', { class: 'tiny muted' }, 'Identifiant : ' + me.username + ' (non modifiable).')),
    actions: [{ label: 'Enregistrer', kind: 'primary', onClick: () => {
      if (me.role === 'interne' && !spec.value) { toast('Choisis ton DES d’origine.', { err: true }); return false; }
      if (me.role === 'interne' && !rang.value) { toast('Choisis ton semestre de DES.', { err: true }); return false; }
      savePhoto(me, photo);
      put('users', { id: me.id, prenom: prenom.value.trim(), nom: nom.value.trim(), email: email.value.trim(), role: me.role, specialite: me.role === 'interne' ? spec.value : (me.specialite || ''), rang: me.role === 'interne' ? Number(rang.value) : (me.rang || 0), actif: true, tuteurId: me.tuteurId || '', etab: es.active ? es.etab.value : me.etab, service: es.active ? es.service.value : me.service });
      toast('Profil enregistré.');
    } }]
  });
}
function openChangePw() {
  const o = textInput({ type: 'password', autocomplete: 'current-password' }), n1 = textInput({ type: 'password', autocomplete: 'new-password' }), n2 = textInput({ type: 'password', autocomplete: 'new-password' });
  const err = h('div', { class: 'err', hidden: true, role: 'alert' });
  openSheet({
    title: 'Changer mon mot de passe',
    body: h('div', { class: 'col' }, field('Mot de passe actuel', o), field('Nouveau mot de passe', n1, (pubInfo().mdpMin || 8) + ' caractères minimum.'), field('Confirmer', n2), err),
    actions: [{ label: 'Enregistrer', kind: 'primary', onClick: async () => {
      err.hidden = true;
      if (n1.value !== n2.value) { err.textContent = 'Les deux mots de passe ne sont pas identiques.'; err.hidden = false; return false; }
      try { await changePw(o.value, n1.value); toast('Mot de passe modifié.'); }
      catch (e) { err.textContent = e instanceof NetError ? 'Pas de connexion Internet.' : e.message; err.hidden = false; return false; }
    } }]
  });
}
function openInstall() {
  openSheet({
    title: 'Installer l’application', body: h('div', { class: 'col' },
      h('p', { class: 'soft' }, 'Installée sur ton écran d’accueil, l’application s’ouvre en plein écran et fonctionne même sans réseau.'),
      h('div', { class: 'card' }, h('b', null, 'iPhone (Safari)'), h('p', { class: 'small soft' }, 'Touche le bouton Partager (carré avec une flèche), puis « Sur l’écran d’accueil ».')),
      h('div', { class: 'card' }, h('b', null, 'Android (Chrome)'), h('p', { class: 'small soft' }, 'Touche le menu ⋮ puis « Installer l’application » ou « Ajouter à l’écran d’accueil ».')),
      h('p', { class: 'tiny muted' }, 'Le nom affiché sous l’icône reste « Carnet Réa », même si le service renomme l’application.'))
  });
}
function openNotice() {
  openSheet({ title: 'Notice d’information', body: h('p', { class: 'soft', style: { whiteSpace: 'pre-wrap' } }, (cfg('textes') || {}).rgpd || '') });
}
function exportMine() {
  const rows = [['Date', 'Geste', 'Détail', 'Commentaire']].concat(gestesOf(S.me.id).slice().reverse().map(g => [dayKey(g.ts), gesteName(g), gesteDetail(g), g.commentaire]));
  download('mes-gestes.csv', toCSV(rows));
}
function openDeleteAccount() {
  const pw = textInput({ type: 'password', autocomplete: 'current-password' });
  const err = h('div', { class: 'err', hidden: true, role: 'alert' });
  openSheet({
    title: 'Supprimer mon compte',
    body: h('div', { class: 'col' }, h('div', { class: 'banner bad' }, icon('alert', 18), h('span', null, 'Tes données personnelles (identité, objectifs, évaluations, météo, badges) seront effacées définitivement. Tes gestes sont conservés de façon anonyme pour les statistiques du service.')), field('Confirme avec ton mot de passe', pw), err),
    actions: [{ label: 'Supprimer définitivement', kind: 'danger', onClick: async () => {
      err.hidden = true;
      try { await deleteMyAccount(pw.value); }
      catch (e) { err.textContent = e instanceof NetError ? 'Pas de connexion Internet.' : e.message; err.hidden = false; return false; }
    } }]
  });
}
async function doLogout() {
  if (pendingCount() > 0 && !S.online) {
    if (!await confirmSheet({ title: 'Saisies non envoyées', text: pendingCount() + ' modification(s) n’ont pas encore été envoyées (pas de réseau). Si tu te déconnectes maintenant, elles seront perdues.', ok: 'Me déconnecter quand même', danger: true })) return;
  }
  await logout();
}

function setting(ic, label, sub, fn) {
  return h('button', { class: 'item', onclick: fn }, icon(ic, 20), h('span', { class: 'tx' }, h('b', null, label), sub ? h('span', null, sub) : null), icon('chevron-right', 16));
}

export function moiView() {
  const me = meNow();
  const frag = h('div', { class: 'col', style: { gap: '18px' } });
  const sem = semInfo(me.sem || curSem());
  const tut = me.tuteurId ? userById(me.tuteurId) : null;
  frag.append(h('h1', { class: 'h1' }, 'Moi'));
  frag.append(h('div', { class: 'card pad-l row', style: { gap: '14px' } }, avatar(me, 'lg'),
    h('div', { class: 'grow' }, h('b', { style: { fontSize: '17px' } }, fullName(me)), h('div', { class: 'small muted' }, roleLabel(me)),
      me.role === 'interne' && sem ? h('div', { class: 'small muted' }, sem.nom) : null,
      me.role === 'interne' ? h('div', { class: 'small muted ic-inline' }, tut ? ['Tuteur :', avatar(tut, 'xs'), fullName(tut)] : 'Pas de tuteur désigné') : null)));
  if (me.role === 'interne') {
    if (cfg('modules').meteo) {
      frag.append(h('div', null, sectionHead('Ma météo'), !isReadOnly() ? meteoRow() : null, h('div', { style: { height: '12px' } }), meteoHistory(me.id),
        !isReadOnly() ? h('button', { class: 'btn block ghost mt', onclick: openExtraMeteo }, icon('plus', 16), 'Ajouter une autre météo') : null));
    }
    if (cfg('modules').flash) frag.append(h('div', null, sectionHead('Feedbacks flash reçus', 'anonymes'), flashList(me.id, false)));
    frag.append(h('a', { class: 'btn block', href: '#/bilan' }, icon('file', 18), 'Mon bilan visuel'));
  }
  const ec = echoCard();
  if (ec) frag.append(ec);
  const th = segmented([{ v: 'auto', label: 'Auto' }, { v: 'light', label: 'Clair', icon: 'sun' }, { v: 'dark', label: 'Sombre', icon: 'moon' }], getTheme(), v => setTheme(v));
  frag.append(h('div', null, sectionHead('Réglages'),
    h('div', { class: 'card list', style: { padding: '2px 14px' } },
      h('div', { class: 'item' }, icon('sun', 20), h('span', { class: 'tx' }, h('b', null, 'Apparence')), h('div', { style: { width: '210px' } }, th)),
      setting('user', 'Mon profil', 'Photo, nom, e-mail' + (me.role === 'interne' ? ', DES, semestre' : ''), openProfile),
      setting('key', 'Changer mon mot de passe', null, openChangePw),
      unlockAvailable() ? setting('lock', 'Déverrouillage par le téléphone', unlockEnabled(me.id) ? 'Activé : Face ID, empreinte ou code' : 'Désactivé', toggleUnlock) : null,
      setting('smartphone', 'Installer l’application', 'Écran d’accueil, mode hors ligne', openInstall),
      me.role === 'interne' ? setting('download', 'Exporter mes gestes', 'Fichier CSV', exportMine) : null,
      setting('shield', 'Notice d’information', 'Données personnelles', openNotice),
      me.role !== 'equipe' || true ? setting('trash', 'Supprimer mon compte', null, openDeleteAccount) : null,
      setting('logout', 'Se déconnecter', null, doLogout))));
  frag.append(h('div', { class: 'tiny muted center' }, appName() + ' · version 1.1 · ' + (S.lastSync ? 'synchronisé ' + relDay(S.lastSync) : 'jamais synchronisé') + ' · ', h('button', { class: 'linkbtn tiny', onclick: () => { sync({ force: true }).then(() => toast('Synchronisation terminée.')); } }, 'Forcer la synchronisation')));
  return frag;
}
