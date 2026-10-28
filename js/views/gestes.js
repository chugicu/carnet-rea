// Accueil (tuiles de gestes), saisie rapide, détail et historique
import { h, icon, clear, relDay, fmtDateLong, fmtTimeOf, dayKey, parseDay, uid as newId, isoWeekKey } from '../util.js';
import { S, put, del, cfg, get, isPending, isReadOnly, fullName, userById, curSem } from '../store.js';
import { gesteDefs, gesteDef, gestesOf, countsByType, autonomie, iotStats, breakdown, gesteName, gesteDetail, semFor, weeklyMeteo, meteoDef, currentWeek, semesterProgress } from '../logic.js';
import { openSheet, toast, field, textInput, textArea, choices, confirmSheet, empty, sectionHead } from '../ui.js';
import { ring } from '../charts.js';
import { go } from '../nav.js';

/* ---------- Saisie / édition d'un geste ---------- */
export function openGesteSheet({ def, row, uid }) {
  uid = uid || (row && row.uid) || S.me.id;
  const target = userById(uid) || S.me;
  const sem = row ? row.sem : target.sem || curSem();
  const mine = S.me.role === 'interne';
  const all = gestesOf(uid, sem);
  const lastOfType = all.find(g => g.type === def.id && (!row || g.id !== row.id));
  const st = {
    site: row ? row.site : (lastOfType && def.sites && def.sites.indexOf(lastOfType.site) >= 0 ? lastOfType.site : ''),
    modalite: row ? row.modalite : '',
    resultat: row ? row.resultat : '',
    nom: row ? row.nom : '',
    commentaire: row ? row.commentaire : '',
    date: row ? dayKey(row.ts) : dayKey()
  };
  // règle d'autonomie : mode « Autonome » verrouillé tant que le seuil n'est pas atteint
  let lock = null;
  if (mine && def.autonomie) {
    const a = autonomie(def, all.filter(g => !row || g.id !== row.id));
    if (!a.unlocked) lock = a;
  }
  if (!row && def.modalites) {
    const prefer = lastOfType && def.modalites.indexOf(lastOfType.modalite) >= 0 && !(lock && lastOfType.modalite === def.autonomie.bloque) ? lastOfType.modalite : def.modalites[0];
    st.modalite = prefer;
  }
  const dims = [def.sites && def.sites.length, def.modalites && def.modalites.length, def.resultats && def.resultats.length].filter(Boolean).length;
  const instant = !row && dims === 1 && !!(def.resultats && def.resultats.length) && !def.libre;
  const body = h('div', { class: 'col gap-l' });
  const saveBtnLabel = () => (row ? 'Enregistrer' : 'Ajouter') + [st.site, st.modalite, st.resultat].filter(Boolean).map(s => ' · ' + s).join('');
  let sh;
  const complete = () => (!def.sites || !def.sites.length || st.site) && (!def.modalites || !def.modalites.length || st.modalite) && (!def.resultats || !def.resultats.length || st.resultat) && (!def.libre || st.nom.trim());
  const refresh = () => {
    if (!sh || !sh.actions) return;
    sh.actions.save.el.textContent = saveBtnLabel();
    sh.actions.save.el.disabled = !complete();
  };

  if (def.libre) {
    const nom = textInput({ value: st.nom, placeholder: 'Ex. : voie veineuse centrale tunnelisée', max: 60 });
    nom.addEventListener('input', () => { st.nom = nom.value; refresh(); });
    body.append(field('Quel geste ?', nom));
  }
  if (def.sites && def.sites.length) {
    const c = choices(def.sites.map(s => ({ v: s, label: s, c: def.couleur })), st.site, v => { st.site = v; refresh(); });
    body.append(field('Site', c));
  }
  if (def.modalites && def.modalites.length) {
    const opts = def.modalites.map(m => ({ v: m, label: lock && m === def.autonomie.bloque ? m + ' · ' + lock.n + '/' + lock.seuil : m, c: def.couleur, disabled: !!lock && m === def.autonomie.bloque }));
    body.append(field('Modalité', choices(opts, st.modalite, v => { st.modalite = v; refresh(); }),
      lock ? 'Encore ' + lock.reste + ' ' + def.nom + ' ' + lock.compte.join(' / ').toLowerCase() + ' pour débloquer « ' + def.autonomie.bloque + ' ».' : null));
  }
  if (def.resultats && def.resultats.length) {
    const colors = { 0: 'var(--good)', 1: 'var(--bad)' };
    const c = choices(def.resultats.map((r, i) => ({ v: r, label: r, c: colors[i] || def.couleur })), st.resultat, v => {
      st.resultat = v; refresh();
      if (instant) setTimeout(() => sh.actions.save.el.click(), 120);
    });
    body.append(field('Résultat', c));
  }
  // détails facultatifs
  const com = textArea({ value: st.commentaire, placeholder: 'Difficulté, complication, remarque… (sans donnée patient)', max: 500, rows: 2 });
  com.addEventListener('input', () => (st.commentaire = com.value));
  const dateIn = textInput({ type: 'date', value: st.date });
  dateIn.max = dayKey();
  dateIn.addEventListener('change', () => (st.date = dateIn.value || dayKey()));
  const more = h('details', { class: 'card', open: !!(row && (row.commentaire || dayKey(row.ts) !== dayKey())) },
    h('summary', { style: { fontWeight: 600, cursor: 'pointer' } }, 'Commentaire et date'),
    h('div', { class: 'col mt-s' }, field('Commentaire', com), field('Date du geste', dateIn)),
  );
  body.append(more);
  body.append(h('p', { class: 'tiny muted' }, cfg('textes').gestes));

  const actions = {};
  const list = [];
  if (row) list.push({ label: 'Supprimer', kind: 'danger', onClick: async () => {
    if (!await confirmSheet({ title: 'Supprimer ce geste ?', text: gesteName(row) + ' du ' + fmtDateLong(row.ts) + '.', ok: 'Supprimer', danger: true })) return false;
    del('gestes', row.id); toast('Geste supprimé.');
  } });
  list.push({ label: saveBtnLabel(), kind: 'primary', disabled: !complete(), onClick: () => {
    if (!complete()) return false;
    let ts = row ? row.ts : Date.now();
    if (st.date !== (row ? dayKey(row.ts) : dayKey())) ts = parseDay(st.date).getTime();
    const id = row ? row.id : newId();
    put('gestes', { id, uid, sem, type: def.id, site: st.site || '', modalite: st.modalite || '', resultat: st.resultat || '', nom: def.libre ? st.nom.trim() : '', commentaire: st.commentaire.trim(), ts });
    if (row) toast('Geste modifié.');
    else toast(def.nom + ' ajouté', { action: { label: 'Annuler', fn: () => del('gestes', id) } });
  } });
  sh = openSheet({ title: (row ? 'Modifier · ' : '') + def.nom + (def.nomLong ? ' — ' + def.nomLong : ''), body, actions: list });
  sh.actions = { save: list[list.length - 1] };
  if (instant) sh.foot.hidden = true;
  return sh;
}

