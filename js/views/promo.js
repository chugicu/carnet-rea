// Vues promo : tableau de bord équipe, liste des internes, vue senior, tutorat
import { h, icon, clear, relDay, download, toCSV, dayKey, addDays, isoWeekKey, fmtDate, debounce } from '../util.js';
import { S, all, cfg, users, interns, fullName, desLabel, userById, tutees, stats, put } from '../store.js';
import { avatar } from '../photo.js';
import { effGestes, gesteDefs, gesteDef, countsByType, iotStats, breakdown, gesteName, gesteDetail, objectifsOf, meteoOf, meteoDef, currentWeek, weeklyMeteo, flashOf } from '../logic.js';
import { empty, sectionHead, textInput, toast } from '../ui.js';
import { barsChart } from '../charts.js';
import { defisBlock } from './badges.js';
import { composeNote } from './retours.js';
import { gesteLine } from './gestes.js';
import { echoCard } from './echo-ui.js';

export const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const byName = (a, b) => norm(a.nom + a.prenom).localeCompare(norm(b.nom + b.prenom));

export function gestesByUser() {
  const cur = cfg('semestreCourant');
  const m = new Map();
  all('gestes').forEach(g => { if (g.sem === cur) { if (!m.has(g.uid)) m.set(g.uid, []); m.get(g.uid).push(g); } });
  m.forEach(l => l.sort((a, b) => b.ts - a.ts));
  return m;
}
export function countChips(counts) {
  const chips = gesteDefs().filter(d => counts[d.id]).map(d => h('span', { class: 'chip', style: { '--c': d.couleur } }, h('i', { class: 'swatch' }), d.nom + ' ' + counts[d.id]));
  return chips.length ? h('div', { class: 'row wrap', style: { gap: '6px' } }, chips) : h('span', { class: 'tiny muted' }, 'Aucun geste');
}
const VS = {}; // recherche conservée quand l'écran est redessiné (synchronisation) ou quand on revient d'un dossier
function searchBox(onInput, key) {
  const s = textInput({ placeholder: 'Rechercher un interne…', type: 'search', value: VS[key] || '' });
  s.addEventListener('input', debounce(() => { VS[key] = s.value; onInput(s.value); }, 120));
  return s;
}

/* ---------- Senior : promo (compteurs uniquement) ---------- */
export function seniorPromoView() {
  const list = interns().sort(byName);
  const gm = gestesByUser();
  const frag = h('div', { class: 'col', style: { gap: '14px' } });
  frag.append(h('h1', { class: 'h1' }, 'Promo'), h('p', { class: 'small muted' }, 'Compteurs de gestes de chaque interne. Touche un nom pour laisser un retour.'));
  const ec = echoCard(); if (ec) frag.append(ec);
  const box = h('div');
  const draw = q => {
    clear(box);
    const l = list.filter(u => !q || norm(fullName(u) + ' ' + (u.specialite || '')).includes(norm(q)));
    box.append(l.length ? h('div', { class: 'card list', style: { padding: '2px 14px' } }, l.map(u => {
      const g = gm.get(u.id) || [];
      return h('a', { class: 'item', href: '#/promo/' + u.id, style: { textDecoration: 'none', color: 'inherit', alignItems: 'flex-start' } },
        avatar(u, 'sm'),
        h('span', { class: 'tx' }, h('b', null, fullName(u)), h('span', null, [desLabel(u), 'total ' + g.length].filter(Boolean).join(' · ')), h('div', { style: { marginTop: '6px' } }, countChips(countsByType(effGestes(g))))),
        icon('chevron-right', 16));
    })) : empty('users', 'Aucun interne trouvé.'));
  };
  frag.append(searchBox(draw, 'senior'), box);
  draw(VS['senior'] || '');
  return frag;
}

