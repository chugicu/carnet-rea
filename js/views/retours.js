// Feedbacks flash (anonymes pour l'interne) et retours confidentiels (équipe + tuteur)
import { h, icon, clear, relDay, uid as newId } from '../util.js';
import { S, put, del, all, cfg, interns, userById, fullName } from '../store.js';
import { openSheet, toast, field, textArea, selectInput, confirmSheet, empty } from '../ui.js';

const INFO = {
  flash: 'Anonyme pour l’interne : il verra ton message sans ton nom. Ton nom reste visible de l’équipe pédagogique.',
  retours: 'Confidentiel : visible uniquement de l’équipe pédagogique et du tuteur de l’interne, avec ton nom. Jamais visible de l’interne.'
};
const TITRE = { flash: 'Feedback flash', retours: 'Retour confidentiel' };

export function composeNote(kind, uid) {
  const list = interns().sort((a, b) => fullName(a).localeCompare(fullName(b), 'fr'));
  const sel = uid ? null : selectInput([{ v: '', label: 'Choisir un interne…' }].concat(list.map(u => ({ v: u.id, label: fullName(u) }))), '');
  const t = textArea({ placeholder: kind === 'flash' ? 'Un conseil, un encouragement, un point à travailler… (sans donnée patient)' : 'Ce que l’équipe pédagogique doit savoir… (sans donnée patient)', max: 1000, rows: 5, autofocus: !!uid });
  const target = uid ? userById(uid) : null;
  openSheet({
    title: TITRE[kind] + (target ? ' · ' + fullName(target) : ''),
    body: h('div', { class: 'col' }, sel ? field('Interne', sel) : null, field('Message', t), h('div', { class: 'banner info' }, icon(kind === 'flash' ? 'bolt' : 'lock', 18), h('span', null, INFO[kind]))),
    actions: [{ label: 'Envoyer', kind: 'primary', onClick: () => {
      const u = uid || (sel && sel.value);
      if (!u) { toast('Choisis un interne.', { err: true }); return false; }
      if (!t.value.trim()) { toast('Écris un message.', { err: true }); return false; }
      put(kind, { id: newId(), uid: u, auteur: S.me.id, sem: cfg('semestreCourant'), texte: t.value.trim(), ts: Date.now() });
      toast('Envoyé, merci !');
    } }]
  });
}

function openNote(kind, n) {
  const who = userById(n.uid);
  openSheet({
    title: TITRE[kind],
    body: h('div', { class: 'col' }, h('p', { class: 'small muted' }, 'Pour ' + fullName(who) + ' · ' + relDay(n.ts) + (n.auteur ? ' · de ' + fullName(userById(n.auteur)) : '')), h('p', { style: { whiteSpace: 'pre-wrap' } }, n.texte)),
    actions: S.me.role === 'equipe' ? [{ label: 'Supprimer', kind: 'danger', onClick: async () => { if (!await confirmSheet({ title: 'Supprimer ce message ?', text: 'Cette action est définitive.', ok: 'Supprimer', danger: true })) return false; del(kind, n.id); } }] : []
  });
}

export function noteLine(kind, n, withWho) {
  return h('button', { class: 'item', style: { alignItems: 'flex-start' }, onclick: () => openNote(kind, n) },
    icon(kind === 'flash' ? 'bolt' : 'lock', 20),
    h('span', { class: 'tx' }, h('b', null, (withWho ? fullName(userById(n.uid)) + ' · ' : '') + TITRE[kind]), h('span', null, relDay(n.ts) + (n.auteur ? ' · ' + fullName(userById(n.auteur)) : '')), h('span', { style: { color: 'var(--soft)', marginTop: '2px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } }, n.texte)),
    icon('chevron-right', 16));
}

let filterMem = 'all';
export function retoursView() {
  const cur = cfg('semestreCourant');
  let filter = filterMem;
  const frag = h('div', { class: 'col', style: { gap: '14px' } });
  frag.append(h('h1', { class: 'h1' }, 'Retours'));
  frag.append(h('div', { class: 'row wrap' },
    cfg('modules').flash ? h('button', { class: 'btn', onclick: () => composeNote('flash') }, icon('bolt', 16), 'Feedback flash') : null,
    cfg('modules').retours ? h('button', { class: 'btn', onclick: () => composeNote('retours') }, icon('lock', 16), 'Retour confidentiel') : null));
  const box = h('div');
  const draw = () => {
    clear(box);
    const items = [].concat(
      filter !== 'retours' ? all('flash').filter(n => n.sem === cur).map(n => ({ k: 'flash', n })) : [],
      filter !== 'flash' ? all('retours').filter(n => n.sem === cur).map(n => ({ k: 'retours', n })) : []).sort((a, b) => b.n.ts - a.n.ts);
    box.append(h('div', { class: 'row wrap', style: { marginBottom: '12px' } },
      [['all', 'Tous'], ['flash', 'Flash'], ['retours', 'Confidentiels']].map(([v, l]) => h('button', { class: 'chip' + (filter === v ? ' on' : ''), onclick: () => { filter = filterMem = v; draw(); } }, l))));
    box.append(items.length ? h('div', { class: 'card list', style: { padding: '2px 14px' } }, items.map(i => noteLine(i.k, i.n, true))) : empty('message', 'Aucun message pour l’instant.'));
  };
  draw();
  frag.append(box);
  return frag;
}
