// Administration (équipe pédagogique) : réglages modifiables sans code
import { h, icon, clear, clone, slugify, ICON_NAMES, fmtDateFull, download, toCSV, dayKey } from '../util.js';
import { S, cfg, saveCfg, put, adminCall, users, interns, fullName, userById } from '../store.js';
import { gesteDefs, ENTRETIENS } from '../logic.js';
import { openSheet, toast, field, textInput, textArea, selectInput, checkbox, choices, listEditor, colorInput, confirmSheet, empty, sectionHead } from '../ui.js';
import { DEFAULTS } from '../defaults.js';
import { adminShell, rowItem, moveBtns, uniqueId, numInput, checkList, iconPicker } from './admin-ui.js';
import { usersAdmin } from './admin-users.js';
import { trombiAdmin } from './trombi.js';
import { badgesAdmin, defisAdmin } from './admin-rules.js';

/* ---------- Accueil de l'administration ---------- */
const SECTIONS = [
  ['app', 'sliders', 'Application', 'Nom, logo, textes'],
  ['modules', 'grid', 'Modules', 'Activer ou masquer des fonctions'],
  ['gestes', 'activity', 'Gestes', 'Catalogue, sites, règle d’autonomie'],
  ['specialites', 'stethoscope', 'DES d’origine', 'Liste proposée aux internes'],
  ['radar', 'radar', 'Radar et notation', 'Axes et échelle A–E'],
  ['meteo', 'cloud-sun', 'Météo', 'Niveaux et mention'],
  ['badges', 'award', 'Badges', 'Règles de déblocage'],
  ['defis', 'flag', 'Défis de promo', 'Objectifs collectifs'],
  ['semestres', 'calendar', 'Semestres', 'Nouveau semestre, dates'],
  ['users', 'users', 'Comptes', 'Création, rôles, tuteurs'],
  ['trombi', 'camera', 'Trombinoscope', 'Photos et noms, à imprimer ou en PDF'],
  ['echo', 'activity', 'EchoLearn', 'Adresse, contenu des modules, établissement et service'],
  ['securite', 'shield', 'Sécurité', 'Sessions, mots de passe, inscriptions'],
  ['archives', 'download', 'Archives et exports', 'Semestres passés, fichiers CSV']
];
export function adminHome() {
  return h('div', { class: 'col', style: { gap: '14px' } }, h('h1', { class: 'h1' }, 'Administration'),
    h('p', { class: 'small muted' }, 'Tout se règle ici, sans toucher au code. Les changements s’appliquent à tous les utilisateurs à leur prochaine synchronisation.'),
    h('div', { class: 'card list', style: { padding: '2px 14px' } }, SECTIONS.map(([k, ic, t, s]) => h('a', { class: 'item', href: '#/admin/' + k, style: { textDecoration: 'none', color: 'inherit' } }, icon(ic, 20), h('span', { class: 'tx' }, h('b', null, t), h('span', null, s)), icon('chevron-right', 16)))));
}

