// Administration : règles de badges et défis de promo
import { h, icon, clear, clone } from '../util.js';
import { cfg, saveCfg } from '../store.js';
import { gesteDefs, gesteDef, ENTRETIENS } from '../logic.js';
import { openSheet, toast, field, textInput, textArea, selectInput, checkbox, colorInput, confirmSheet } from '../ui.js';
import { adminShell, rowItem, moveBtns, uniqueId, numInput, checkList, iconPicker } from './admin-ui.js';

const RULE_TYPES = [
  ['count', 'Nombre de gestes d’un type'], ['sites', 'Sites différents d’un geste'], ['sites_all', 'Tous les sites d’un geste'], ['types', 'Au moins un geste de chaque catégorie'],
  ['total', 'Nombre total de gestes'], ['login_streak', 'Jours ouvrés de connexion d’affilée'], ['meteo_streak', 'Semaines de météo d’affilée'],
  ['autoeval', 'Auto-évaluation complète'], ['entretien', 'Entretien réalisé'], ['objectifs_acquis', 'Tous les objectifs acquis']
];
const BADGE_ICONS = ['star', 'drop', 'crown', 'bolt', 'calendar', 'feather', 'activity', 'grid', 'mountain', 'eye', 'cloud', 'flag', 'butterfly', 'award', 'heart', 'target', 'sun', 'moon'];

function geteSelect(value, filter) {
  const defs = gesteDefs(true).filter(filter || (() => true));
  return selectInput(defs.map(d => ({ v: d.id, label: d.nom })), value);
}
function ruleForm(regle) {
  const st = clone(regle || { type: 'count', geste: (gesteDefs()[0] || {}).id, min: 1 });
  const typeSel = selectInput(RULE_TYPES.map(([v, l]) => ({ v, label: l })), st.type);
  const params = h('div', { class: 'col' });
  const box = h('div', { class: 'col' }, field('Condition de déblocage', typeSel), params);
  let read = () => st;
  const draw = () => {
    clear(params);
    const t = typeSel.value;
    const minIn = (label, def) => { const i = numInput(st.min || def || 1, 1, 9999); return { el: field(label, i), val: () => Math.max(1, Number(i.value) || 1) }; };
    if (t === 'count') {
      const g = geteSelect(st.geste); const d0 = () => gesteDef(g.value) || {};
      const m = minIn('Nombre minimum');
      const resSel = selectInput([{ v: '', label: 'Tous résultats' }].concat((d0().resultats || []).map(r => ({ v: r, label: r }))), st.resultat || '');
      const modList = checkList((d0().modalites || []).map(x => ({ v: x, label: x })), st.modalites || []);
      g.addEventListener('change', () => { st.geste = g.value; st.resultat = ''; st.modalites = []; draw(); });
      params.append(field('Geste', g), m.el, d0().resultats ? field('Résultat', resSel) : null, d0().modalites ? field('Modalités comptées (aucune = toutes)', modList) : null);
      read = () => { const o = { type: 'count', geste: g.value, min: m.val() }; if (d0().resultats && resSel.value) o.resultat = resSel.value; const ml = d0().modalites ? modList.get() : []; if (ml.length) o.modalites = ml; return o; };
    } else if (t === 'sites') {
      const g = geteSelect(st.geste, d => d.sites && d.sites.length); const m = minIn('Nombre de sites différents');
      params.append(field('Geste', g), m.el); read = () => ({ type: 'sites', geste: g.value, min: m.val() });
    } else if (t === 'sites_all') {
      const g = geteSelect(st.geste, d => d.sites && d.sites.length); const d0 = () => gesteDef(g.value) || {};
      const sl = checkList((d0().sites || []).map(x => ({ v: x, label: x })), st.sites || (d0().sites || []));
      g.addEventListener('change', () => { st.geste = g.value; st.sites = null; draw(); });
      params.append(field('Geste', g), field('Sites à avoir tous réalisés', sl)); read = () => ({ type: 'sites_all', geste: g.value, sites: sl.get() });
    } else if (t === 'types') {
      const ex = checkList(gesteDefs(true).map(d => ({ v: d.id, label: d.nom })), st.exclure || ['autre']);
      params.append(field('Catégories à ne pas exiger', ex)); read = () => ({ type: 'types', exclure: ex.get() });
    } else if (t === 'total' || t === 'login_streak' || t === 'meteo_streak') {
      const m = minIn(t === 'total' ? 'Nombre de gestes' : t === 'login_streak' ? 'Jours ouvrés d’affilée (week-ends et fériés non comptés)' : 'Semaines d’affilée', t === 'total' ? 50 : 5);
      params.append(m.el); read = () => ({ type: t, min: m.val() });
    } else if (t === 'entretien') {
      const e = selectInput(ENTRETIENS.map(x => ({ v: x.id, label: x.nom })), st.entretien || 'mi');
      params.append(field('Entretien', e)); read = () => ({ type: 'entretien', entretien: e.value });
    } else { params.append(h('p', { class: 'small muted' }, 'Aucun paramètre.')); read = () => ({ type: t }); }
  };
  typeSel.addEventListener('change', () => { st.type = typeSel.value; draw(); });
  draw();
  box.get = () => read();
  return box;
}

