// Contenu d'EchoLearn modifiable par l'équipe : modules → sections (onglets) → items.
// Rien ne se supprime : un élément masqué disparaît d'EchoLearn (liste, progression, classement, portfolio) mais ses données restent.
import { h, icon, clone, slugify } from '../util.js';
import { saveCfg } from '../store.js';
import { rerender } from '../nav.js';
import { openSheet, toast, field, textInput, textArea, checkbox, colorInput, sectionHead, empty } from '../ui.js';
import { moveBtns } from './admin-ui.js';
import { echoCatalogue, echoVisibleItems, echoStats, ECHO_LIMITS as LIM } from '../echo.js';

const BASE = '#/admin/echo-contenu';
const EMOJIS = ['🫀', '🫁', '🩻', '🧠', '🩸', '🦴', '🫘', '🔬', '🩺', '💧', '⚡', '👶'];

/* ---------- Outils ---------- */
const lc = s => String(s || '').trim().toLowerCase();
function newId(base, taken, max) {
  const root = (slugify(base) || 'element').slice(0, max - 4).replace(/-+$/, '') || 'element';
  let id = root, n = 1;
  while (taken.indexOf(id) >= 0) id = root + '-' + ++n;
  return id;
}
/** Copie de travail du catalogue ; saveCat l'enregistre après les mêmes contrôles que le serveur */
const work = () => clone(echoCatalogue());
function saveCat(cat, msg) {
  const st = echoStats(cat);
  const refuse = text => { toast(text, { err: true }); rerender(); return false; }; // l'écran repart de la copie enregistrée : la modification refusée ne reste pas en mémoire
  if (st.visible < 1) return refuse('EchoLearn doit garder au moins un item visible.');
  if (st.modules > LIM.modules) return refuse('Maximum ' + LIM.modules + ' modules.');
  if (st.items > LIM.items) return refuse('Maximum ' + LIM.items + ' items (les items masqués comptent). Masque plutôt que d’ajouter.');
  if (st.chars > LIM.chars) return refuse('Catalogue trop volumineux : raccourcis les descriptions.');
  saveCfg('echoCatalogue', cat);
  if (msg) toast(msg);
  return true;
}
/** Un nom de module ne doit être ni celui d'un autre module, ni l'ancien nom d'un autre module */
function moduleNameClash(cat, name, selfId) {
  return cat.modules.some(m => m.id !== selfId && ([m.name].concat(m.oldNames || [])).some(n => lc(n) === lc(name)));
}
function renameModule(m, name) {
  if (m.name === name) return;
  const old = [m.name].concat(m.oldNames || []).filter(n => lc(n) !== lc(name));
  m.oldNames = old.filter((n, i) => old.findIndex(x => lc(x) === lc(n)) === i).slice(0, 10);
  if (!m.oldNames.length) delete m.oldNames;
  m.name = name;
}
const itemIdsOf = m => m.tabs.flatMap(t => t.items.map(i => i.id));
const countItems = m => m.tabs.reduce((n, t) => n + t.items.length, 0);

function shell(back, backLabel, title, ...kids) {
  return h('div', { class: 'col', style: { gap: '14px' } }, h('a', { href: back, class: 'backlink' }, icon('chevron-left', 16), backLabel), h('h1', { class: 'h1' }, title), ...kids);
}
const hiddenPill = () => h('span', { class: 'pill warn' }, 'masqué');
function eyeBtn(hidden, what, onToggle) {
  return h('button', { type: 'button', class: 'iconbtn sm', 'data-act': 'toggle-hide', 'aria-pressed': String(!!hidden), 'aria-label': (hidden ? 'Afficher ' : 'Masquer ') + what, title: hidden ? 'Masqué : appuie pour afficher' : 'Visible : appuie pour masquer', style: hidden ? { opacity: '.45' } : null, onclick: e => { e.stopPropagation(); onToggle(); } }, icon('eye', 16));
}
function row({ title, sub, swatch, hidden, what, onOpen, onToggle, arr, i, onMove }) {
  return h('button', { type: 'button', class: 'item', onclick: onOpen, 'data-row': title },
    swatch ? h('span', { style: { width: '12px', height: '12px', borderRadius: '50%', background: swatch, flex: 'none' } }) : null,
    h('span', { class: 'tx' }, h('b', null, title), sub ? h('span', null, sub) : null),
    hidden ? hiddenPill() : null,
    h('span', { class: 'row', style: { gap: '4px' }, onclick: e => e.stopPropagation() }, eyeBtn(hidden, what, onToggle), moveBtns(arr, i, onMove)),
    icon('chevron-right', 16));
}
function usageLine(cat) {
  const st = echoStats(cat);
  return h('p', { class: 'tiny muted', 'data-usage': '1' }, st.modules + '/' + LIM.modules + ' modules · ' + st.items + '/' + LIM.items + ' items (masqués compris) · ' + Math.round(st.chars / LIM.chars * 100) + ' % de la place disponible');
}
const notFound = () => shell(BASE, 'Contenu d’EchoLearn', 'Introuvable', empty('info', 'Cet élément n’existe plus.'));