export function seniorInternView(uid) {
  const u = userById(uid);
  if (!u || u.role !== 'interne') return empty('info', 'Interne introuvable.');
  const g = (gestesByUser().get(uid) || []);
  const counts = countsByType(effGestes(g));
  const isTutee = u.tuteurId === S.me.id;
  const frag = h('div', { class: 'col', style: { gap: '16px' } });
  frag.append(h('a', { href: '#/promo', class: 'backlink' }, icon('chevron-left', 16), 'Promo'));
  frag.append(h('div', { class: 'row', style: { gap: '12px' } }, avatar(u), h('div', null, h('h1', { class: 'h1', style: { fontSize: '22px' } }, fullName(u)), h('div', { class: 'small muted' }, [u.specialite, u.rang ? 'semestre ' + u.rang + ' de DES' : null].filter(Boolean).join(' · ') || 'DES non renseigné'))));
  frag.append(h('div', { class: 'tiles' }, gesteDefs().map(d => h('div', { class: 'tile', style: { '--c': d.couleur } }, h('div', { class: 'top-r' }, h('span', { class: 'n' }, String(counts[d.id] || 0))), h('span', { class: 'nm' }, d.nom)))));
  const row = h('div', { class: 'col' });
  if (cfg('modules').flash) row.append(h('button', { class: 'btn block', onclick: () => composeNote('flash', uid) }, icon('bolt', 18), 'Laisser un feedback flash (anonyme)'));
  if (cfg('modules').retours) row.append(h('button', { class: 'btn block', onclick: () => composeNote('retours', uid) }, icon('lock', 18), 'Retour confidentiel à l’équipe'));
  if (isTutee) row.append(h('a', { class: 'btn primary block', href: '#/dossier/' + uid }, icon('user', 18), 'Dossier complet (tutorat)'));
  frag.append(row);
  const gl = g.slice(0, 12);
  if (gl.length) frag.append(h('div', null, sectionHead('Derniers gestes'), h('div', { class: 'card list', style: { padding: '2px 14px' } }, gl.map(x => gesteLine(x)))));
  return frag;
}

export function tutoratView() {
  const list = tutees(S.me.id).sort(byName);
  const gm = gestesByUser();
  const frag = h('div', { class: 'col', style: { gap: '14px' } });
  frag.append(h('h1', { class: 'h1' }, 'Mes tutorés'));
  frag.append(list.length ? h('div', { class: 'card list', style: { padding: '2px 14px' } }, list.map(u => h('a', { class: 'item', href: '#/dossier/' + u.id, style: { textDecoration: 'none', color: 'inherit' } },
    avatar(u, 'sm'), h('span', { class: 'tx' }, h('b', null, fullName(u)), h('span', null, [desLabel(u), (gm.get(u.id) || []).length + ' gestes'].filter(Boolean).join(' · '))), icon('chevron-right', 16)))) : empty('users', 'Aucun interne ne t’a été confié pour ce semestre.'));
  return frag;
}