/* ---------- Application ---------- */
function resizeLogo(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 160, k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let out = c.toDataURL('image/png');
      if (out.length > 40000) { g.globalCompositeOperation = 'destination-over'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); out = c.toDataURL('image/jpeg', 0.82); }
      if (out.length > 44000) rej(new Error('Image trop lourde, choisis un logo plus simple.')); else res(out);
    };
    img.onerror = () => rej(new Error('Image illisible.'));
    img.src = url;
  });
}
function openIdentity() {
  const a = cfg('app');
  const st = { logo: a.logo || '' };
  const nom = textInput({ value: a.nom, max: 40 }), service = textInput({ value: a.service, max: 80 });
  const prev = h('img', { alt: 'Logo', style: { width: '64px', height: '64px', objectFit: 'contain', borderRadius: '14px', background: '#fff', padding: '3px' }, src: st.logo || 'assets/logo-mark.png' });
  const file = h('input', { type: 'file', accept: 'image/*', hidden: true });
  file.addEventListener('change', async () => { try { st.logo = await resizeLogo(file.files[0]); prev.src = st.logo; } catch (e) { toast(e.message, { err: true }); } });
  openSheet({
    title: 'Identité de l’application',
    body: h('div', { class: 'col' }, field('Nom de l’application', nom, 'Affiché dans l’en-tête et à la connexion. L’icône installée sur le téléphone garde le nom « Carnet Réa ».'), field('Service', service),
      h('div', { class: 'row' }, prev, h('button', { class: 'btn sm', onclick: () => file.click() }, 'Changer le logo'), st.logo ? h('button', { class: 'btn sm ghost', onclick: () => { st.logo = ''; prev.src = 'assets/logo-mark.png'; } }, 'Logo d’origine') : null), file),
    actions: [{ label: 'Enregistrer', kind: 'primary', onClick: () => { if (!nom.value.trim()) { toast('Le nom est obligatoire.', { err: true }); return false; } saveCfg('app', { nom: nom.value.trim(), service: service.value.trim(), logo: st.logo }); toast('Enregistré.'); } }]
  });
}
function openTextes() {
  const t = cfg('textes');
  const acc = textArea({ value: t.accueil, rows: 3, max: 400, placeholder: 'Message affiché en haut de l’écran Gestes (laisser vide pour ne rien afficher)' });
  const ges = textArea({ value: t.gestes, rows: 3, max: 300 });
  const rgpd = textArea({ value: t.rgpd, rows: 10, max: 3000 });
  openSheet({
    title: 'Textes affichés', body: h('div', { class: 'col' }, field('Message d’accueil des internes', acc), field('Avertissement de saisie des gestes', ges), field('Notice d’information (inscription)', rgpd, 'Doit refléter fidèlement ce que fait l’application.')),
    actions: [{ label: 'Enregistrer', kind: 'primary', onClick: () => { saveCfg('textes', { accueil: acc.value.trim(), gestes: ges.value.trim(), rgpd: rgpd.value.trim() }); toast('Enregistré.'); } },
      { label: 'Textes d’origine', kind: 'ghost', onClick: async () => { if (!await confirmSheet({ title: 'Rétablir les textes d’origine ?', text: 'Tes modifications de textes seront perdues.', ok: 'Rétablir' })) return false; saveCfg('textes', DEFAULTS.textes); } }]
  });
}
export function appAdmin() {
  const a = cfg('app'), t = cfg('textes');
  return adminShell('Application', h('div', { class: 'card list', style: { padding: '2px 14px' } },
    rowItem({ ic: 'sliders', title: 'Nom, service et logo', sub: a.nom + (a.service ? ' · ' + a.service : ''), onClick: openIdentity }),
    rowItem({ ic: 'file', title: 'Textes affichés', sub: 'Accueil, avertissement, notice d’information', onClick: openTextes })));
}

/* ---------- Modules ---------- */
const MODULES = [['gestes', 'Carnet de gestes', 'Cœur de l’application'], ['objectifs', 'Objectifs', 'Suivi des objectifs individuels'], ['radar', 'Radar et entretiens', 'Auto-évaluation A–E'], ['meteo', 'Météo hebdomadaire', ''], ['flash', 'Feedbacks flash', 'Messages anonymes des seniors'], ['retours', 'Retours confidentiels', 'Seniors → équipe et tuteur'], ['badges', 'Badges', ''], ['defis', 'Défis de promo', ''], ['silhouette', 'Silhouette de progression', 'Dans l’onglet Badges']];
export function modulesAdmin() {
  const m = cfg('modules');
  return adminShell('Modules', h('p', { class: 'small muted' }, 'Un module masqué disparaît pour tout le monde. Les données déjà saisies sont conservées.'),
    h('div', { class: 'card list', style: { padding: '2px 14px' } }, MODULES.map(([k, t, s]) => {
      const c = checkbox('', m[k] !== false);
      c.input.addEventListener('change', () => saveCfg('modules', Object.assign({}, cfg('modules'), { [k]: c.input.checked })));
      return h('label', { class: 'item', style: { cursor: 'pointer' } }, h('span', { class: 'tx' }, h('b', null, t), s ? h('span', null, s) : null), c.input);
    })));
}

