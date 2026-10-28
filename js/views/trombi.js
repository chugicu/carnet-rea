// Trombinoscope (équipe pédagogique) : photos de profil et noms, à imprimer ou à enregistrer en PDF
import { h, icon, clear, fmtDateFull } from '../util.js';
import { cfg, users, fullName, photoOf, initials, desLabel, semInfo } from '../store.js';
import { field, selectInput, checkbox, empty } from '../ui.js';
import { appName, appLogo } from '../nav.js';

const OPT = { sem: '', equipe: false, seniors: false, sub: true, cols: '4' }; // réglages conservés quand on quitte puis revient sur l'écran
const byName = (a, b) => ((a.nom || '') + ' ' + (a.prenom || '')).localeCompare((b.nom || '') + ' ' + (b.prenom || ''), 'fr', { sensitivity: 'base' });
const active = u => !u.anon && u.actif !== false;
const semName = id => { const s = semInfo(id); return s ? s.nom : id; };

/** Semestres pour lesquels il y a des internes : le semestre courant d'abord, puis les autres */
function semOptions() {
  const cur = cfg('semestreCourant');
  const found = new Set(users().filter(u => u.role === 'interne' && active(u) && u.sem).map(u => u.sem));
  found.add(cur);
  const known = (cfg('semestres') || []).map(s => s.id).filter(id => found.has(id));
  const rest = Array.from(found).filter(id => known.indexOf(id) < 0);
  const ids = [cur].concat(known.filter(id => id !== cur).reverse(), rest.filter(id => id !== cur));
  return ids.map(id => ({ v: id, label: semName(id) + (id === cur ? ' (courant)' : '') }));
}

function card(u, sub) {
  const p = photoOf(u.id);
  return h('figure', { class: 'trombi-card' },
    p ? h('img', { src: p, alt: fullName(u) }) : h('div', { class: 'trombi-ph', 'aria-label': 'Pas de photo' }, initials(u)),
    h('figcaption', null, h('span', { class: 'pn' }, u.prenom || ''), h('b', { class: 'nm' }, (u.nom || '').toUpperCase()), sub ? h('span', { class: 'sb' }, sub) : null));
}
function section(title, list, withSub) {
  if (!list.length) return null;
  return h('section', { class: 'trombi-sec' }, h('h2', { class: 'h3' }, title + ' · ' + list.length),
    h('div', { class: 'trombi-grid' }, list.map(u => card(u, withSub ? desLabel(u) : ''))));
}

export function trombiAdmin() {
  if (!OPT.sem) OPT.sem = cfg('semestreCourant');
  const sems = semOptions();
  if (!sems.some(o => o.v === OPT.sem)) OPT.sem = sems[0].v;
  const sel = selectInput(sems, OPT.sem);
  const colSel = selectInput([{ v: '3', label: '3 par ligne' }, { v: '4', label: '4 par ligne' }, { v: '5', label: '5 par ligne' }, { v: '6', label: '6 par ligne' }], OPT.cols);
  const cEq = checkbox('Ajouter l’équipe pédagogique', OPT.equipe), cSe = checkbox('Ajouter les seniors', OPT.seniors), cSub = checkbox('Afficher le DES d’origine et le semestre de DES', OPT.sub);
  const info = h('div', { class: 'small muted', id: 'trombiInfo' });
  const out = h('div', { class: 'col', style: { gap: '16px' }, id: 'trombiOut' });

  const draw = () => {
    OPT.sem = sel.value; OPT.cols = colSel.value; OPT.equipe = cEq.input.checked; OPT.seniors = cSe.input.checked; OPT.sub = cSub.input.checked;
    const all = users().filter(active);
    const interns = all.filter(u => u.role === 'interne' && u.sem === OPT.sem).sort(byName);
    const seniors = OPT.seniors ? all.filter(u => u.role === 'senior').sort(byName) : [];
    const equipe = OPT.equipe ? all.filter(u => u.role === 'equipe').sort(byName) : [];
    const shown = [].concat(equipe, seniors, interns);
    const missing = shown.filter(u => !photoOf(u.id)).length;
    info.textContent = shown.length + ' personne' + (shown.length > 1 ? 's' : '') + (missing ? ' · ' + missing + ' sans photo (initiales affichées)' : ' · toutes avec photo');
    clear(out);
    out.style.setProperty('--cols', OPT.cols);
    out.append(h('header', { class: 'bilan-page trombi-head' },
      h('div', { class: 'row', style: { gap: '14px' } }, h('img', { src: appLogo(), alt: '', style: { width: '48px', height: '48px', objectFit: 'contain', borderRadius: '12px', background: '#fff', padding: '3px' } }),
        h('div', null, h('div', { class: 'h2' }, appName() + (cfg('app').service ? ' · ' + cfg('app').service : '')), h('h1', { class: 'h1', style: { fontSize: '22px' } }, 'Trombinoscope'))),
      h('div', { class: 'small muted', style: { marginTop: '6px' } }, semName(OPT.sem) + ' · édité le ' + fmtDateFull(Date.now()))));
    if (!shown.length) { out.append(empty('users', 'Aucun interne dans ce semestre.')); return; }
    out.append(section('Équipe pédagogique', equipe, false), section('Seniors', seniors, false), section('Internes', interns, OPT.sub));
  };
  [sel, colSel].forEach(e => e.addEventListener('change', draw));
  [cEq, cSe, cSub].forEach(c => c.input.addEventListener('change', draw));
  draw();
  // à l'impression, seul le contenu du trombinoscope reste (lien de retour, titre d'écran et réglages sont masqués)
  return h('div', { class: 'col', style: { gap: '14px' } },
    h('div', { class: 'no-print col', style: { gap: '12px' } },
      h('a', { href: '#/admin', class: 'backlink' }, icon('chevron-left', 16), 'Administration'),
      h('h1', { class: 'h1' }, 'Trombinoscope'),
      h('p', { class: 'small muted' }, 'Les photos sont celles des profils. Un compte sans photo apparaît avec ses initiales : la photo se complète dans Comptes, ou l’interne l’ajoute dans « Moi ».'),
      h('div', { class: 'card col', style: { gap: '12px' } }, field('Semestre', sel), cEq, cSe, cSub, field('Mise en page', colSel), info),
      h('button', { class: 'btn primary block', id: 'trombiPrint', onclick: () => window.print() }, icon('download', 18), 'Imprimer / enregistrer en PDF')),
    out);
}