/* ---------- Équipe : tableau de bord ---------- */
function weeklyCounts(gestes, n) {
  const today = new Date();
  const weeks = [];
  for (let i = n - 1; i >= 0; i--) weeks.push(isoWeekKey(addDays(today, -7 * i)));
  const map = {}; weeks.forEach(w => (map[w] = 0));
  gestes.forEach(g => { const k = isoWeekKey(new Date(g.ts)); if (k in map) map[k]++; });
  return { weeks, values: weeks.map(w => map[w]) };
}
export function equipePromoView() {
  const list = interns().sort(byName);
  const gm = gestesByUser();
  const cur = currentWeek();
  const allG = [].concat(...Array.from(gm.values()));
  const frag = h('div', { class: 'col', style: { gap: '18px' } });
  frag.append(h('h1', { class: 'h1' }, 'Promo'));
  const ec = echoCard(); if (ec) frag.append(ec);
  const iotDef = gesteDefs().find(d => d.resultats && d.resultats.length);
  const iot = iotDef ? iotStats(allG, iotDef) : null;
  const meteoN = list.filter(u => weeklyMeteo(u.id, cur, cfg('semestreCourant'))).length;
  frag.append(h('div', { class: 'kpis' },
    h('div', { class: 'kpi' }, h('div', { class: 'v' }, String(list.length)), h('div', { class: 'l' }, 'internes')),
    h('div', { class: 'kpi' }, h('div', { class: 'v' }, String(allG.length)), h('div', { class: 'l' }, 'gestes')),
    iot ? h('div', { class: 'kpi' }, h('div', { class: 'v' }, iot.rate === null ? '—' : iot.rate + ' %'), h('div', { class: 'l' }, iotDef.nom + ' réussies')) : null,
    cfg('modules').meteo ? h('div', { class: 'kpi' }, h('div', { class: 'v' }, meteoN + '/' + list.length), h('div', { class: 'l' }, 'météos cette semaine')) : null));

  // à surveiller
  const watch = [];
  list.forEach(u => {
    const m = weeklyMeteo(u.id, cur, cfg('semestreCourant')) || meteoOf(u.id, cfg('semestreCourant')).find(x => x.semaine === cur);
    const d = m && meteoDef(m.niveau);
    if (d && d.alerte) watch.push({ u, kind: 'meteo', d, m });
    const g = gm.get(u.id) || [];
    const last = Math.max(0, ...g.map(x => x.ts), ...meteoOf(u.id, cfg('semestreCourant')).map(x => x.ts));
    const semStart = new Date((cfg('semestres').find(s => s.id === cfg('semestreCourant')) || {}).debut + 'T12:00:00').getTime();
    if (Date.now() - Math.max(last, semStart) > 14 * 864e5 && Date.now() > semStart + 14 * 864e5) watch.push({ u, kind: 'inactif', since: last });
  });
  frag.append(h('div', null, sectionHead('À surveiller', watch.length ? String(watch.length) : null),
    watch.length ? h('div', { class: 'card list', style: { padding: '2px 14px' } }, watch.map(w => h('a', { class: 'item', href: '#/dossier/' + w.u.id, style: { textDecoration: 'none', color: 'inherit' } },
      w.kind === 'meteo' ? icon(w.d.icone, 22) : icon('clock', 22),
      h('span', { class: 'tx' }, h('b', null, fullName(w.u)), h('span', null, w.kind === 'meteo' ? w.d.nom + ' cette semaine' + (w.m.commentaire ? ' · « ' + w.m.commentaire + ' »' : '') : (w.since ? 'Aucune saisie depuis le ' + fmtDate(w.since) : 'Aucune saisie depuis le début du stage'))),
      icon('chevron-right', 16)))) : h('div', { class: 'card small muted' }, 'Rien à signaler pour le moment.')));

  if (cfg('modules').defis) { const d = defisBlock(); if (d) frag.append(d); }

  // gestes par type + histogramme hebdomadaire
  const counts = countsByType([].concat(...Array.from(gm.values()).map(effGestes)));
  const max = Math.max(1, ...gesteDefs().map(d => counts[d.id] || 0));
  frag.append(h('div', { class: 'card col' }, h('div', { class: 'h2' }, 'Gestes de la promo'),
    gesteDefs().map(d => h('div', null, h('div', { class: 'row between small' }, h('span', null, d.nom), h('span', { class: 'mono' }, String(counts[d.id] || 0))), h('div', { class: 'bar', style: { '--c': d.couleur, marginTop: '4px' } }, h('i', { style: { width: ((counts[d.id] || 0) / max) * 100 + '%' } }))))));
  const wc = weeklyCounts(allG, 12);
  frag.append(h('div', { class: 'card' }, h('div', { class: 'h2' }, 'Gestes par semaine (12 dernières)'), barsChart(wc.values, wc.weeks.map(w => w.split('-W')[1].replace(/^0/, ''))), h('div', { class: 'tiny muted center' }, 'numéro de semaine')));
  frag.append(h('div', { class: 'row wrap' }, h('a', { class: 'btn', href: '#/internes' }, icon('users', 16), 'Internes'), h('a', { class: 'btn', href: '#/retours' }, icon('message', 16), 'Retours'), h('a', { class: 'btn', href: '#/admin' }, icon('sliders', 16), 'Administration')));
  return frag;
}

