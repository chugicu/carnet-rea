// Bilan visuel (consultable à tout moment) + version imprimable / PDF de fin de stage
import { h, icon, fmtDateFull, fmtDate, dayKey } from '../util.js';
import { S, cfg, userById, fullName, semInfo } from '../store.js';
import { gesteDefs, gestesOf, countsByType, breakdown, iotStats, autonomie, objectifsOf, entretienOf, ENTRETIENS, statutNom, radarCfg, meteoOf, meteoDef, semesterWeeks, weekLabel, badgeStatus, semFor } from '../logic.js';
import { radarChart, legend, C_AUTO } from '../charts.js';
import { statDot } from './suivi.js';
import { appName, appLogo } from '../nav.js';
import { go } from '../nav.js';

function section(title, ...kids) {
  return h('section', { class: 'bilan-page' }, h('h2', { class: 'h3', style: { marginBottom: '10px' } }, title), ...kids);
}

export function bilanView(uid) {
  const u = userById(uid);
  if (!u) return h('div', { class: 'empty' }, 'Interne introuvable.');
  const own = uid === S.me.id;
  const sem = u.sem || semFor(uid);
  const si = semInfo(sem);
  const all = gestesOf(uid, sem);
  const counts = countsByType(all);
  const defs = gesteDefs();
  const objs = objectifsOf(uid, sem);
  const acq = objs.filter(o => o.statut === 'acquis').length;
  const tut = u.tuteurId ? userById(u.tuteurId) : null;
  const R = radarCfg();
  const frag = h('div', { class: 'col', style: { gap: '16px' } });

  frag.append(h('div', { class: 'no-print row between' },
    h('a', { href: own ? '#/moi' : '#/dossier/' + uid, class: 'backlink' }, icon('chevron-left', 16), 'Retour'),
    h('button', { class: 'btn primary sm', onclick: () => window.print() }, icon('download', 16), 'Imprimer / PDF')));

  frag.append(h('header', { class: 'bilan-page' },
    h('div', { class: 'row', style: { gap: '14px' } }, h('img', { src: appLogo(), alt: '', style: { width: '56px', height: '56px', objectFit: 'contain', borderRadius: '14px', background: '#fff', padding: '3px' } }),
      h('div', null, h('div', { class: 'h2' }, appName() + (cfg('app').service ? ' · ' + cfg('app').service : '')), h('h1', { class: 'h1', style: { fontSize: '24px' } }, 'Bilan de stage'))),
    h('div', { class: 'grad-line', style: { margin: '12px 0' } }),
    h('div', { class: 'row wrap', style: { gap: '18px' } },
      h('div', null, h('div', { class: 'tiny muted' }, 'Interne'), h('b', null, fullName(u))),
      own ? null : h('div', null, h('div', { class: 'tiny muted' }, 'DES d’origine'), h('b', null, [u.specialite, u.rang ? 'semestre ' + u.rang : null].filter(Boolean).join(' · ') || '—')),
      h('div', null, h('div', { class: 'tiny muted' }, 'Période'), h('b', null, si ? si.nom : sem)),
      tut ? h('div', null, h('div', { class: 'tiny muted' }, 'Tuteur'), h('b', null, fullName(tut))) : null,
      h('div', null, h('div', { class: 'tiny muted' }, 'Édité le'), h('b', null, fmtDateFull(Date.now()))))));

  frag.append(h('div', { class: 'kpis' },
    h('div', { class: 'kpi' }, h('div', { class: 'v' }, String(all.length)), h('div', { class: 'l' }, 'gestes enregistrés')),
    (() => { const d = defs.find(x => x.resultats && x.resultats.length); if (!d) return null; const s = iotStats(all, d); return h('div', { class: 'kpi' }, h('div', { class: 'v' }, s.rate === null ? '—' : s.rate + ' %'), h('div', { class: 'l' }, d.nom + ' réussies (' + s.ok + '/' + (s.ok + s.ko) + ')')); })(),
    h('div', { class: 'kpi' }, h('div', { class: 'v' }, objs.length ? acq + '/' + objs.length : '—'), h('div', { class: 'l' }, 'objectifs acquis')),
    h('div', { class: 'kpi' }, h('div', { class: 'v' }, ENTRETIENS.filter(t => { const e = entretienOf(uid, t.id); return e && e.fait; }).length + '/3'), h('div', { class: 'l' }, 'entretiens réalisés'))));

  // gestes
  frag.append(section('Gestes techniques', h('table', { class: 'tbl' },
    h('thead', null, h('tr', null, h('th', null, 'Geste'), h('th', { class: 'num' }, 'Total'), h('th', null, 'Détail'))),
    h('tbody', null, defs.map(d => {
      const parts = [];
      breakdown(d, all).forEach(b => parts.push(b.items.filter(i => i.n).map(i => i.label + ' ' + i.n).join(', ')));
      const a = d.autonomie ? autonomie(d, all) : null;
      const det = parts.filter(Boolean).join(' · ') + (a ? (parts.some(Boolean) ? ' · ' : '') + (a.unlocked ? 'autonomie débloquée' : a.n + '/' + a.seuil + ' supervisés') : '');
      return h('tr', null, h('td', null, h('b', { style: { color: d.couleur } }, '● '), d.nom), h('td', { class: 'num' }, String(counts[d.id] || 0)), h('td', { style: { whiteSpace: 'normal' }, class: 'small' }, det || '—'));
    })))));

  // objectifs
  if (cfg('modules').objectifs) {
    frag.append(section('Objectifs', objs.length ? h('div', { class: 'list' }, objs.map(o => h('div', { class: 'obj' }, statDot(o.statut), h('div', { class: 'tx' }, h('b', null, o.texte), h('div', { class: 'small muted' }, statutNom(o.statut)), o.commentaire ? h('div', { class: 'cm' }, o.commentaire) : null, o.autoCommentaire ? h('div', { class: 'cm me' }, 'Interne : ' + o.autoCommentaire) : null)))) : h('p', { class: 'muted' }, 'Aucun objectif défini.')));
  }

  // entretiens
  if (cfg('modules').radar) {
    ENTRETIENS.forEach(t => {
      const e = entretienOf(uid, t.id);
      if (!e || (!(e.auto && Object.keys(e.auto).length) && !(e.evalu && Object.keys(e.evalu).length) && !e.commentaire)) return;
      frag.append(section('Entretien · ' + t.nom + (e.date ? ' (' + fmtDateFull(e.date) + ')' : ''),
        radarChart([{ color: C_AUTO, values: e.auto }, { color: 'var(--accent)', values: e.evalu }]),
        legend([{ color: C_AUTO, label: 'Auto-évaluation' }, { color: 'var(--accent)', label: 'Équipe' }]),
        h('table', { class: 'tbl', style: { marginTop: '10px' } }, h('thead', null, h('tr', null, h('th', null, 'Axe'), h('th', { class: 'num' }, 'Auto'), h('th', { class: 'num' }, 'Équipe'))),
          h('tbody', null, R.axes.map(a => h('tr', null, h('td', { style: { whiteSpace: 'normal' } }, a.nom), h('td', { class: 'num' }, (e.auto && e.auto[a.id]) || '—'), h('td', { class: 'num' }, (e.evalu && e.evalu[a.id]) || '—'))))),
        e.commentaire ? h('div', { class: 'cm', style: { marginTop: '10px', borderLeft: '3px solid var(--line2)', paddingLeft: '10px' } }, h('b', null, 'Équipe : '), e.commentaire) : null,
        e.autoCommentaire ? h('div', { class: 'cm me', style: { marginTop: '8px', borderLeft: '3px solid var(--sky)', paddingLeft: '10px' } }, h('b', null, 'Interne : '), e.autoCommentaire) : null));
    });
  }

  // météo
  if (cfg('modules').meteo) {
    const ms = meteoOf(uid, sem).filter(m => !m.extra);
    if (ms.length) {
      const by = new Map(ms.map(m => [m.semaine, m]));
      frag.append(section('Météo des semaines', h('div', { class: 'weeks' }, semesterWeeks(sem).map(w => { const m = by.get(w); const d = m && meteoDef(m.niveau); return h('div', { class: 'wk' + (m ? '' : ' empty'), style: { '--c': d ? d.couleur : 'var(--line2)' }, title: weekLabel(w) }, d ? icon(d.icone, 16) : null); })),
        h('div', { class: 'legend', style: { marginTop: '10px' } }, (cfg('meteo').niveaux || []).map(n => h('span', null, h('i', { style: { background: n.couleur } }), n.nom)))));
    }
  }

  // badges (visibles uniquement par l'interne lui-même)
  if (own && cfg('modules').badges) {
    const got = badgeStatus(uid).filter(b => b.earned);
    if (got.length) frag.append(section('Badges', h('div', { class: 'row wrap' }, got.map(b => h('span', { class: 'chip on', style: { borderColor: b.def.couleur } }, icon(b.def.icone, 14), b.def.nom)))));
  }
  frag.append(h('p', { class: 'tiny muted center' }, 'Document généré par ' + appName() + ' le ' + fmtDateFull(Date.now()) + '. Ne contient aucune donnée patient.'));
  return frag;
}