/* ---------- Gestes ---------- */
function openGesteEditor(def) {
  const isNew = !def;
  const d = clone(def || { id: '', nom: '', nomLong: '', couleur: '#FFD84D', actif: true });
  const nom = textInput({ value: d.nom, max: 20 }), nomLong = textInput({ value: d.nomLong || '', max: 60 });
  const col = colorInput(d.couleur);
  const actif = checkbox('Proposé aux internes', d.actif !== false);
  const libre = checkbox('Geste libre : l’interne précise le nom (comme « Autre »)', !!d.libre);
  let sites = (d.sites || []).slice(), modal = (d.modalites || []).slice();
  const autoBox = h('div', { class: 'col' });
  const au = checkbox('Règle d’autonomie : verrouiller un mode tant qu’un seuil n’est pas atteint', !!d.autonomie);
  const seuil = numInput(d.autonomie ? d.autonomie.seuil : 5, 1, 99);
  let compteList = null, bloqueSel = null;
  const drawAuto = () => {
    clear(autoBox);
    if (!au.input.checked) return;
    if (modal.length < 2) { autoBox.append(h('p', { class: 'small muted' }, 'Ajoute au moins deux modalités (ex. Supervisé, Autonome) pour définir la règle.')); return; }
    const prevCompte = compteList ? compteList.get() : (d.autonomie ? d.autonomie.compte : modal.slice(0, -1));
    const prevBloque = bloqueSel ? bloqueSel.value : (d.autonomie ? d.autonomie.bloque : modal[modal.length - 1]);
    compteList = checkList(modal.map(m => ({ v: m, label: m })), prevCompte.filter(x => modal.indexOf(x) >= 0));
    bloqueSel = selectInput(modal, modal.indexOf(prevBloque) >= 0 ? prevBloque : modal[modal.length - 1]);
    autoBox.append(field('Seuil', seuil), field('Modalités qui comptent pour le seuil', compteList), field('Modalité verrouillée', bloqueSel));
  };
  au.input.addEventListener('change', drawAuto);
  const sitesEd = listEditor(sites, 'Ex. Jugulaire', v => (sites = v));
  const modEd = listEditor(modal, 'Ex. Supervisé', v => { modal = v; drawAuto(); });
  const resEd = listEditor(d.resultats || [], 'Ex. Réussie', null);
  drawAuto();
  openSheet({
    title: isNew ? 'Nouveau geste' : 'Geste · ' + d.nom,
    body: h('div', { class: 'col gap-l' },
      h('div', { class: 'row' }, h('div', { class: 'grow' }, field('Nom court', nom)), field('Couleur', col)),
      field('Nom complet', nomLong), actif, libre,
      field('Sites (liste de choix)', sitesEd, 'Laisse vide s’il n’y a pas de site.'),
      field('Modalités (liste de choix)', modEd, 'Ex. Supervisé / À 4 mains / Autonome.'),
      field('Résultats (le premier = réussite)', resEd, 'Ex. Réussie / Échec.'),
      au, autoBox,
      h('p', { class: 'tiny muted' }, 'Renommer un site ou une modalité ne modifie pas les gestes déjà saisis.')),
    actions: [{ label: 'Enregistrer', kind: 'primary', onClick: () => {
      if (!nom.value.trim()) { toast('Le nom est obligatoire.', { err: true }); return false; }
      const all = clone(cfg('gestes'));
      const out = { id: d.id, nom: nom.value.trim(), nomLong: nomLong.value.trim(), couleur: col.value, actif: actif.input.checked };
      if (libre.input.checked) out.libre = true;
      if (sites.length) out.sites = sites; if (modal.length) out.modalites = modal;
      const res = resEd.getValues(); if (res.length) out.resultats = res;
      if (au.input.checked && modal.length >= 2 && compteList) out.autonomie = { seuil: Math.max(1, Number(seuil.value) || 5), compte: compteList.get(), bloque: bloqueSel.value };
      if (isNew) { out.id = uniqueId(out.nom, all.map(g => g.id)); all.push(out); }
      else { const i = all.findIndex(g => g.id === d.id); all[i] = out; }
      saveCfg('gestes', all); toast('Geste enregistré.');
    } }]
  });
}
export function gestesAdmin() {
  const list = clone(cfg('gestes'));
  return adminShell('Gestes', h('p', { class: 'small muted' }, 'L’ordre ci-dessous est celui des tuiles. Un geste désactivé n’est plus proposé mais ses données restent.'),
    h('div', { class: 'card list', style: { padding: '2px 14px' } }, list.map((g, i) => rowItem({ swatch: g.couleur, title: g.nom + (g.actif === false ? ' (désactivé)' : ''), sub: g.nomLong, onClick: () => openGesteEditor(g), right: moveBtns(list, i, a => saveCfg('gestes', a)) }))),
    h('button', { class: 'btn primary block', onclick: () => openGesteEditor(null) }, icon('plus', 18), 'Nouveau geste'));
}

