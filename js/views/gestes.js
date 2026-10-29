// Accueil (tuiles de gestes), saisie rapide, détail et historique
import { h, icon, clear, relDay, fmtDateLong, fmtTimeOf, dayKey, parseDay, uid as newId, isoWeekKey } from '../util.js';
import { S, put, del, cfg, get, isPending, isReadOnly, fullName, userById, curSem, PREM_MODS } from '../store.js';
import { tileDefs, premiersState, effGestes, PREMIERS, gesteDefs, gesteDef, gestesOf, countsByType, autonomie, iotStats, breakdown, gesteName, gesteDetail, semFor, weeklyMeteo, meteoDef, currentWeek, semesterProgress } from '../logic.js';
import { openSheet, toast, field, textInput, textArea, choices, confirmSheet, empty, sectionHead } from '../ui.js';
import { ring } from '../charts.js';
import { go } from '../nav.js';
import { echoCard } from './echo-ui.js';
import { soutienIfAlert } from './soutien.js';

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
    const a = autonomie(def, effGestes(all.filter(g => !row || g.id !== row.id)));
    if (!a.unlocked) lock = a;
  }
  // parcours débutant : « Supervisé » reste verrouillé tant que les réussis à 4 mains n'ont pas atteint le seuil
  let lockSup = null;
  if (mine && def.premierDe) {
    const p = premiersState(uid, def.premierDe, row && row.id);
    if (p.q < p.pc.quatreMains && !(row && row.modalite === PREM_MODS[1])) lockSup = p;
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
    const isSupLocked = m => !!lockSup && m === PREM_MODS[1];
    const opts = def.modalites.map(m => ({ v: m, label: lock && m === def.autonomie.bloque ? m + ' · ' + lock.n + '/' + lock.seuil : isSupLocked(m) ? m + ' · ' + lockSup.q + '/' + lockSup.pc.quatreMains : m, c: def.couleur, disabled: (!!lock && m === def.autonomie.bloque) || isSupLocked(m) }));
    const baseNom = (gesteDef(def.premierDe) || { nom: 'KT' }).nom;
    const hint = lockSup ? 'Encore ' + (lockSup.pc.quatreMains - lockSup.q) + ' ' + baseNom + ' réussi' + (lockSup.pc.quatreMains - lockSup.q > 1 ? 's' : '') + ' à 4 mains pour débloquer « ' + PREM_MODS[1] + ' ».'
      : lock ? 'Encore ' + lock.reste + ' ' + def.nom + ' ' + lock.compte.join(' / ').toLowerCase() + ' pour débloquer « ' + def.autonomie.bloque + ' ».' : null;
    body.append(field('Modalité', choices(opts, st.modalite, v => { st.modalite = v; refresh(); }), hint));
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
    body: h('div', { class: 'tiles' }, tileDefs(uid || S.me.id).map(d => h('button', { class: 'tile', style: { '--c': d.couleur }, onclick: () => { sh.close(); addGeste(d, uid); } },
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
  if (!cur || cur.niveau !== niveau) soutienIfAlert(def); // niveau d'alerte : rappel bienveillant avec les ressources de soutien
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
/** Parcours débutant : avancement « à 4 mains » puis « supervisés » */
function premiersCard(def, uid) {
  const p = premiersState(uid, def.premierDe), pc = p.pc, c = def.couleur;
  const step = (label, n, max) => h('div', null,
    h('div', { class: 'row between' }, h('span', { class: 'small', style: { fontWeight: 600 } }, label), h('span', { class: 'mono small', style: { color: c } }, Math.min(n, max) + ' / ' + max)),
    h('div', { class: 'prog' }, Array.from({ length: max }, (_, i) => h('span', { class: i < n ? 'on' : '' }))));
  const base = gesteDef(def.premierDe), plur = n => (n > 1 ? 's' : '');
  const next = p.q < pc.quatreMains
    ? 'Encore ' + (pc.quatreMains - p.q) + ' ' + (base ? base.nom : 'KT') + ' réussi' + plur(pc.quatreMains - p.q) + ' à 4 mains pour débloquer « Supervisé ».'
    : 'Encore ' + (pc.supervises - p.s) + ' supervisé' + plur(pc.supervises - p.s) + ' réussi' + plur(pc.supervises - p.s) + ' pour passer à la tuile ' + (base ? base.nom : '') + '. Tes ' + pc.comptes + ' premiers réussis compteront dans ton total.';
  return h('div', { class: 'card col', style: { '--c': c, gap: '10px' } },
    h('b', { class: 'small' }, def.nom + ' · ton parcours'),
    step('Réussis à 4 mains', p.q, pc.quatreMains), step('Supervisés réussis', p.s, pc.supervises),
    h('p', { class: 'small soft' }, next));
}
function autonomieCard(def, gestes, uid) {
  const a = autonomie(def, gestes);
  const pst = uid && PREMIERS[def.id] ? premiersState(uid, def.id) : null;
  const c = def.couleur;
  const autoN = gestes.filter(g => g.type === def.id && g.modalite === a.bloque).length;
  return h('div', { class: 'card', style: { '--c': c } },
    h('div', { class: 'row between' },
      h('span', { class: 'small', style: { fontWeight: 600 } }, def.nom + ' · vers l\'autonomie'),
      h('span', { class: 'mono small', style: { color: c } }, a.unlocked ? 'Autonome débloqué' : a.n + ' / ' + a.seuil + ' supervisés')),
    h('div', { class: 'prog' }, Array.from({ length: a.seuil }, (_, i) => h('span', { class: i < a.n ? 'on' : '' }))),
    pst && pst.done ? h('p', { class: 'tiny muted', style: { marginTop: '8px' } }, 'Parcours « Premiers ' + def.nom + ' » terminé : tes ' + pst.ok + ' premiers ' + def.nom + ' réussis sont comptés dans ce total.') : null,
    h('p', { class: 'small soft', style: { marginTop: '8px' } }, a.unlocked ? (autoN ? autoN + ' ' + def.nom + ' en autonomie.' : 'Tu peux maintenant enregistrer des ' + def.nom + ' en autonomie.') : 'Encore ' + a.reste + ' ' + def.nom + ' supervisé' + (a.reste > 1 ? 's' : '') + ' pour débloquer le compteur « ' + a.bloque.toLowerCase() + ' ».'));
}
export function gesteLine(g, o = {}) {
  const d = gesteDef(g.type, g.uid);
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
  const eff = effGestes(all);
  const counts = countsByType(eff);
  const defs = tileDefs(uid);
  const cnt = d => (d.premierDe ? all.filter(g => g.type === d.id).length : counts[d.id] || 0);
  const ro = isReadOnly();
  const frag = h('div', { class: 'col gap-l', style: { gap: '18px' } });
  frag.append(h('h1', { class: 'h1' }, 'Bonjour ' + (me.prenom || '')));
  if (ro) frag.append(h('div', { class: 'banner info' }, icon('lock', 18), h('span', null, 'Semestre archivé : tu peux consulter tes données mais plus les modifier.')));
  const accueil = (cfg('textes') || {}).accueil;
  if (accueil) frag.append(h('div', { class: 'banner info' }, icon('info', 18), h('span', null, accueil)));
  const sp = semesterProgress(me.sem);
  if (sp && sp.before) frag.append(h('div', { class: 'banner info' }, icon('calendar', 18), h('span', null, 'Ton stage commence le ' + fmtDateLong(parseDay(sp.s.debut).getTime()) + '.')));
  if (cfg('modules').meteo && !ro) frag.append(meteoRow());
  const ec = echoCard(); if (ec) frag.append(ec);
  frag.append(h('div', null,
    sectionHead('Ajouter un geste', '1 tap = 1 geste'),
    h('div', { class: 'tiles' }, defs.map(d => h('div', { class: 'tile', style: { '--c': d.couleur } },
      h('button', { class: 'tile-body', 'aria-label': d.nom + ' : ' + cnt(d) + '. Voir le détail', onclick: () => go('/gestes/' + d.id) }),
      h('div', { class: 'top-r' }, h('span', { class: 'n' }, String(cnt(d))), ro ? null : h('button', { class: 'plus', 'aria-label': 'Ajouter ' + d.nom, onclick: () => addGeste(d) }, icon('plus', 16, 3))),
      h('span', { class: 'nm' }, d.nom))))));
  const withAuto = defs.filter(d => d.autonomie || d.premierDe);
  if (withAuto.length) frag.append(h('div', { class: 'col' }, withAuto.map(d => (d.premierDe ? premiersCard(d, uid) : autonomieCard(d, eff, uid)))));
  const last = all.slice(0, 5);
  frag.append(h('div', null,
    sectionHead('Derniers gestes', all.length ? h('a', { href: '#/gestes/all', class: 'small' }, 'Tout l’historique') : null),
    last.length ? h('div', { class: 'card list', style: { padding: '2px 14px' } }, last.map(g => gesteLine(g, { onClick: ro ? null : () => openGesteSheet({ def: gesteDef(g.type, g.uid), row: g }) }))) : empty('activity', 'Aucun geste pour l’instant. Appuie sur « + » dès ton premier geste.')));
  return frag;
}

/* ---------- Détail d'un geste ---------- */
export function gesteDetailView(type) {
  const def = gesteDef(type, S.me.id);
  if (!def) return h('div', null, empty('info', 'Geste introuvable.'), h('a', { class: 'btn', href: '#/gestes' }, 'Retour'));
  const all = gestesOf(S.me.id);
  const eff = effGestes(all);
  const list = all.filter(g => g.type === def.id || (!def.premierDe && g.type === PREMIERS[def.id]));
  const total = def.premierDe ? list.length : eff.filter(g => g.type === def.id).length;
  const ro = isReadOnly();
  const frag = h('div', { class: 'col gap-l', style: { '--c': def.couleur, gap: '18px' } });
  frag.append(h('a', { href: '#/gestes', class: 'backlink' }, icon('chevron-left', 16), 'Gestes'));
  frag.append(h('div', { class: 'row between' },
    h('div', null, h('h1', { class: 'h1' }, def.nom), h('p', { class: 'small muted' }, def.nomLong || '')),
    h('span', { class: 'mono', style: { fontSize: '44px', fontWeight: 700, color: def.couleur, lineHeight: 1 } }, String(total))));
  if (def.resultats && def.resultats.length) {
    const s = iotStats(all, def);
    frag.append(h('div', { class: 'card row' }, ring(s.rate === null ? 0 : s.rate / 100, s.rate === null ? '—' : s.rate + '%', def.couleur, 72),
      h('div', null, h('b', null, 'Taux de réussite'), h('p', { class: 'small muted' }, s.ok + ' ' + def.resultats[0].toLowerCase() + (s.ok > 1 ? 's' : '') + ' · ' + s.ko + ' ' + def.resultats[1].toLowerCase() + (s.ko > 1 ? 's' : '')))));
  }
  if (def.premierDe) frag.append(premiersCard(def, S.me.id));
  else if (def.autonomie) frag.append(autonomieCard(def, eff, S.me.id));
  breakdown(def, def.premierDe ? all : eff).forEach(b => {
    const max = Math.max(1, ...b.items.map(i => i.n));
    frag.append(h('div', { class: 'card col' }, h('div', { class: 'h2' }, b.titre),
      b.items.map(i => h('div', null, h('div', { class: 'row between small' }, h('span', null, i.label), h('span', { class: 'mono' }, String(i.n))), h('div', { class: 'bar', style: { marginTop: '4px', '--c': def.couleur } }, h('i', { style: { width: (i.n / max) * 100 + '%' } }))))));
  });
  const stBase = PREMIERS[def.id] ? premiersState(S.me.id, def.id) : null;
  const stPrem = def.premierDe ? premiersState(S.me.id, def.premierDe) : null;
  if (!ro) {
    if (stBase && stBase.active) frag.append(h('a', { class: 'btn primary block', href: '#/gestes/' + PREMIERS[def.id] }, 'Tu es dans le parcours « Premiers ' + def.nom + ' » : ouvrir')); // KTC / KTA pas encore débloqué
    else if (stPrem && !stPrem.active) frag.append(h('div', { class: 'banner info' }, icon('info', 18), h('span', null, stPrem.done ? 'Parcours terminé : utilise maintenant la tuile ' + (gesteDef(def.premierDe) || {}).nom + '.' : 'Ce parcours ne te concerne pas : utilise la tuile ' + (gesteDef(def.premierDe) || {}).nom + '.')));
    else frag.append(h('button', { class: 'btn primary block', onclick: () => addGeste(def) }, icon('plus', 18, 2.5), 'Ajouter un ' + def.nom));
  }
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
    const list = filter ? all.filter(g => g.type === filter || g.type === PREMIERS[filter]) : all;
    const chips = h('div', { class: 'row wrap', style: { marginBottom: '12px' } },
      h('button', { class: 'chip' + (!filter ? ' on' : ''), onclick: () => { filter = ''; draw(); } }, 'Tous · ' + all.length),
      gesteDefs().map(d => h('button', { class: 'chip' + (filter === d.id ? ' on' : ''), style: { '--c': d.couleur }, onclick: () => { filter = d.id; draw(); } }, h('i', { class: 'swatch' }), d.nom)));
    box.append(chips);
    box.append(list.length ? h('div', { class: 'card list', style: { padding: '2px 14px' } }, list.map(g => gesteLine(g, { onClick: ro ? null : () => openGesteSheet({ def: gesteDef(g.type, g.uid), row: g }) }))) : empty('activity', 'Rien à afficher.'));
  };
  draw();
  return h('div', { class: 'col' }, h('a', { href: '#/gestes', class: 'backlink' }, icon('chevron-left', 16), 'Gestes'), h('h1', { class: 'h1' }, 'Historique'), box);
}
