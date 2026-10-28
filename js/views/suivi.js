// Objectifs et entretiens (radar A–E)
import { h, icon, clear, fmtDateFull, dayKey, uid as newId } from '../util.js';
import { S, put, del, cfg, get, isReadOnly, fullName, userById, curSem } from '../store.js';
import { objectifsOf, entretienOf, entretienId, ENTRETIENS, STATUTS, statutNom, radarCfg, radarComplete, semFor } from '../logic.js';
import { openSheet, toast, field, textArea, textInput, choices, segmented, checkbox, confirmSheet, empty, sectionHead } from '../ui.js';
import { radarChart, legend, C_AUTO, C_EQUIPE } from '../charts.js';

const STATUT_COL = { afaire: 'var(--muted)', encours: '#FFA96B', acquis: '#5EE0A0' };

export function statDot(statut, size) {
  const d = h('span', { class: 'stat-dot ' + (statut || 'afaire'), title: statutNom(statut), style: size ? { width: size + 'px', height: size + 'px' } : null });
  if (statut === 'acquis') d.append(icon('check', 14, 3));
  return d;
}

/* ---------- Objectifs : ligne et éditeurs ---------- */
export function objectifItem(o, opts = {}) {
  return h(opts.onClick ? 'button' : 'div', { class: 'obj', style: { width: '100%', textAlign: 'left', background: 'none', border: 0, color: 'inherit' }, onclick: opts.onClick },
    statDot(o.statut),
    h('div', { class: 'tx' },
      h('b', null, o.texte),
      h('div', { class: 'small muted' }, statutNom(o.statut) + (o.autoStatut && o.autoStatut !== o.statut ? ' · selon toi : ' + statutNom(o.autoStatut).toLowerCase() : '')),
      o.commentaire ? h('div', { class: 'cm' }, o.commentaire) : null,
      o.autoCommentaire ? h('div', { class: 'cm me' }, o.autoCommentaire) : null),
    opts.onClick ? icon('chevron-right', 18) : null);
}

export function openObjectifAuto(o) {
  const st = { s: o.autoStatut || '' };
  const c = choices(STATUTS.map(s => ({ v: s.id, label: s.nom, c: STATUT_COL[s.id] })), st.s, v => (st.s = v));
  const t = textArea({ value: o.autoCommentaire || '', placeholder: 'Où en es-tu ? Qu’est-ce qui t’a aidé, ou bloqué ?', max: 600 });
  openSheet({
    title: 'Mon point sur l’objectif',
    body: h('div', { class: 'col' }, h('p', { class: 'soft' }, o.texte), field('Mon auto-évaluation', c), field('Commentaire', t),
      o.commentaire ? h('div', { class: 'cm' }, 'Équipe / tuteur : ' + o.commentaire) : null,
      h('p', { class: 'tiny muted' }, 'Le statut officiel (« ' + statutNom(o.statut) + ' ») est défini par l’équipe ou ton tuteur.')),
    actions: [{ label: 'Enregistrer', kind: 'primary', onClick: () => { put('objectifs', { id: o.id, autoStatut: st.s, autoCommentaire: t.value.trim() }); toast('Enregistré.'); } }]
  });
}

/** Création / édition par l'équipe ou le tuteur */
export function openObjectifEditor(uid, o) {
  const st = { s: o ? o.statut : 'afaire' };
  const texte = textArea({ value: o ? o.texte : '', placeholder: 'Ex. : Poser un KTC jugulaire en autonomie', max: 300, rows: 2, autofocus: true });
  const c = choices(STATUTS.map(s => ({ v: s.id, label: s.nom, c: STATUT_COL[s.id] })), st.s, v => (st.s = v));
  const com = textArea({ value: o ? o.commentaire : '', placeholder: 'Commentaire visible par l’interne', max: 600 });
  const n = objectifsOf(uid).length;
  const actions = [];
  if (o) actions.push({ label: 'Supprimer', kind: 'danger', onClick: async () => { if (!await confirmSheet({ title: 'Supprimer cet objectif ?', text: o.texte, ok: 'Supprimer', danger: true })) return false; del('objectifs', o.id); } });
  actions.push({ label: 'Enregistrer', kind: 'primary', onClick: () => {
    if (!texte.value.trim()) { toast('Écris l’objectif.', { err: true }); return false; }
    if (!o && n >= 15) { toast('15 objectifs maximum par interne.', { err: true }); return false; }
    const u = userById(uid);
    put('objectifs', { id: o ? o.id : newId(), uid, sem: o ? o.sem : (u && u.sem) || curSem(), texte: texte.value.trim(), statut: st.s, commentaire: com.value.trim(), ordre: o ? o.ordre : n + 1 });
  } });
  openSheet({ title: o ? 'Modifier l’objectif' : 'Nouvel objectif', body: h('div', { class: 'col' }, field('Objectif', texte), field('Statut', c), field('Commentaire', com)), actions });
}