/** 1 tap : les gestes sans option s'ajoutent immédiatement */
export function addGeste(def, uid) {
  if (isReadOnly() && S.me.role === 'interne') { toast('Semestre archivé : lecture seule.', { err: true }); return; }
  const noOpt = !(def.sites && def.sites.length) && !(def.modalites && def.modalites.length) && !(def.resultats && def.resultats.length) && !def.libre;
  if (!noOpt) { openGesteSheet({ def, uid }); return; }
  const target = uid || S.me.id;
  const id = newId();
  put('gestes', { id, uid: target, sem: (userById(target) || S.me).sem || curSem(), type: def.id, site: '', modalite: '', resultat: '', nom: '', commentaire: '', ts: Date.now() });
  toast(def.nom + ' ajouté', { action: { label: 'Annuler', fn: () => del('gestes', id) } });
}

export function pickGesteSheet(uid) {
  const sh = openSheet({
    title: 'Ajouter un geste',
    body: h('div', { class: 'tiles' }, gesteDefs().map(d => h('button', { class: 'tile', style: { '--c': d.couleur }, onclick: () => { sh.close(); addGeste(d, uid); } },
      h('span', { class: 'top-r' }, h('span', { class: 'plus' }, icon('plus', 16, 3))), h('span', { class: 'nm' }, d.nom))))
  });
}