/* ---------- 1. Modules ---------- */
export function echoContenuView() {
  const cat = work();
  const list = cat.modules;
  return shell('#/admin/echo', 'EchoLearn', 'Contenu d’EchoLearn',
    h('p', { class: 'small muted' }, 'Modules, sections et items proposés aux internes dans EchoLearn. Les changements arrivent sur leur téléphone à la prochaine synchronisation.'),
    h('p', { class: 'small muted' }, 'Rien ne se supprime : un élément masqué disparaît d’EchoLearn (liste, progression, classement, portfolio) mais les données déjà saisies sont conservées, et tu peux le réafficher à tout moment.'),
    usageLine(cat),
    h('div', { class: 'card list', style: { padding: '2px 14px' } }, list.map((m, i) => row({
      title: (m.icon || '') + ' ' + m.name, swatch: m.accent, hidden: m.hidden, what: 'le module ' + m.name,
      sub: m.tabs.length + ' section' + (m.tabs.length > 1 ? 's' : '') + ' · ' + echoVisibleItems(m).length + ' item' + (echoVisibleItems(m).length > 1 ? 's' : '') + ' visible' + (echoVisibleItems(m).length > 1 ? 's' : ''),
      onOpen: () => { location.hash = '#/admin/echo-contenu/' + m.id; },
      onToggle: () => { if (m.hidden) delete m.hidden; else m.hidden = true; saveCat(cat, m.hidden ? 'Module masqué.' : 'Module affiché.'); },
      arr: list, i, onMove: () => saveCat(cat)
    }))),
    h('button', { class: 'btn primary block', 'data-act': 'new-module', onclick: () => openModuleEditor(null) }, icon('plus', 18), 'Nouveau module'));
}
function openModuleEditor(id) {
  const cat = work();
  const m = id ? cat.modules.find(x => x.id === id) : { id: '', name: '', icon: '🩻', accent: '#6ee7f7', tabs: [] };
  if (!m) return;
  const isNew = !id;
  const nom = textInput({ value: m.name, max: 60, placeholder: 'Ex. Échographie rénale', autofocus: true });
  const ico = textInput({ value: m.icon || '🩻', max: 8 });
  const col = colorInput(m.accent);
  const quick = h('div', { class: 'opts' }, EMOJIS.map(e => h('button', { type: 'button', class: 'iconbtn sm', 'aria-label': e, onclick: () => { ico.value = e; } }, e)));
  const hid = checkbox('Masqué (n’apparaît plus dans EchoLearn, données conservées)', !!m.hidden);
  openSheet({
    title: isNew ? 'Nouveau module' : 'Module · ' + m.name,
    body: h('div', { class: 'col gap-l' }, field('Nom du module', nom, isNew ? 'Un module « Général » avec une première section est créé ; tu y ajouteras les items.' : 'Renommer un module garde ses examens et ses items.'),
      h('div', { class: 'row' }, h('div', { class: 'grow' }, field('Icône (emoji)', ico)), field('Couleur', col)), quick, isNew ? null : hid),
    actions: [{ label: 'Enregistrer', kind: 'primary', onClick: () => {
      const name = nom.value.trim();
      if (!name) { toast('Donne un nom au module.', { err: true }); return false; }
      if (moduleNameClash(cat, name, id)) { toast('Ce nom est déjà utilisé (ou l’a été) par un autre module.', { err: true }); return false; }
      if (isNew) {
        if (cat.modules.length >= LIM.modules) { toast('Maximum ' + LIM.modules + ' modules.', { err: true }); return false; }
        m.id = newId(name, cat.modules.map(x => x.id), 24); m.name = name;
        m.tabs = [{ id: 'general', label: 'Général', items: [] }];
        cat.modules.push(m);
      } else renameModule(m, name);
      m.icon = ico.value.trim() || '🩻'; m.accent = col.value;
      if (!isNew) { if (hid.input.checked) m.hidden = true; else delete m.hidden; }
      if (isNew) { // pas encore d'item visible : on n'impose pas la règle « au moins un item » à ce stade
        saveCfg('echoCatalogue', cat); toast('Module créé : ajoute-y des items.'); location.hash = '#/admin/echo-contenu/' + m.id; return;
      }
      return saveCat(cat, 'Enregistré.') ? undefined : false;
    } }]
  });
}