export function objectifsView() {
  const uid = S.me.id;
  const list = objectifsOf(uid);
  const ro = isReadOnly();
  const acq = list.filter(o => o.statut === 'acquis').length;
  const frag = h('div', { class: 'col', style: { gap: '16px' } });
  frag.append(h('h1', { class: 'h1' }, 'Mes objectifs'));
  if (!list.length) {
    frag.append(empty('target', 'Tes objectifs seront fixés avec l’équipe pédagogique ou ton tuteur lors de l’entretien de début de stage.'));
    return frag;
  }
  frag.append(h('div', { class: 'card' },
    h('div', { class: 'row between' }, h('b', null, acq + ' acquis sur ' + list.length), h('span', { class: 'mono small muted' }, Math.round((acq * 100) / list.length) + ' %')),
    h('div', { class: 'bar grad', style: { marginTop: '10px' } }, h('i', { style: { width: (acq * 100) / list.length + '%' } }))));
  frag.append(h('div', { class: 'card list', style: { padding: '2px 14px' } }, list.map(o => objectifItem(o, { onClick: ro ? null : () => openObjectifAuto(o) }))));
  frag.append(h('p', { class: 'tiny muted' }, 'Touche un objectif pour donner ton propre point d’étape. Le statut officiel est défini par l’équipe ou ton tuteur.'));
  return frag;
}

/* ---------- Entretiens : auto-évaluation et évaluation de l'équipe ---------- */
function lettersRow(current, onPick) {
  const e = radarCfg().echelle;
  let val = current || '';
  const wrap = h('div', { class: 'col', style: { gap: '6px' } });
  const row = h('div', { class: 'letters' });
  const lab = h('div', { class: 'small muted center', style: { minHeight: '18px' } });
  const btns = e.map(x => {
    const b = h('button', { type: 'button', 'aria-pressed': String(val === x.l), 'aria-label': x.l + ' ' + x.label, onclick: () => { val = x.l; set(); if (onPick) onPick(x.l); } }, x.l);
    row.append(b); return b;
  });
  const set = () => { btns.forEach((b, i) => b.setAttribute('aria-pressed', String(e[i].l === val))); const f = e.find(x => x.l === val); lab.textContent = f ? f.label : ''; };
  set();
  wrap.append(row, lab);
  wrap.get = () => val;
  return wrap;
}