/* ---------- Météo de la semaine ---------- */
export function openMeteoComment(m) {
  const t = textArea({ value: m.commentaire || '', placeholder: 'Un mot pour expliquer ? (facultatif)', max: 300, autofocus: true });
  openSheet({
    title: 'Un mot sur ta semaine',
    body: h('div', { class: 'col' }, t, h('p', { class: 'tiny muted' }, cfg('meteo').mention)),
    actions: [{ label: 'Enregistrer', kind: 'primary', onClick: () => { put('meteo', Object.assign({}, m, { commentaire: t.value.trim() })); toast('Merci !'); } }]
  });
}
export function saveMeteo(niveau) {
  const week = currentWeek();
  const id = S.me.id + '_' + week;
  const cur = get('meteo', id);
  const row = put('meteo', { id, uid: S.me.id, sem: S.me.sem, semaine: week, niveau, commentaire: cur ? cur.commentaire : '', extra: false, ts: cur ? cur.ts : Date.now() });
  const def = meteoDef(niveau);
  toast(def ? def.nom + ' · météo enregistrée' : 'Météo enregistrée', { action: { label: 'Ajouter un mot', fn: () => openMeteoComment(row) } });
}
export function meteoRow() {
  const week = currentWeek();
  const cur = weeklyMeteo(S.me.id, week, S.me.sem);
  const niveaux = (cfg('meteo').niveaux || []);
  const ro = isReadOnly();
  return h('div', null,
    h('div', { class: 'meteo-row' },
      h('span', { class: 'small soft' }, cur ? 'Ta météo de la semaine' : 'Ta météo de la semaine ?'),
      h('div', { class: 'meteo-btns' }, niveaux.map(n => h('button', { class: 'mbtn', style: { '--c': n.couleur }, 'aria-pressed': String(!!cur && cur.niveau === n.id), 'aria-label': n.nom, title: n.nom, disabled: ro, onclick: () => saveMeteo(n.id) }, icon(n.icone || 'cloud', 22))))),
    h('p', { class: 'tiny muted', style: { marginTop: '6px', padding: '0 4px' } }, cfg('meteo').mention));
}

/* ---------- Accueil ---------- */
function autonomieCard(def, gestes) {
  const a = autonomie(def, gestes);
  const c = def.couleur;
  const autoN = gestes.filter(g => g.type === def.id && g.modalite === a.bloque).length;
  return h('div', { class: 'card', style: { '--c': c } },
    h('div', { class: 'row between' },
      h('span', { class: 'small', style: { fontWeight: 600 } }, def.nom + ' · vers l\'autonomie'),
      h('span', { class: 'mono small', style: { color: c } }, a.unlocked ? 'Autonome débloqué' : a.n + ' / ' + a.seuil + ' supervisés')),
    h('div', { class: 'prog' }, Array.from({ length: a.seuil }, (_, i) => h('span', { class: i < a.n ? 'on' : '' }))),
    h('p', { class: 'small soft', style: { marginTop: '8px' } }, a.unlocked ? (autoN ? autoN + ' ' + def.nom + ' en autonomie.' : 'Tu peux maintenant enregistrer des ' + def.nom + ' en autonomie.') : 'Encore ' + a.reste + ' ' + def.nom + ' supervisé' + (a.reste > 1 ? 's' : '') + ' pour débloquer le compteur « ' + a.bloque.toLowerCase() + ' ».'));
}
export function gesteLine(g, o = {}) {
  const d = gesteDef(g.type);
  const det = gesteDetail(g);
  const resCls = d && d.resultats && g.resultat ? (g.resultat === d.resultats[0] ? 'ok' : 'ko') : '';
  return h(o.onClick ? 'button' : 'div', { class: 'geste-line item', style: { '--c': d ? d.couleur : 'var(--muted)', minHeight: '54px', width: '100%' }, onclick: o.onClick },
    h('span', { class: 'dot' }),
    h('span', { class: 'tx' }, h('b', null, gesteName(g)), h('span', null, [o.who ? fullName(userById(g.uid)) : null, det, relDay(g.ts), g.commentaire ? '💬' : null].filter(Boolean).join(' · '))),
    resCls ? h('span', { class: 'res ' + resCls }, g.resultat) : null,
    isPending('gestes', g.id) ? h('span', { class: 'pending-tag', title: 'En attente de synchronisation' }) : null,
    o.onClick ? icon('chevron-right', 18) : null);
}