/* ---------- DES d'origine (liste proposée aux internes) ---------- */
export function specialitesAdmin() {
  const ed = listEditor(cfg('specialites'), 'Ex. Cardiologie');
  return adminShell('DES d’origine', h('p', { class: 'small muted' }, 'Liste proposée aux internes à l’inscription, à leur première connexion et dans leur profil.'), ed,
    h('button', { class: 'btn primary block', onclick: () => { saveCfg('specialites', ed.getValues()); toast('Enregistré.'); } }, 'Enregistrer'));
}

/* ---------- Radar ---------- */
export function radarAdmin() {
  const R = clone(cfg('radar'));
  const axes = R.axes.map(a => Object.assign({}, a)), labels = R.echelle.map(e => Object.assign({}, e));
  const box = h('div', { class: 'col' });
  const draw = () => {
    clear(box);
    axes.forEach((a, i) => {
      const n = textInput({ value: a.nom, max: 60 }), c = textInput({ value: a.court || '', max: 18, placeholder: 'Nom court (sur le graphique)' });
      n.addEventListener('input', () => (a.nom = n.value)); c.addEventListener('input', () => (a.court = c.value));
      box.append(h('div', { class: 'card col gap-s' }, field('Axe ' + (i + 1), n), c, axes.length > 3 ? h('button', { class: 'btn sm danger', onclick: () => { axes.splice(i, 1); draw(); } }, icon('trash', 14), 'Retirer') : null));
    });
    if (axes.length < 8) box.append(h('button', { class: 'btn ghost', onclick: () => { axes.push({ id: uniqueId('axe', axes.map(a => a.id)), nom: '', court: '' }); draw(); } }, icon('plus', 16), 'Ajouter un axe'));
  };
  draw();
  const lab = h('div', { class: 'card col' }, labels.map(e => { const i = textInput({ value: e.label, max: 30 }); i.addEventListener('input', () => (e.label = i.value)); return h('div', { class: 'row' }, h('b', { class: 'mono', style: { width: '24px' } }, e.l), h('div', { class: 'grow' }, i)); }));
  return adminShell('Radar et notation', sectionHead('Axes du radar'), box, sectionHead('Signification des lettres'), lab,
    h('button', { class: 'btn primary block', onclick: () => {
      if (axes.some(a => !a.nom.trim())) { toast('Chaque axe doit avoir un nom.', { err: true }); return; }
      saveCfg('radar', { axes: axes.map(a => ({ id: a.id, nom: a.nom.trim(), court: (a.court || '').trim() || a.nom.trim() })), echelle: labels.map(e => ({ l: e.l, label: e.label.trim() || e.l })) });
      toast('Enregistré.');
    } }, 'Enregistrer'),
    h('p', { class: 'tiny muted' }, 'Retirer un axe masque ses notes déjà saisies. Les évaluations restent conservées.'));
}