function openBadgeEditor(b) {
  const isNew = !b;
  const d = clone(b || { id: '', nom: '', desc: '', icone: 'star', couleur: '#FFD84D', actif: true, regle: null });
  const nom = textInput({ value: d.nom, max: 30 }), desc = textInput({ value: d.desc, max: 120 }), col = colorInput(d.couleur);
  const act = checkbox('Badge actif', d.actif !== false);
  const ic = iconPicker(d.icone, BADGE_ICONS);
  const rf = ruleForm(d.regle);
  const actions = [];
  if (!isNew) actions.push({ label: 'Supprimer', kind: 'danger', onClick: async () => { if (!await confirmSheet({ title: 'Supprimer ce badge ?', text: 'Il disparaît pour tous les internes. Mieux vaut le désactiver si tu hésites.', ok: 'Supprimer', danger: true })) return false; saveCfg('badges', clone(cfg('badges')).filter(x => x.id !== d.id)); } });
  actions.push({ label: 'Enregistrer', kind: 'primary', onClick: () => {
    if (!nom.value.trim()) { toast('Le nom est obligatoire.', { err: true }); return false; }
    const all = clone(cfg('badges'));
    const out = { id: d.id, nom: nom.value.trim(), desc: desc.value.trim(), icone: ic.get(), couleur: col.value, actif: act.input.checked, regle: rf.get() };
    if (isNew) { out.id = uniqueId(out.nom, all.map(x => x.id)); all.push(out); } else all[all.findIndex(x => x.id === d.id)] = out;
    saveCfg('badges', all); toast('Badge enregistré.');
  } });
  openSheet({ title: isNew ? 'Nouveau badge' : d.nom, body: h('div', { class: 'col gap-l' }, h('div', { class: 'row' }, h('div', { class: 'grow' }, field('Nom', nom)), field('Couleur', col)), field('Description', desc), field('Icône', ic), act, rf), actions });
}
export function badgesAdmin() {
  const list = clone(cfg('badges'));
  return adminShell('Badges', h('p', { class: 'small muted' }, 'Les badges se débloquent automatiquement quand la règle est remplie. Ils restent privés.'),
    h('div', { class: 'card list', style: { padding: '2px 14px' } }, list.map((b, i) => h('div', { class: 'item', style: { cursor: 'pointer' }, onclick: () => openBadgeEditor(b) },
      h('span', { style: { color: b.couleur } }, icon(b.icone, 22)), h('span', { class: 'tx' }, h('b', null, b.nom + (b.actif === false ? ' (désactivé)' : '')), h('span', null, b.desc)), moveBtns(list, i, a => saveCfg('badges', a))))),
    h('button', { class: 'btn primary block', onclick: () => openBadgeEditor(null) }, icon('plus', 18), 'Nouveau badge'));
}

