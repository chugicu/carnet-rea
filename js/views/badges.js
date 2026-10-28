// Badges, silhouette, défis de promo
import { h, icon, fmtDateFull } from '../util.js';
import { S, cfg, stats } from '../store.js';
import { badgeStatus } from '../logic.js';
import { openSheet, confetti, empty, sectionHead } from '../ui.js';
import { silhouette } from '../charts.js';
import { appName } from '../nav.js';

const LEVELS = [[0, 'Recrue'], [0.2, 'Dans le bain'], [0.45, 'Confirmé'], [0.7, 'Presque réanimateur'], [1, 'Réanimateur ★']];
export function levelName(p) { let n = LEVELS[0][1]; LEVELS.forEach(l => { if (p >= l[0]) n = l[1]; }); return n; }

export async function shareBadge(def) {
  const text = '🏅 J’ai débloqué le badge « ' + def.nom + ' » sur ' + appName() + ' !';
  if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
}
function medal(def, size = 54, locked = false) {
  const m = h('span', { class: 'medal', style: { width: size + 'px', height: size + 'px' } }, icon(def.icone || 'star', Math.round(size * 0.5), 2));
  return m;
}
export function openBadge(b) {
  const d = b.def;
  openSheet({
    title: d.nom,
    body: h('div', { class: 'col center', style: { alignItems: 'center', '--c': d.couleur } },
      h('div', { class: 'bdg' + (b.earned ? '' : ' locked'), style: { '--c': d.couleur, border: 0, background: 'none' } }, medal(d, 84)),
      h('p', { class: 'soft' }, d.desc),
      b.earned
        ? h('span', { class: 'pill good' }, 'Débloqué' + (b.row && b.row.ts ? ' le ' + fmtDateFull(b.row.ts) : ''))
        : h('span', { class: 'pill' }, 'Progression : ' + b.prog.v + ' / ' + b.prog.max),
      b.earned ? null : h('div', { class: 'bar', style: { width: '100%', '--c': d.couleur } }, h('i', { style: { width: (b.prog.v * 100) / b.prog.max + '%' } })),
      h('p', { class: 'tiny muted' }, 'Les badges restent privés : toi seul peux les voir. Tu choisis de les partager ou non.')),
    actions: b.earned ? [{ label: 'Partager', kind: 'primary', close: false, onClick: () => { shareBadge(d); return false; } }] : []
  });
}
export function celebrateBadge(defs) {
  const d = defs[0];
  confetti();
  openSheet({
    title: 'Nouveau badge !',
    body: h('div', { class: 'col center reveal', style: { alignItems: 'center' } },
      h('div', { class: 'bdg', style: { '--c': d.couleur, border: 0, background: 'none' } }, medal(d, 96)),
      h('h2', { class: 'h1' }, d.nom), h('p', { class: 'soft' }, d.desc),
      defs.length > 1 ? h('p', { class: 'small muted' }, '+ ' + (defs.length - 1) + ' autre' + (defs.length > 2 ? 's' : '') + ' badge' + (defs.length > 2 ? 's' : '') + ' débloqué' + (defs.length > 2 ? 's' : '') + ' !') : null),
    actions: [{ label: 'Plus tard', kind: 'ghost' }, { label: 'Partager', kind: 'primary', close: false, onClick: () => { shareBadge(d); return false; } }]
  });
}

export function defisBlock() {
  const defs = (cfg('defis') || []).filter(d => d.actif !== false);
  const st = stats();
  if (!defs.length) return null;
  const box = h('div', { class: 'col' });
  box.append(sectionHead('Défis de la promo', 'ensemble'));
  if (!st) { box.append(h('div', { class: 'banner info' }, icon('info', 18), h('span', null, 'Les défis s’afficheront après la première synchronisation.'))); return box; }
  defs.forEach(d => {
    const p = (st.defis || []).find(x => x.id === d.id) || { valeur: 0, cible: d.cible || 0, atteint: false };
    const pct = p.cible ? Math.min(100, (p.valeur * 100) / p.cible) : 0;
    box.append(h('div', { class: 'card defi' + (p.atteint ? ' done' : '') },
      h('div', { class: 'hd' }, h('b', null, d.nom), h('span', { class: 'mono small', style: { color: p.atteint ? 'var(--good)' : 'var(--soft)' } }, p.atteint ? 'Atteint ✓' : p.valeur + ' / ' + p.cible)),
      h('div', { class: 'bar grad' }, h('i', { style: { width: pct + '%' } })),
      h('p', { class: 'small muted', style: { marginTop: '8px' } }, d.desc)));
  });
  return box;
}

export function badgesView() {
  const list = badgeStatus(S.me.id);
  const got = list.filter(b => b.earned).length;
  const pct = list.length ? got / list.length : 0;
  const frag = h('div', { class: 'col', style: { gap: '18px' } });
  frag.append(h('h1', { class: 'h1' }, 'Mes badges'));
  if (cfg('modules').silhouette) {
    frag.append(h('div', { class: 'card pad-l row', style: { gap: '18px' } },
      h('div', { style: { width: '110px', flex: 'none' } }, silhouette(pct, 'bd')),
      h('div', null, h('div', { class: 'h2' }, 'Ton niveau'), h('div', { class: 'h1', style: { fontSize: '22px', margin: '4px 0' } }, levelName(pct)),
        h('p', { class: 'small soft' }, got + ' badge' + (got > 1 ? 's' : '') + ' sur ' + list.length), h('p', { class: 'tiny muted mt-s' }, 'La silhouette se remplit à chaque badge débloqué.'))));
  }
  const sorted = list.slice().sort((a, b) => (b.earned ? 1 : 0) - (a.earned ? 1 : 0));
  frag.append(sorted.length ? h('div', { class: 'badges' }, sorted.map(b => h('button', { class: 'bdg' + (b.earned ? '' : ' locked'), style: { '--c': b.def.couleur }, onclick: () => openBadge(b) },
    medal(b.def), h('span', { class: 'nm' }, b.def.nom), b.earned ? null : h('span', { class: 'tiny muted mono' }, b.prog.v + '/' + b.prog.max)))) : empty('award', 'Aucun badge configuré.'));
  if (cfg('modules').defis) { const d = defisBlock(); if (d) frag.append(d); }
  return frag;
}