/* ---------- Météo ---------- */
const METEO_ICONS = ['sun', 'cloud-sun', 'cloud', 'rain', 'storm', 'snow', 'wind', 'moon', 'heart', 'star', 'bolt', 'drop'];
function openMeteoEditor(n) {
  const isNew = !n;
  const d = clone(n || { id: '', nom: '', icone: 'cloud', couleur: '#9AA4B8' });
  const nom = textInput({ value: d.nom, max: 24 }), col = colorInput(d.couleur), al = checkbox('Niveau d’alerte (signalé à l’équipe dans « À surveiller »)', !!d.alerte);
  const ic = iconPicker(d.icone, METEO_ICONS);
  const actions = [{ label: 'Enregistrer', kind: 'primary', onClick: () => {
    if (!nom.value.trim()) { toast('Le nom est obligatoire.', { err: true }); return false; }
    const m = clone(cfg('meteo')); const out = { id: d.id, nom: nom.value.trim(), icone: ic.get(), couleur: col.value }; if (al.input.checked) out.alerte = true;
    if (isNew) { out.id = uniqueId(out.nom, m.niveaux.map(x => x.id)); m.niveaux.push(out); } else m.niveaux[m.niveaux.findIndex(x => x.id === d.id)] = out;
    saveCfg('meteo', m); toast('Enregistré.');
  } }];
  openSheet({ title: isNew ? 'Nouveau niveau' : d.nom, body: h('div', { class: 'col' }, h('div', { class: 'row' }, h('div', { class: 'grow' }, field('Nom', nom)), field('Couleur', col)), field('Icône', ic), al), actions });
}
export function meteoAdmin() {
  const m = clone(cfg('meteo'));
  const ment = textArea({ value: m.mention, rows: 2, max: 200 });
  return adminShell('Météo', sectionHead('Niveaux'),
    h('div', { class: 'card list', style: { padding: '2px 14px' } }, m.niveaux.map((n, i) => rowItem({ ic: n.icone, title: n.nom + (n.alerte ? ' · alerte' : ''), swatch: null, onClick: () => openMeteoEditor(n), right: moveBtns(m.niveaux, i, a => saveCfg('meteo', Object.assign({}, m, { niveaux: a }))) }))),
    h('button', { class: 'btn ghost block', onclick: () => openMeteoEditor(null) }, icon('plus', 16), 'Ajouter un niveau'),
    field('Mention affichée aux internes', ment, 'Précise qui peut voir la météo.'),
    h('button', { class: 'btn primary block', onclick: () => { saveCfg('meteo', Object.assign({}, clone(cfg('meteo')), { mention: ment.value.trim() })); toast('Enregistré.'); } }, 'Enregistrer la mention'));
}

/* ---------- Sécurité ---------- */
export function securiteAdmin() {
  const s = cfg('securite');
  const jours = numInput(s.sessionJours, 1, 90), mdp = numInput(s.mdpMin, 6, 40);
  const ins = checkbox('Inscription ouverte aux internes (désactive-la une fois la promo inscrite)', s.inscriptionOuverte !== false);
  const feries = listEditor(cfg('feries'), 'AAAA-MM-JJ');
  return adminShell('Sécurité', h('div', { class: 'card col' }, field('Durée de session sans activité (jours)', jours), field('Longueur minimale du mot de passe', mdp), ins),
    sectionHead('Jours fériés supplémentaires'), h('p', { class: 'small muted' }, 'Pour le badge « Régularité » : week-ends et fériés nationaux, Vendredi saint, 27 mai et 21 juillet sont déjà exclus. Ajoute d’autres dates ci-dessous (format AAAA-MM-JJ).'), feries,
    h('button', { class: 'btn primary block', onclick: () => {
      const fer = feries.getValues(); if (fer.some(f => !/^\d{4}-\d{2}-\d{2}$/.test(f))) { toast('Dates fériées : format AAAA-MM-JJ.', { err: true }); return; }
      saveCfg('securite', { sessionJours: Math.max(1, Number(jours.value) || 14), mdpMin: Math.max(6, Number(mdp.value) || 8), inscriptionOuverte: ins.input.checked }); saveCfg('feries', fer); toast('Enregistré.');
    } }, 'Enregistrer'));
}

/* ---------- EchoLearn ---------- */
export function echoAdmin() {
  const e = cfg('echo') || {};
  const actif = checkbox('EchoLearn actif (tuile, examens d’écho, validations)', e.actif !== false);
  const url = textInput({ value: e.url || '', placeholder: 'https://compte.github.io/echolearn/', autocapitalize: 'none', inputmode: 'url' });
  const es = checkbox('Demander l’établissement et le service (inscription, profil)', !!e.etabService);
  const etabs = listEditor(e.etabs || [], 'Ex. CHU de la Guadeloupe');
  const services = listEditor(e.services || [], 'Ex. Réanimation');
  return adminShell('EchoLearn',
    h('div', { class: 'card col' }, actif, field('Adresse d’EchoLearn', url, 'Adresse complète commençant par https://. Elle sert à la tuile « EchoLearn » et à l’e-mail d’identifiants.')),
    sectionHead('Contenu des modules'),
    h('p', { class: 'small muted' }, 'Ajouter ou masquer des modules, des sections et des items d’EchoLearn, sans toucher au code.'),
    h('a', { class: 'btn ghost block', href: '#/admin/echo-contenu', 'data-act': 'echo-contenu' }, icon('list', 18), 'Modifier le contenu d’EchoLearn'),
    sectionHead('Établissement et service'),
    h('p', { class: 'small muted' }, 'Champs masqués par défaut. Une fois activés, ils sont demandés à l’inscription, modifiables dans le profil et par l’équipe, et affichés aux formateurs dans EchoLearn.'),
    h('div', { class: 'card col' }, es),
    sectionHead('Établissements proposés'), etabs,
    sectionHead('Services proposés'), services,
    h('button', { class: 'btn primary block', onclick: () => {
      const u = url.value.trim();
      if (u && !/^https:\/\/[A-Za-z0-9._~\-\/]{4,200}$/.test(u)) { toast('Adresse invalide : elle doit commencer par https://', { err: true }); return; }
      const keep = Object.assign({}, cfg('echo')); delete keep.modules; // la liste des modules reste celle de l’application
      saveCfg('echo', Object.assign(keep, { actif: actif.input.checked, url: u, etabService: es.input.checked, etabs: etabs.getValues(), services: services.getValues() }));
      toast('Enregistré.');
    } }, 'Enregistrer'));
}