/* ---------- Défis ---------- */
const DEFI_TYPES = [['geste_count', 'Nombre de gestes réalisés par la promo'], ['meteo_semaine', 'Toute la promo a rempli sa météo la même semaine'], ['flash_mois', 'Chaque interne reçoit un feedback flash dans le mois']];
function openDefiEditor(df) {
  const isNew = !df;
  const d = clone(df || { id: '', nom: '', desc: '', type: 'geste_count', geste: (gesteDefs()[0] || {}).id, cible: 100, actif: true });
  const nom = textInput({ value: d.nom, max: 40 }), desc = textInput({ value: d.desc, max: 160 });
  const act = checkbox('Défi actif', d.actif !== false);
  const typeSel = selectInput(DEFI_TYPES.map(([v, l]) => ({ v, label: l })), d.type);
  const params = h('div', { class: 'col' });
  let read = () => ({});
  const draw = () => {
    clear(params);
    if (typeSel.value === 'geste_count') {
      const g = geteSelect(d.geste); const d0 = () => gesteDef(g.value) || {};
      const cible = numInput(d.cible || 100, 1, 99999);
      const res = selectInput([{ v: '', label: 'Tous résultats' }].concat((d0().resultats || []).map(r => ({ v: r, label: r }))), d.resultat || '');
      g.addEventListener('change', () => { d.geste = g.value; d.resultat = ''; draw(); });
      params.append(field('Geste', g), d0().resultats ? field('Résultat', res) : null, field('Cible pour la promo', cible));
      read = () => { const o = { type: 'geste_count', geste: g.value, cible: Math.max(1, Number(cible.value) || 1) }; if (d0().resultats && res.value) o.resultat = res.value; return o; };
    } else { params.append(h('p', { class: 'small muted' }, 'La cible est l’effectif de la promo.')); read = () => ({ type: typeSel.value }); }
  };
  typeSel.addEventListener('change', draw);
  draw();
  const actions = [];
  if (!isNew) actions.push({ label: 'Supprimer', kind: 'danger', onClick: async () => { if (!await confirmSheet({ title: 'Supprimer ce défi ?', text: d.nom, ok: 'Supprimer', danger: true })) return false; saveCfg('defis', clone(cfg('defis')).filter(x => x.id !== d.id)); } });
  actions.push({ label: 'Enregistrer', kind: 'primary', onClick: () => {
    if (!nom.value.trim()) { toast('Le nom est obligatoire.', { err: true }); return false; }
    const all = clone(cfg('defis'));
    const out = Object.assign({ id: d.id, nom: nom.value.trim(), desc: desc.value.trim(), actif: act.input.checked }, read());
    if (isNew) { out.id = uniqueId(out.nom, all.map(x => x.id)); all.push(out); } else all[all.findIndex(x => x.id === d.id)] = out;
    saveCfg('defis', all); toast('Défi enregistré.');
  } });
  openSheet({ title: isNew ? 'Nouveau défi' : d.nom, body: h('div', { class: 'col gap-l' }, field('Nom', nom), field('Description', desc), field('Type de défi', typeSel), params, act), actions });
}
export function defisAdmin() {
  const list = clone(cfg('defis'));
  return adminShell('Défis de promo', h('p', { class: 'small muted' }, 'Des objectifs collectifs, jamais de classement individuel.'),
    h('div', { class: 'card list', style: { padding: '2px 14px' } }, list.map((d, i) => rowItem({ ic: 'flag', title: d.nom + (d.actif === false ? ' (désactivé)' : ''), sub: d.desc, onClick: () => openDefiEditor(d), right: moveBtns(list, i, a => saveCfg('defis', a)) }))),
    h('button', { class: 'btn primary block', onclick: () => openDefiEditor(null) }, icon('plus', 18), 'Nouveau défi'));
}