/* ---------- 2. Un module et ses sections ---------- */
export function echoModuleView(modId) {
  const cat = work(), m = cat.modules.find(x => x.id === modId);
  if (!m) return notFound();
  return shell(BASE, 'Contenu d’EchoLearn', (m.icon || '') + ' ' + m.name,
    h('div', { class: 'row', style: { gap: '8px', flexWrap: 'wrap' } }, m.hidden ? hiddenPill() : null,
      h('button', { class: 'btn ghost sm', 'data-act': 'edit-module', onclick: () => openModuleEditor(m.id) }, icon('edit', 14), 'Modifier le module')),
    sectionHead('Sections'),
    h('p', { class: 'small muted' }, 'Les sections sont les onglets du module. Une section masquée cache tous ses items.'),
    h('div', { class: 'card list', style: { padding: '2px 14px' } }, m.tabs.map((t, i) => row({
      title: t.label, hidden: t.hidden, what: 'la section ' + t.label,
      sub: t.items.length + ' item' + (t.items.length > 1 ? 's' : '') + ' · ' + t.items.filter(x => !x.hidden).length + ' visible' + (t.items.filter(x => !x.hidden).length > 1 ? 's' : ''),
      onOpen: () => { location.hash = '#/admin/echo-contenu/' + m.id + '/' + t.id; },
      onToggle: () => { if (t.hidden) delete t.hidden; else t.hidden = true; saveCat(cat, t.hidden ? 'Section masquée.' : 'Section affichée.'); },
      arr: m.tabs, i, onMove: () => saveCat(cat)
    }))),
    h('button', { class: 'btn primary block', 'data-act': 'new-tab', onclick: () => openTabEditor(m.id, null) }, icon('plus', 18), 'Nouvelle section'),
    usageLine(cat));
}
function openTabEditor(modId, tabId) {
  const cat = work(), m = cat.modules.find(x => x.id === modId);
  if (!m) return;
  const t = tabId ? m.tabs.find(x => x.id === tabId) : { id: '', label: '', items: [] };
  if (!t) return;
  const isNew = !tabId;
  const nom = textInput({ value: t.label, max: 60, placeholder: 'Ex. Cas particuliers', autofocus: true });
  const hid = checkbox('Masquée (ses items n’apparaissent plus dans EchoLearn, données conservées)', !!t.hidden);
  openSheet({
    title: isNew ? 'Nouvelle section' : 'Section · ' + t.label,
    body: h('div', { class: 'col gap-l' }, field('Nom de la section', nom), isNew ? null : hid),
    actions: [{ label: 'Enregistrer', kind: 'primary', onClick: () => {
      const label = nom.value.trim();
      if (!label) { toast('Donne un nom à la section.', { err: true }); return false; }
      if (m.tabs.some(x => x.id !== tabId && lc(x.label) === lc(label))) { toast('Une section porte déjà ce nom.', { err: true }); return false; }
      if (isNew) {
        if (m.tabs.length >= LIM.tabs) { toast('Maximum ' + LIM.tabs + ' sections par module.', { err: true }); return false; }
        t.id = newId(label, m.tabs.map(x => x.id), 24); t.label = label; m.tabs.push(t);
        saveCfg('echoCatalogue', cat); toast('Section créée : ajoute-y des items.'); location.hash = '#/admin/echo-contenu/' + m.id + '/' + t.id; return;
      }
      t.label = label; if (hid.input.checked) t.hidden = true; else delete t.hidden;
      return saveCat(cat, 'Enregistré.') ? undefined : false;
    } }]
  });
}