export function gestesHome() {
  const me = S.me, uid = me.id;
  const all = gestesOf(uid);
  const counts = countsByType(all);
  const defs = gesteDefs();
  const ro = isReadOnly();
  const frag = h('div', { class: 'col gap-l', style: { gap: '18px' } });
  frag.append(h('h1', { class: 'h1' }, 'Bonjour ' + (me.prenom || '')));
  if (ro) frag.append(h('div', { class: 'banner info' }, icon('lock', 18), h('span', null, 'Semestre archivé : tu peux consulter tes données mais plus les modifier.')));
  const accueil = (cfg('textes') || {}).accueil;
  if (accueil) frag.append(h('div', { class: 'banner info' }, icon('info', 18), h('span', null, accueil)));
  const sp = semesterProgress(me.sem);
  if (sp && sp.before) frag.append(h('div', { class: 'banner info' }, icon('calendar', 18), h('span', null, 'Ton stage commence le ' + fmtDateLong(parseDay(sp.s.debut).getTime()) + '.')));
  if (cfg('modules').meteo && !ro) frag.append(meteoRow());
  frag.append(h('div', null,
    sectionHead('Ajouter un geste', '1 tap = 1 geste'),
    h('div', { class: 'tiles' }, defs.map(d => h('div', { class: 'tile', style: { '--c': d.couleur } },
      h('button', { class: 'tile-body', 'aria-label': d.nom + ' : ' + (counts[d.id] || 0) + '. Voir le détail', onclick: () => go('/gestes/' + d.id) }),
      h('div', { class: 'top-r' }, h('span', { class: 'n' }, String(counts[d.id] || 0)), ro ? null : h('button', { class: 'plus', 'aria-label': 'Ajouter ' + d.nom, onclick: () => addGeste(d) }, icon('plus', 16, 3))),
      h('span', { class: 'nm' }, d.nom))))));
  const withAuto = defs.filter(d => d.autonomie);
  if (withAuto.length) frag.append(h('div', { class: 'col' }, withAuto.map(d => autonomieCard(d, all))));
  const last = all.slice(0, 5);
  frag.append(h('div', null,
    sectionHead('Derniers gestes', all.length ? h('a', { href: '#/gestes/all', class: 'small' }, 'Tout l’historique') : null),
    last.length ? h('div', { class: 'card list', style: { padding: '2px 14px' } }, last.map(g => gesteLine(g, { onClick: ro ? null : () => openGesteSheet({ def: gesteDef(g.type), row: g }) }))) : empty('activity', 'Aucun geste pour l’instant. Appuie sur « + » dès ton premier geste.')));
  return frag;
}