/* ---------- Semestres ---------- */
function openSemestre(s) {
  const nom = textInput({ value: s.nom }), d0 = textInput({ type: 'date', value: s.debut }), d1 = textInput({ type: 'date', value: s.fin });
  const isCur = cfg('semestreCourant') === s.id;
  const actions = [{ label: 'Enregistrer', kind: 'primary', onClick: () => {
    if (!d0.value || !d1.value || d1.value <= d0.value) { toast('Dates invalides.', { err: true }); return false; }
    saveCfg('semestres', clone(cfg('semestres')).map(x => (x.id === s.id ? { id: s.id, nom: nom.value.trim() || s.id, debut: d0.value, fin: d1.value } : x))); toast('Enregistré.');
  } }];
  if (!isCur) actions.unshift({ label: 'Définir comme courant', kind: 'ghost', onClick: async () => { if (!await confirmSheet({ title: 'Changer de semestre courant ?', text: 'Les tableaux de bord afficheront ce semestre. Les internes d’un autre semestre passent en lecture seule.', ok: 'Confirmer' })) return false; saveCfg('semestreCourant', s.id); } });
  openSheet({ title: 'Semestre ' + s.id, body: h('div', { class: 'col' }, field('Nom', nom), field('Début', d0), field('Fin', d1)), actions });
}
function openNewSemestre() {
  const sems = cfg('semestres');
  const last = sems[sems.length - 1];
  const y = last ? Number(last.fin.slice(0, 4)) : new Date().getFullYear();
  const id = textInput({ value: (last && last.fin.slice(5, 7) <= '06' ? y + '-11' : y + '-05'), placeholder: 'AAAA-MM' }), nom = textInput({ placeholder: 'Ex. Mai – Oct. 2027' });
  const d0 = textInput({ type: 'date' }), d1 = textInput({ type: 'date' });
  const cur = interns();
  const keep = checkList(cur.map(u => ({ v: u.id, label: fullName(u) })), []);
  openSheet({
    title: 'Nouveau semestre',
    body: h('div', { class: 'col gap-l' }, h('div', { class: 'banner' }, icon('alert', 18), h('span', null, 'Le nouveau semestre devient le semestre courant. Les internes actuels passent en archive (lecture seule) sauf ceux que tu reconduis.')),
      field('Identifiant', id, 'Ex. 2027-05'), field('Nom', nom), h('div', { class: 'row' }, h('div', { class: 'grow' }, field('Début', d0)), h('div', { class: 'grow' }, field('Fin', d1))),
      cur.length ? field('Internes qui restent un semestre de plus', keep) : null),
    actions: [{ label: 'Créer le semestre', kind: 'primary', onClick: async () => {
      try { await adminCall({ a: 'semestre.new', id: id.value.trim(), nom: nom.value.trim(), debut: d0.value, fin: d1.value, reconduire: keep.get() }); toast('Semestre créé.'); }
      catch (e) { toast(e.message, { err: true }); return false; }
    } }]
  });
}
export function semestresAdmin() {
  const sems = cfg('semestres'), cur = cfg('semestreCourant');
  return adminShell('Semestres', h('div', { class: 'card list', style: { padding: '2px 14px' } }, sems.slice().reverse().map(s => rowItem({ ic: 'calendar', title: s.nom + (s.id === cur ? ' · courant' : ''), sub: fmtDateFull(s.debut) + ' → ' + fmtDateFull(s.fin), onClick: () => openSemestre(s) }))),
    h('button', { class: 'btn primary block', onclick: openNewSemestre }, icon('plus', 18), 'Nouveau semestre'));
}