/* ---------- Équipe : liste des internes ---------- */
export function exportPromoCSV() {
  const defs = gesteDefs();
  const gm = gestesByUser();
  const head = ['Nom', 'Prénom', 'E-mail', 'DES d’origine', 'Semestre de DES', 'Tuteur'].concat(defs.map(d => d.nom), ['IOT réussies', 'IOT échecs', 'Objectifs acquis', 'Objectifs total']);
  const rows = interns().sort(byName).map(u => {
    const g = gm.get(u.id) || [], c = countsByType(effGestes(g)), s = iotDef(g), o = objectifsOf(u.id), tut = u.tuteurId ? fullName(userById(u.tuteurId)) : '';
    return [u.nom, u.prenom, u.email || '', u.specialite || '', u.rang || '', tut].concat(defs.map(d => c[d.id] || 0), [s.ok, s.ko, o.filter(x => x.statut === 'acquis').length, o.length]);
  });
  download('promo-' + cfg('semestreCourant') + '.csv', toCSV([head].concat(rows)));
}
function iotDef(g) { const d = gesteDefs().find(x => x.resultats && x.resultats.length); return d ? iotStats(g, d) : { ok: 0, ko: 0 }; }
export function exportGestesCSV() {
  const gm = gestesByUser();
  const rows = [['Interne', 'Date', 'Geste', 'Précision', 'Site', 'Modalité', 'Résultat', 'Commentaire']];
  interns().sort(byName).forEach(u => (gm.get(u.id) || []).slice().reverse().forEach(g => rows.push([fullName(u), dayKey(g.ts), gesteName(g), g.nom || '', g.site, g.modalite, g.resultat, g.commentaire])));
  download('gestes-' + cfg('semestreCourant') + '.csv', toCSV(rows));
}

export function internesView() {
  const list = interns().sort(byName);
  const gm = gestesByUser();
  const cur = currentWeek();
  const frag = h('div', { class: 'col', style: { gap: '14px' } });
  frag.append(h('div', { class: 'row between' }, h('h1', { class: 'h1' }, 'Internes'), h('div', { class: 'row' },
    h('button', { class: 'iconbtn', 'aria-label': 'Exporter les compteurs (CSV)', title: 'Exporter les compteurs (CSV)', onclick: exportPromoCSV }, icon('download', 18)),
    h('a', { class: 'iconbtn', href: '#/admin/users', 'aria-label': 'Ajouter des comptes' }, icon('plus', 18)))));
  const box = h('div');
  const draw = q => {
    clear(box);
    const l = list.filter(u => !q || norm(fullName(u) + ' ' + (u.specialite || '')).includes(norm(q)));
    box.append(l.length ? h('div', { class: 'card list', style: { padding: '2px 14px' } }, l.map(u => {
      const g = gm.get(u.id) || [];
      const o = objectifsOf(u.id), acq = o.filter(x => x.statut === 'acquis').length;
      const m = weeklyMeteo(u.id, cur, cfg('semestreCourant'));
      const d = m && meteoDef(m.niveau);
      const tut = u.tuteurId ? userById(u.tuteurId) : null;
      return h('a', { class: 'item', href: '#/dossier/' + u.id, style: { textDecoration: 'none', color: 'inherit' } },
        avatar(u, 'sm'),
        h('span', { class: 'tx' }, h('b', null, fullName(u)), h('span', null, [desLabel(u), tut ? 'tuteur : ' + fullName(tut) : null].filter(Boolean).join(' · ')), h('span', null, g.length + ' gestes' + (o.length ? ' · objectifs ' + acq + '/' + o.length : ''))),
        d ? h('span', { style: { color: d.couleur }, title: d.nom }, icon(d.icone, 22)) : null, icon('chevron-right', 16));
    })) : empty('users', list.length ? 'Aucun résultat.' : 'Aucun interne inscrit pour ce semestre.'));
  };
  frag.append(searchBox(draw, 'internes'), box);
  draw(VS['internes'] || '');
  return frag;
}
