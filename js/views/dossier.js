// Dossier d'un interne (équipe pédagogique, ou tuteur pour ses tutorés)
import { h, icon, clear, fmtDateFull } from '../util.js';
import { S, put, cfg, userById, fullName, seniors, tutees, users, saveUser } from '../store.js';
import { avatar } from '../photo.js';
import { effGestes, premiersState, ktAvant, PREMIERS, gesteDefs, gesteDef, gestesOf, countsByType, breakdown, iotStats, autonomie, objectifsOf, ENTRETIENS, flashOf, retoursOf, semFor, meteoOf } from '../logic.js';
import { empty, sectionHead, segmented, field, selectInput, toast } from '../ui.js';
import { objectifItem, openObjectifEditor, entretienPanel, evolutionCard } from './suivi.js';
import { gesteLine, openGesteSheet, pickGesteSheet } from './gestes.js';
import { meteoHistory } from './moi.js';
import { composeNote, noteLine } from './retours.js';
import { ring } from '../charts.js';
import { go } from '../nav.js';

const tabState = {};
const entState = {};

export function dossierView(uid) {
  const u = userById(uid);
  const isEq = S.me.role === 'equipe';
  if (!u || u.role !== 'interne' || (!isEq && u.tuteurId !== S.me.id)) return h('div', null, empty('lock', 'Dossier introuvable ou non accessible.'), h('a', { class: 'btn', href: isEq ? '#/internes' : '#/tutorat' }, 'Retour'));
  const sem = u.sem || semFor(uid);
  const frag = h('div', { class: 'col', style: { gap: '16px' } });
  frag.append(h('a', { href: isEq ? '#/internes' : '#/tutorat', class: 'backlink' }, icon('chevron-left', 16), isEq ? 'Internes' : 'Mes tutorés'));
  const tut = u.tuteurId ? userById(u.tuteurId) : null;
  const head = h('div', { class: 'card pad-l row', style: { gap: '14px' } }, avatar(u, 'lg'),
    h('div', { class: 'grow' }, h('b', { style: { fontSize: '17px' } }, fullName(u)), h('div', { class: 'small muted' }, [u.specialite, u.rang ? 'semestre ' + u.rang + ' de DES' : null].filter(Boolean).join(' · ') || 'DES non renseigné'), h('div', { class: 'small muted' }, u.email || '')));
  frag.append(head);
  if (isEq) {
    const sel = selectInput([{ v: '', label: 'Aucun tuteur' }].concat(seniors().sort((a, b) => fullName(a).localeCompare(fullName(b), 'fr')).map(s => ({ v: s.id, label: fullName(s) }))), u.tuteurId || '');
    sel.addEventListener('change', () => { saveUser(u, { tuteurId: sel.value }); toast('Tuteur enregistré.'); });
    frag.append(field('Tuteur', sel));
  } else if (tut) frag.append(h('p', { class: 'small muted' }, 'Tuteur : ' + fullName(tut)));

  const tabs = [{ v: 'gestes', label: 'Gestes' }, { v: 'objectifs', label: 'Objectifs' }, { v: 'entretiens', label: 'Entretiens' }, { v: 'meteo', label: 'Météo' }, { v: 'retours', label: 'Retours' }];
  let tab = tabState[uid] || 'gestes';
  const panel = h('div');
  const seg = segmented(tabs, tab, v => { tab = tabState[uid] = v; draw(); });
  seg.style.overflowX = 'auto';
  frag.append(seg, panel);

  function gestesTab() {
    const all = gestesOf(uid, sem), eff = effGestes(all), counts = countsByType(eff);
    const box = h('div', { class: 'col', style: { gap: '14px' } });
    // parcours débutant : nombre de KT posés avant le stage et avancement des tuiles « Premiers »
    const tu = userById(uid);
    Object.keys(PREMIERS).forEach(b => {
      const d = gesteDef(b), pd = gesteDef(PREMIERS[b]), av = ktAvant(tu, b);
      if (!d || !pd || av === null) return;
      const p = premiersState(uid, b);
      box.append(h('div', { class: 'card col', style: { gap: '4px' } },
        h('div', { class: 'row between' }, h('b', null, d.nom + ' posés avant le stage : ' + av), h('span', { class: 'pill ' + (p.done ? 'good' : '') }, p.active ? 'Parcours Premiers en cours' : p.done ? 'Parcours Premiers terminé' : 'Hors parcours Premiers')),
        p.eligible ? h('div', { class: 'small muted' }, 'Réussis à 4 mains ' + Math.min(p.q, p.pc.quatreMains) + '/' + p.pc.quatreMains + ' · supervisés réussis ' + Math.min(p.s, p.pc.supervises) + '/' + p.pc.supervises + ' · ' + p.entries + ' saisie' + (p.entries > 1 ? 's' : '') + ' (échecs compris)') : null,
        isEq ? h('div', { class: 'tiny muted' }, 'Modifiable dans Admin → Comptes.') : null));
    });
    box.append(h('div', { class: 'tiles' }, gesteDefs().map(d => h('div', { class: 'tile', style: { '--c': d.couleur } }, h('div', { class: 'top-r' }, h('span', { class: 'n' }, String(counts[d.id] || 0))), h('span', { class: 'nm' }, d.nom)))));
    gesteDefs().filter(d => d.autonomie || d.resultats).forEach(d => {
      if (d.autonomie) { const a = autonomie(d, eff); box.append(h('div', { class: 'card row between' }, h('span', null, d.nom + ' : supervisés ', h('b', { class: 'mono' }, a.n + '/' + a.seuil)), h('span', { class: 'pill ' + (a.unlocked ? 'good' : '') }, a.unlocked ? 'Autonomie débloquée' : 'En cours'))); }
      if (d.resultats) { const s = iotStats(all, d); box.append(h('div', { class: 'card row' }, ring(s.rate === null ? 0 : s.rate / 100, s.rate === null ? '—' : s.rate + '%', d.couleur, 56), h('div', null, h('b', null, d.nom + ' : taux de réussite'), h('div', { class: 'small muted' }, s.ok + ' réussies · ' + s.ko + ' échecs')))); }
    });
    if (isEq) box.append(h('button', { class: 'btn primary block', onclick: () => pickGesteSheet(uid) }, icon('plus', 18), 'Ajouter un geste pour cet interne'));
    box.append(h('div', null, sectionHead('Historique'), all.length ? h('div', { class: 'card list', style: { padding: '2px 14px' } }, all.map(g => gesteLine(g, { onClick: isEq ? () => openGesteSheet({ def: gesteDef(g.type, uid), row: g, uid }) : null }))) : empty('activity', 'Aucun geste.')));
    return box;
  }
  function objectifsTab() {
    const list = objectifsOf(uid, sem), acq = list.filter(o => o.statut === 'acquis').length;
    const box = h('div', { class: 'col', style: { gap: '14px' } });
    if (list.length) box.append(h('div', { class: 'card' }, h('div', { class: 'row between' }, h('b', null, acq + ' acquis sur ' + list.length)), h('div', { class: 'bar grad', style: { marginTop: '10px' } }, h('i', { style: { width: (acq * 100) / list.length + '%' } }))));
    box.append(list.length ? h('div', { class: 'card list', style: { padding: '2px 14px' } }, list.map(o => objectifItem(o, { onClick: () => openObjectifEditor(uid, o) }))) : empty('target', 'Aucun objectif défini.'));
    box.append(h('button', { class: 'btn primary block', disabled: list.length >= 15, onclick: () => openObjectifEditor(uid, null) }, icon('plus', 18), list.length >= 15 ? '15 objectifs maximum' : 'Ajouter un objectif'));
    return box;
  }
  function entretiensTab() {
    const box = h('div', { class: 'col', style: { gap: '14px' } });
    let sel = entState[uid] || 'debut';
    const p = h('div');
    const draw2 = () => { clear(p); p.append(entretienPanel(uid, sel, isEq ? 'equipe' : null, 'Auto-évaluation')); };
    box.append(segmented(ENTRETIENS.map(e => ({ v: e.id, label: e.court })), sel, v => { sel = entState[uid] = v; draw2(); }), p);
    draw2();
    const ev = evolutionCard(uid); if (ev) box.append(ev);
    return box;
  }
  function meteoTab() {
    const m = meteoOf(uid, sem);
    return h('div', { class: 'col' }, m.length ? meteoHistory(uid, sem) : empty('cloud', 'Aucune météo saisie.'), h('p', { class: 'tiny muted' }, 'Touche une case pour lire le commentaire.'));
  }
  function retoursTab() {
    const fl = flashOf(uid), rt = retoursOf(uid);
    const box = h('div', { class: 'col', style: { gap: '14px' } });
    box.append(h('div', { class: 'row wrap' },
      cfg('modules').flash ? h('button', { class: 'btn', onclick: () => composeNote('flash', uid) }, icon('bolt', 16), 'Flash') : null,
      cfg('modules').retours ? h('button', { class: 'btn', onclick: () => composeNote('retours', uid) }, icon('lock', 16), 'Retour confidentiel') : null));
    box.append(sectionHead('Retours confidentiels', 'jamais visibles de l’interne'));
    box.append(rt.length ? h('div', { class: 'card list', style: { padding: '2px 14px' } }, rt.map(n => noteLine('retours', n, false))) : empty('lock', 'Aucun retour.'));
    box.append(sectionHead('Feedbacks flash'));
    box.append(fl.length ? h('div', { class: 'card list', style: { padding: '2px 14px' } }, fl.map(n => noteLine('flash', n, false))) : empty('bolt', 'Aucun feedback flash.'));
    return box;
  }
  function draw() {
    clear(panel);
    panel.append(tab === 'gestes' ? gestesTab() : tab === 'objectifs' ? objectifsTab() : tab === 'entretiens' ? entretiensTab() : tab === 'meteo' ? meteoTab() : retoursTab());
  }
  draw();
  frag.append(h('a', { class: 'btn block', href: '#/bilan/' + uid }, icon('file', 18), 'Bilan visuel / PDF'));
  return frag;
}