/* ---------- 3. Une section et ses items ---------- */
export function echoTabView(modId, tabId) {
  const cat = work(), m = cat.modules.find(x => x.id === modId), t = m && m.tabs.find(x => x.id === tabId);
  if (!t) return notFound();
  return shell('#/admin/echo-contenu/' + m.id, (m.icon || '') + ' ' + m.name, t.label,
    h('div', { class: 'row', style: { gap: '8px', flexWrap: 'wrap' } }, t.hidden ? hiddenPill() : null,
      h('button', { class: 'btn ghost sm', 'data-act': 'edit-tab', onclick: () => openTabEditor(m.id, t.id) }, icon('edit', 14), 'Modifier la section')),
    sectionHead('Items'),
    h('p', { class: 'small muted' }, 'Un item est un examen ou une notion que l’interne marque Non fait → Vu → Fait (puis Maîtrisé par un formateur). Un nouvel item démarre à « Non fait » pour tout le monde.'),
    t.items.length ? h('div', { class: 'card list', style: { padding: '2px 14px' } }, t.items.map((it, i) => row({
      title: it.name, sub: it.desc || null, hidden: it.hidden, what: 'l’item ' + it.name,
      onOpen: () => openItemEditor(m.id, t.id, it.id),
      onToggle: () => { if (it.hidden) delete it.hidden; else it.hidden = true; saveCat(cat, it.hidden ? 'Item masqué.' : 'Item affiché.'); },
      arr: t.items, i, onMove: () => saveCat(cat)
    }))) : empty('list', 'Aucun item dans cette section.'),
    h('button', { class: 'btn primary block', 'data-act': 'new-item', onclick: () => openItemEditor(m.id, t.id, null) }, icon('plus', 18), 'Nouvel item'),
    usageLine(cat));
}
function openItemEditor(modId, tabId, itemId) {
  const cat = work(), m = cat.modules.find(x => x.id === modId), t = m && m.tabs.find(x => x.id === tabId);
  if (!t) return;
  const it = itemId ? t.items.find(x => x.id === itemId) : { id: '', name: '', desc: '' };
  if (!it) return;
  const isNew = !itemId;
  const nom = textInput({ value: it.name, max: 100, placeholder: 'Ex. Mesure du TAPSE', autofocus: true });
  const desc = textArea({ value: it.desc || '', max: 300, rows: 3, placeholder: 'Ce que l’interne doit savoir faire ou reconnaître (facultatif)' });
  const hid = checkbox('Masqué (n’apparaît plus dans EchoLearn, ni dans la progression ; données conservées)', !!it.hidden);
  openSheet({
    title: isNew ? 'Nouvel item' : 'Item',
    body: h('div', { class: 'col gap-l' }, field('Nom', nom), field('Description', desc), isNew ? null : hid),
    actions: [{ label: 'Enregistrer', kind: 'primary', onClick: () => {
      const name = nom.value.trim();
      if (!name) { toast('Donne un nom à l’item.', { err: true }); return false; }
      if (m.tabs.some(x => x.items.some(y => y.id !== itemId && lc(y.name) === lc(name)))) { toast('Un item porte déjà ce nom dans ce module.', { err: true }); return false; }
      if (isNew) {
        if (t.items.length >= LIM.itemsPerTab) { toast('Maximum ' + LIM.itemsPerTab + ' items par section.', { err: true }); return false; }
        it.id = newId(name, itemIdsOf(m), 40); it.name = name; it.desc = desc.value.trim(); t.items.push(it);
      } else {
        it.name = name; it.desc = desc.value.trim();
        if (hid.input.checked) it.hidden = true; else delete it.hidden;
      }
      return saveCat(cat, 'Enregistré.') ? undefined : false;
    } }]
  });
}