export function openAutoEval(uid, type) {
  const R = radarCfg();
  const sem = semFor(uid);
  const ex = entretienOf(uid, type) || {};
  const vals = Object.assign({}, ex.auto || {});
  let step = 0;
  const total = R.axes.length + 1;
  let comment = ex.autoCommentaire || '';
  const sh = openSheet({ title: 'Mon auto-évaluation', body: h('div'), actions: [] });
  const save = () => {
    put('entretiens', { id: entretienId(uid, sem, type), uid, sem, type, auto: vals, autoCommentaire: comment });
    toast('Auto-évaluation enregistrée.');
    sh.close();
  };
  const draw = () => {
    const dots = h('div', { class: 'step-dots' }, Array.from({ length: total }, (_, i) => h('i', { class: i <= step ? 'on' : '' })));
    if (step < R.axes.length) {
      const a = R.axes[step];
      const lr = lettersRow(vals[a.id], l => (vals[a.id] = l));
      sh.setBody(h('div', { class: 'col gap-l' }, dots,
        h('div', null, h('div', { class: 'h2' }, 'Axe ' + (step + 1) + ' sur ' + R.axes.length), h('h3', { class: 'h1', style: { fontSize: '22px', marginTop: '6px' } }, a.nom)),
        lr,
        h('div', { class: 'small muted' }, R.echelle.map(x => x.l + ' = ' + x.label).join(' · '))));
      sh.setActions([
        { label: 'Retour', kind: 'ghost', disabled: step === 0, close: false, onClick: () => { step--; draw(); return false; } },
        { label: 'Suivant', kind: 'primary', close: false, onClick: () => { if (!vals[a.id]) { toast('Choisis une lettre.', { err: true }); return false; } step++; draw(); return false; } }
      ]);
    } else {
      const t = textArea({ value: comment, placeholder: 'Ce que tu veux dire sur ton stage, tes besoins, tes difficultés…', max: 1000, rows: 5 });
      t.addEventListener('input', () => (comment = t.value));
      sh.setBody(h('div', { class: 'col gap-l' }, dots, field('Commentaire général (facultatif)', t),
        h('div', { class: 'card small' }, R.axes.map(a => h('div', { class: 'row between' }, h('span', null, a.court || a.nom), h('b', { class: 'mono' }, vals[a.id] || '—'))))));
      sh.setActions([
        { label: 'Retour', kind: 'ghost', close: false, onClick: () => { step--; draw(); return false; } },
        { label: 'Enregistrer', kind: 'primary', close: false, onClick: save }
      ]);
    }
  };
  draw();
}

export function openEquipeEval(uid, type) {
  const R = radarCfg();
  const sem = semFor(uid);
  const ex = entretienOf(uid, type) || {};
  const vals = Object.assign({}, ex.evalu || {});
  const date = textInput({ type: 'date', value: ex.date || '' });
  const com = textArea({ value: ex.commentaire || '', placeholder: 'Synthèse de l’entretien, points forts, axes de progrès…', max: 2000, rows: 5 });
  const fait = checkbox('Entretien réalisé', ex.fait);
  const rows = R.axes.map(a => { const lr = lettersRow(vals[a.id], l => (vals[a.id] = l)); return h('div', { class: 'col', style: { gap: '6px' } }, h('b', null, a.nom), lr); });
  openSheet({
    title: 'Entretien · ' + ENTRETIENS.find(e => e.id === type).nom,
    body: h('div', { class: 'col gap-l' }, field('Date de l’entretien', date), ...rows, field('Commentaire général', com), fait),
    actions: [{ label: 'Enregistrer', kind: 'primary', onClick: () => {
      let snapshot = ex.snapshot || null;
      if (fait.input.checked && (!snapshot || !ex.fait)) snapshot = objectifsOf(uid).map(o => ({ id: o.id, texte: o.texte, statut: o.statut, commentaire: o.commentaire }));
      put('entretiens', { id: entretienId(uid, sem, type), uid, sem, type, date: date.value || '', evalu: vals, commentaire: com.value.trim(), fait: fait.input.checked, snapshot });
      toast('Entretien enregistré.');
    } }]
  });
}