/* ---------- Archives et exports ---------- */
function csvFrom(name, rows) { download(name + '.csv', toCSV(rows)); }
export function archivesAdmin() {
  const sems = cfg('semestres');
  const sel = selectInput(sems.slice().reverse().map(s => ({ v: s.id, label: s.nom + (s.id === cfg('semestreCourant') ? ' (courant)' : '') })), cfg('semestreCourant'));
  const out = h('div', { class: 'col' });
  const load = async () => {
    clear(out); out.append(h('p', { class: 'muted' }, 'Chargement…'));
    try {
      const { rows } = await adminCall({ a: 'archive', sem: sel.value });
      clear(out);
      const uname = id => { const u = rows.users.find(x => x.id === id); return u ? ((u.prenom || '') + ' ' + (u.nom || '')).trim() : id; };
      out.append(h('div', { class: 'kpis' },
        h('div', { class: 'kpi' }, h('div', { class: 'v' }, String(rows.users.length)), h('div', { class: 'l' }, 'internes')),
        h('div', { class: 'kpi' }, h('div', { class: 'v' }, String(rows.gestes.length)), h('div', { class: 'l' }, 'gestes')),
        h('div', { class: 'kpi' }, h('div', { class: 'v' }, String(rows.objectifs.length)), h('div', { class: 'l' }, 'objectifs'))));
      const nameOf = id => { const g = (cfg('gestes') || []).find(x => x.id === id); return g ? g.nom : id; };
      out.append(h('div', { class: 'col' },
        h('button', { class: 'btn', onclick: () => csvFrom('archive-' + sel.value + '-gestes', [['Interne', 'Date', 'Geste', 'Précision', 'Site', 'Modalité', 'Résultat', 'Commentaire']].concat(rows.gestes.map(g => [uname(g.uid), dayKey(g.ts), nameOf(g.type), g.nom, g.site, g.modalite, g.resultat, g.commentaire])) ) }, icon('download', 16), 'Gestes (CSV)'),
        h('button', { class: 'btn', onclick: () => csvFrom('archive-' + sel.value + '-objectifs', [['Interne', 'Objectif', 'Statut', 'Commentaire équipe', 'Auto-évaluation', 'Commentaire interne']].concat(rows.objectifs.map(o => [uname(o.uid), o.texte, o.statut, o.commentaire, o.autoStatut, o.autoCommentaire])) ) }, icon('download', 16), 'Objectifs (CSV)'),
        h('button', { class: 'btn', onclick: () => csvFrom('archive-' + sel.value + '-entretiens', [['Interne', 'Entretien', 'Date', 'Évaluation équipe', 'Auto-évaluation', 'Commentaire équipe', 'Commentaire interne']].concat(rows.entretiens.map(e => [uname(e.uid), e.type, e.date, JSON.stringify(e.evalu || {}), JSON.stringify(e.auto || {}), e.commentaire, e.autoCommentaire])) ) }, icon('download', 16), 'Entretiens (CSV)'),
        h('button', { class: 'btn', onclick: () => csvFrom('archive-' + sel.value + '-meteo', [['Interne', 'Semaine', 'Niveau', 'Commentaire']].concat(rows.meteo.map(m => [uname(m.uid), m.semaine, m.niveau, m.commentaire])) ) }, icon('download', 16), 'Météo (CSV)')));
    } catch (e) { clear(out); out.append(h('div', { class: 'err' }, e.message)); }
  };
  sel.addEventListener('change', load);
  load();
  return adminShell('Archives et exports', h('p', { class: 'small muted' }, 'Exporte les données d’un semestre. Les données sont conservées 5 ans, puis anonymisées automatiquement.'), field('Semestre', sel), out);
}

export const ADMIN_VIEWS = { app: appAdmin, modules: modulesAdmin, gestes: gestesAdmin, specialites: specialitesAdmin, radar: radarAdmin, meteo: meteoAdmin, badges: badgesAdmin, defis: defisAdmin, semestres: semestresAdmin, users: usersAdmin, trombi: trombiAdmin, echo: echoAdmin, securite: securiteAdmin, archives: archivesAdmin };
