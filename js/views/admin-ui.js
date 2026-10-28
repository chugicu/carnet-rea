// Petits composants partagés par les écrans d'administration
import { h, icon, slugify, ICON_NAMES } from '../util.js';
import { textInput, checkbox } from '../ui.js';

export function adminShell(title, ...kids) {
  return h('div', { class: 'col', style: { gap: '14px' } }, h('a', { href: '#/admin', class: 'backlink' }, icon('chevron-left', 16), 'Administration'), h('h1', { class: 'h1' }, title), ...kids);
}
export function rowItem({ ic, title, sub, onClick, right, swatch }) {
  return h(onClick ? 'button' : 'div', { class: 'item', onclick: onClick },
    swatch ? h('span', { style: { width: '12px', height: '12px', borderRadius: '50%', background: swatch, flex: 'none' } }) : (ic ? icon(ic, 20) : null),
    h('span', { class: 'tx' }, h('b', null, title), sub ? h('span', null, sub) : null), right || null, onClick ? icon('chevron-right', 16) : null);
}
export function moveBtns(arr, i, onMove) {
  return h('span', { class: 'row', style: { gap: '4px' }, onclick: e => e.stopPropagation() },
    h('button', { class: 'iconbtn sm', 'aria-label': 'Monter', disabled: i === 0, onclick: e => { e.stopPropagation(); const t = arr[i - 1]; arr[i - 1] = arr[i]; arr[i] = t; onMove(arr); } }, icon('up', 16)),
    h('button', { class: 'iconbtn sm', 'aria-label': 'Descendre', disabled: i === arr.length - 1, onclick: e => { e.stopPropagation(); const t = arr[i + 1]; arr[i + 1] = arr[i]; arr[i] = t; onMove(arr); } }, icon('down', 16)));
}
export function uniqueId(base, taken) {
  let id = slugify(base) || 'element', n = 1, cand = id;
  while (taken.indexOf(cand) >= 0) cand = id + '-' + ++n;
  return cand;
}
export function numInput(v, min, max) { const e = textInput({ type: 'number', value: v, inputmode: 'numeric' }); e.min = min; e.max = max; return e; }
export function checkList(options, selected) {
  const sel = new Set(selected || []);
  const box = h('div', { class: 'col gap-s' }, options.map(o => { const c = checkbox(o.label, sel.has(o.v)); c.input.addEventListener('change', () => (c.input.checked ? sel.add(o.v) : sel.delete(o.v))); return c; }));
  box.get = () => options.map(o => o.v).filter(v => sel.has(v));
  return box;
}
export function iconPicker(value, names) {
  const list = names || ICON_NAMES;
  let val = value;
  const wrap = h('div', { class: 'opts' });
  const btns = list.map(n => { const b = h('button', { type: 'button', class: 'iconbtn', 'aria-label': n, 'aria-pressed': String(n === val), style: n === val ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : null }, icon(n, 20)); b.addEventListener('click', () => { val = n; btns.forEach((x, i) => { const on = list[i] === val; x.style.borderColor = on ? 'var(--accent)' : ''; x.style.color = on ? 'var(--accent)' : ''; }); }); wrap.append(b); return b; });
  wrap.get = () => val;
  return wrap;
}