/** Panneau d'un entretien : radar + lettres + commentaires. who = 'me' | 'equipe' | null (lecture) */
export function entretienPanel(uid, type, who, name) {
  const R = radarCfg();
  const e = entretienOf(uid, type);
  const ro = isReadOnly() && who === 'me';
  const box = h('div', { class: 'col', style: { gap: '14px' } });
  const series = [{ name: 'Toi', color: C_AUTO, values: e && e.auto }, { name: 'Équipe', color: C_EQUIPE, values: e && e.evalu }];
  box.append(h('div', { class: 'card pad-l' }, radarChart(series), legend([{ color: C_AUTO, label: who === 'me' ? 'Mon auto-évaluation' : (name || 'Auto-évaluation') }, { color: 'var(--accent)', label: 'Équipe' }])));
  box.append(h('div', { class: 'card' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'Axe'), h('th', { class: 'num' }, who === 'me' ? 'Moi' : 'Auto'), h('th', { class: 'num' }, 'Équipe'))),
    h('tbody', null, R.axes.map(a => h('tr', null, h('td', { style: { whiteSpace: 'normal' } }, a.nom), h('td', { class: 'num' }, (e && e.auto && e.auto[a.id]) || '—'), h('td', { class: 'num' }, (e && e.evalu && e.evalu[a.id]) || '—')))))));
  const meta = [];
  if (e && e.date) meta.push(h('span', { class: 'pill' }, icon('calendar', 12), ' ' + fmtDateFull(e.date)));
  if (e && e.fait) meta.push(h('span', { class: 'pill good' }, 'Entretien réalisé'));
  if (meta.length) box.append(h('div', { class: 'row wrap' }, meta));
  if (e && e.commentaire) box.append(h('div', { class: 'card' }, h('div', { class: 'h2' }, 'Commentaire de l’équipe'), h('p', { class: 'soft', style: { whiteSpace: 'pre-wrap', marginTop: '6px' } }, e.commentaire)));
  if (e && e.autoCommentaire) box.append(h('div', { class: 'card' }, h('div', { class: 'h2' }, who === 'me' ? 'Mon commentaire' : 'Commentaire de l’interne'), h('p', { class: 'soft', style: { whiteSpace: 'pre-wrap', marginTop: '6px' } }, e.autoCommentaire)));
  if (e && e.snapshot && e.snapshot.length) {
    box.append(h('details', { class: 'card' }, h('summary', { style: { fontWeight: 600, cursor: 'pointer' } }, 'Objectifs à la date de l’entretien (' + e.snapshot.length + ')'),
      h('div', { class: 'list mt-s' }, e.snapshot.map(o => h('div', { class: 'obj' }, statDot(o.statut), h('div', { class: 'tx' }, h('b', null, o.texte), o.commentaire ? h('div', { class: 'cm' }, o.commentaire) : null))))));
  }
  if (who === 'me' && !ro) box.append(h('button', { class: 'btn primary block', onclick: () => openAutoEval(uid, type) }, icon('edit', 18), e && radarComplete(e.auto) ? 'Modifier mon auto-évaluation' : 'Faire mon auto-évaluation'));
  if (who === 'equipe') box.append(h('button', { class: 'btn primary block', onclick: () => openEquipeEval(uid, type) }, icon('edit', 18), e && e.evalu ? 'Modifier l’évaluation de l’équipe' : 'Évaluer (entretien)'));
  return box;
}

export function evolutionCard(uid) {
  const R = radarCfg();
  const es = ENTRETIENS.map(t => entretienOf(uid, t.id));
  if (!es.some(e => e && e.evalu && Object.keys(e.evalu).length)) return null;
  return h('div', { class: 'card' }, h('div', { class: 'h2' }, 'Évolution (évaluation de l’équipe)'),
    h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'Axe'), ENTRETIENS.map(t => h('th', { class: 'num' }, t.court)))),
      h('tbody', null, R.axes.map(a => h('tr', null, h('td', { style: { whiteSpace: 'normal' } }, a.court || a.nom), es.map(e => h('td', { class: 'num' }, (e && e.evalu && e.evalu[a.id]) || '—')))))));
}

let radarSel = 'debut';
export function radarView() {
  const uid = S.me.id;
  const frag = h('div', { class: 'col', style: { gap: '16px' } });
  frag.append(h('h1', { class: 'h1' }, 'Mon radar'));
  const panel = h('div');
  const draw = () => { clear(panel); panel.append(entretienPanel(uid, radarSel, 'me')); };
  const seg = segmented(ENTRETIENS.map(e => ({ v: e.id, label: e.court })), radarSel, v => { radarSel = v; draw(); });
  frag.append(seg, panel);
  draw();
  const ev = evolutionCard(uid);
  if (ev) frag.append(ev);
  frag.append(h('a', { class: 'btn block', href: '#/bilan' }, icon('file', 18), 'Mon bilan visuel'));
  return frag;
}