/* ---------- Détail d'un geste ---------- */
export function gesteDetailView(type) {
  const def = gesteDef(type);
  if (!def) return h('div', null, empty('info', 'Geste introuvable.'), h('a', { class: 'btn', href: '#/gestes' }, 'Retour'));
  const all = gestesOf(S.me.id);
  const list = all.filter(g => g.type === def.id);
  const ro = isReadOnly();
  const frag = h('div', { class: 'col gap-l', style: { '--c': def.couleur, gap: '18px' } });
  frag.append(h('a', { href: '#/gestes', class: 'backlink' }, icon('chevron-left', 16), 'Gestes'));
  frag.append(h('div', { class: 'row between' },
    h('div', null, h('h1', { class: 'h1' }, def.nom), h('p', { class: 'small muted' }, def.nomLong || '')),
    h('span', { class: 'mono', style: { fontSize: '44px', fontWeight: 700, color: def.couleur, lineHeight: 1 } }, String(list.length))));
  if (def.resultats && def.resultats.length) {
    const s = iotStats(all, def);
    frag.append(h('div', { class: 'card row' }, ring(s.rate === null ? 0 : s.rate / 100, s.rate === null ? '—' : s.rate + '%', def.couleur, 72),
      h('div', null, h('b', null, 'Taux de réussite'), h('p', { class: 'small muted' }, s.ok + ' ' + def.resultats[0].toLowerCase() + (s.ok > 1 ? 's' : '') + ' · ' + s.ko + ' ' + def.resultats[1].toLowerCase() + (s.ko > 1 ? 's' : '')))));
  }
  if (def.autonomie) frag.append(autonomieCard(def, all));
  breakdown(def, all).forEach(b => {
    const max = Math.max(1, ...b.items.map(i => i.n));
    frag.append(h('div', { class: 'card col' }, h('div', { class: 'h2' }, b.titre),
      b.items.map(i => h('div', null, h('div', { class: 'row between small' }, h('span', null, i.label), h('span', { class: 'mono' }, String(i.n))), h('div', { class: 'bar', style: { marginTop: '4px', '--c': def.couleur } }, h('i', { style: { width: (i.n / max) * 100 + '%' } }))))));
  });
  if (!ro) frag.append(h('button', { class: 'btn primary block', onclick: () => addGeste(def) }, icon('plus', 18, 2.5), 'Ajouter un ' + def.nom));
  frag.append(h('div', null, sectionHead('Historique'),
    list.length ? h('div', { class: 'card list', style: { padding: '2px 14px' } }, list.map(g => gesteLine(g, { onClick: ro ? null : () => openGesteSheet({ def, row: g }) }))) : empty('activity', 'Aucun ' + def.nom + ' enregistré.')));
  return frag;
}

/* ---------- Historique complet ---------- */
export function historiqueView() {
  const all = gestesOf(S.me.id);
  const ro = isReadOnly();
  let filter = '';
  const box = h('div');
  const draw = () => {
    clear(box);
    const list = filter ? all.filter(g => g.type === filter) : all;
    const chips = h('div', { class: 'row wrap', style: { marginBottom: '12px' } },
      h('button', { class: 'chip' + (!filter ? ' on' : ''), onclick: () => { filter = ''; draw(); } }, 'Tous · ' + all.length),
      gesteDefs().map(d => h('button', { class: 'chip' + (filter === d.id ? ' on' : ''), style: { '--c': d.couleur }, onclick: () => { filter = d.id; draw(); } }, h('i', { class: 'swatch' }), d.nom)));
    box.append(chips);
    box.append(list.length ? h('div', { class: 'card list', style: { padding: '2px 14px' } }, list.map(g => gesteLine(g, { onClick: ro ? null : () => openGesteSheet({ def: gesteDef(g.type), row: g }) }))) : empty('activity', 'Rien à afficher.'));
  };
  draw();
  return h('div', { class: 'col' }, h('a', { href: '#/gestes', class: 'backlink' }, icon('chevron-left', 16), 'Gestes'), h('h1', { class: 'h1' }, 'Historique'), box);
}
