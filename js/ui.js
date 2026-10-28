// Composants d'interface : feuilles modales, toasts, champs de formulaire
import { h, icon, clear, uid } from './util.js';

/* ---------- Toasts ---------- */
export function toast(msg, opts = {}) {
  let box = document.querySelector('.toasts');
  if (!box) { box = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }); document.body.append(box); }
  const t = h('div', { class: 'toast' + (opts.err ? ' err' : '') }, h('span', null, msg));
  if (opts.action) t.append(h('button', { onclick: () => { t.remove(); opts.action.fn(); } }, opts.action.label));
  box.append(t);
  setTimeout(() => t.remove(), opts.ms || (opts.err ? 5000 : 3200));
  return t;
}

/* ---------- Feuilles modales ---------- */
const stack = [];
function host() {
  let o = document.getElementById('overlays');
  if (!o) { o = h('div', { id: 'overlays' }); document.body.append(o); }
  return o;
}
export function closeAllSheets() { stack.slice().forEach(s => s.close()); }
window.addEventListener('hashchange', closeAllSheets);
window.addEventListener('popstate', closeAllSheets);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && stack.length) stack[stack.length - 1].close(); });

/**
 * openSheet({ title, body: Node | (sheet)=>Node, actions: [{label, kind, onClick(sheet) -> false pour garder ouvert, close:false}], onClose })
 */
export function openSheet(opts) {
  const body = h('div', { class: 'sheet-body' });
  const foot = h('div', { class: 'sheet-foot' });
  const titleEl = h('h2', { class: 'h3', id: 'sh' + uid() }, opts.title || '');
  const closeBtn = h('button', { class: 'iconbtn sm', 'aria-label': 'Fermer', onclick: () => sh.close() }, icon('x', 18));
  const sheetEl = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleEl.id }, h('div', { class: 'sheet-head' }, titleEl, closeBtn), body, foot);
  const overlay = h('div', { class: 'overlay' }, sheetEl);
  overlay.addEventListener('mousedown', e => { if (e.target === overlay && opts.dismissable !== false) sh.close(); });
  const sh = {
    el: sheetEl, body, foot, closed: false,
    close() {
      if (sh.closed) return;
      sh.closed = true;
      overlay.remove();
      const i = stack.indexOf(sh); if (i >= 0) stack.splice(i, 1);
      if (opts.onClose) opts.onClose();
    },
    setTitle(t) { titleEl.textContent = t; },
    setBody(node) { clear(body); body.append(node); },
    setActions(actions) {
      clear(foot);
      (actions || []).forEach(a => {
        const b = h('button', { class: 'btn ' + (a.kind || ''), type: 'button', disabled: a.disabled }, a.label);
        b.addEventListener('click', async () => {
          if (b.disabled) return;
          b.disabled = true;
          let r;
          try { r = a.onClick ? await a.onClick(sh, b) : undefined; } finally { if (!sh.closed) b.disabled = false; }
          if (r !== false && a.close !== false) sh.close();
        });
        a.el = b;
        foot.append(b);
      });
      foot.hidden = !(actions && actions.length);
    }
  };
  const content = typeof opts.body === 'function' ? opts.body(sh) : opts.body;
  if (content) body.append(content);
  sh.setActions(opts.actions);
  host().append(overlay);
  stack.push(sh);
  setTimeout(() => { const f = sheetEl.querySelector('[autofocus]'); if (f) f.focus(); }, 60);
  return sh;
}

export function confirmSheet({ title, text, ok = 'Confirmer', cancel = 'Annuler', danger = false }) {
  return new Promise(res => {
    let done = false;
    const fin = v => { if (!done) { done = true; res(v); } };
    openSheet({
      title,
      body: h('p', { class: 'soft' }, text),
      actions: [
        { label: cancel, kind: 'ghost', onClick: () => { fin(false); } },
        { label: ok, kind: danger ? 'danger' : 'primary', onClick: () => { fin(true); } }
      ],
      onClose: () => fin(false)
    });
  });
}

/* ---------- Champs ---------- */
export function field(label, control, hint) {
  const id = 'f' + uid();
  if (control.setAttribute && !control.id && /^(INPUT|SELECT|TEXTAREA)$/.test(control.tagName)) control.id = id;
  return h('div', { class: 'field' }, label ? h('label', { for: control.id || id }, label) : null, control, hint ? h('span', { class: 'hint' }, hint) : null);
}
export function textInput(o = {}) {
  const el = h('input', { class: 'input', type: o.type || 'text', value: o.value ?? '', placeholder: o.placeholder, autocomplete: o.autocomplete || 'off', maxlength: o.max, inputmode: o.inputmode, autocapitalize: o.autocapitalize, spellcheck: o.spellcheck === undefined ? undefined : String(o.spellcheck), min: o.min, required: o.required, readonly: o.readonly, name: o.name });
  if (o.autofocus) el.setAttribute('autofocus', '');
  return el;
}
export function textArea(o = {}) {
  const el = h('textarea', { class: 'input', placeholder: o.placeholder, maxlength: o.max, rows: o.rows || 3 });
  el.value = o.value ?? '';
  if (o.autofocus) el.setAttribute('autofocus', '');
  return el;
}
export function selectInput(options, value) {
  const el = h('select', { class: 'input' }, options.map(o => { const op = typeof o === 'string' ? { v: o, label: o } : o; const e = h('option', { value: op.v }, op.label); if (String(op.v) === String(value)) e.selected = true; return e; }));
  return el;
}
export function checkbox(label, checked) {
  const input = h('input', { type: 'checkbox' });
  input.checked = !!checked;
  const el = h('label', { class: 'check' }, input, h('span', null, label));
  el.input = input;
  return el;
}
/** Boutons segmentés : options [{v,label,c}] ; retourne un élément avec .value et .onchange */
export function segmented(options, value, onChange, cls = 'seg') {
  let val = value;
  const wrap = h('div', { class: cls, role: 'group' });
  const btns = options.map(o => {
    const b = h('button', { type: 'button', 'aria-pressed': String(o.v === val), style: o.c ? { '--c': o.c } : null, class: o.c ? 'on-c' : '' }, o.icon ? icon(o.icon, 16) : null, o.label);
    b.addEventListener('click', () => { val = o.v; wrap.set(val); if (onChange) onChange(val); if (wrap.onchange) wrap.onchange(val); });
    wrap.append(b);
    return b;
  });
  wrap.set = v => { val = v; btns.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i].v === v))); };
  Object.defineProperty(wrap, 'value', { get: () => val });
  return wrap;
}
/** Choix de grosses pastilles (une seule valeur) */
export function choices(options, value, onChange) {
  let val = value;
  const wrap = h('div', { class: 'opts' });
  const btns = options.map(o => {
    const b = h('button', { type: 'button', class: 'opt', 'aria-pressed': String(o.v === val), disabled: o.disabled, style: o.c ? { '--c': o.c } : null }, o.label);
    b.addEventListener('click', () => { if (o.disabled) return; val = o.v; wrap.set(val); if (onChange) onChange(val); });
    wrap.append(b);
    return b;
  });
  wrap.set = v => { val = v; btns.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i].v === v))); };
  Object.defineProperty(wrap, 'value', { get: () => val });
  return wrap;
}
export function colorInput(value) {
  const el = h('input', { type: 'color', class: 'swatch-in', value: /^#[0-9a-f]{6}$/i.test(value) ? value : '#FFD84D', 'aria-label': 'Couleur' });
  return el;
}

/** Éditeur d'une liste de textes (ajouter / retirer) */
export function listEditor(values, placeholder, onChange) {
  let list = (values || []).slice();
  const box = h('div', { class: 'col gap-s' });
  const changed = () => { if (onChange) onChange(list.map(s => s.trim()).filter(Boolean)); };
  const render = () => {
    clear(box);
    list.forEach((v, i) => {
      const inp = textInput({ value: v, placeholder, max: 80 });
      inp.addEventListener('input', () => { list[i] = inp.value; changed(); });
      box.append(h('div', { class: 'row' }, inp, h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Retirer', onclick: () => { list.splice(i, 1); render(); changed(); } }, icon('trash', 18))));
    });
    box.append(h('button', { type: 'button', class: 'btn sm ghost', onclick: () => { list.push(''); render(); const ins = box.querySelectorAll('input'); if (ins.length) ins[ins.length - 1].focus(); } }, icon('plus', 16), 'Ajouter'));
  };
  render();
  box.getValues = () => list.map(s => s.trim()).filter(Boolean);
  return box;
}

/* ---------- Divers ---------- */
export function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cols = ['#FFD84D', '#FFA96B', '#FF6F91', '#F2559A', '#A86BDB', '#7DD3FC'];
  const box = h('div', { class: 'confetti' });
  for (let i = 0; i < 46; i++) {
    const p = h('i', { style: { left: Math.random() * 100 + '%', background: cols[i % cols.length], animationDelay: Math.random() * 0.5 + 's', transform: 'rotate(' + Math.random() * 360 + 'deg)' } });
    box.append(p);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 2800);
}
export function empty(iconName, text) {
  return h('div', { class: 'empty' }, icon(iconName, 36, 1.5), h('div', null, text));
}
export function spinner() { return h('span', { class: 'spinner', role: 'status', 'aria-label': 'Chargement' }); }
export function pill(text, kind) { return h('span', { class: 'pill ' + (kind || '') }, text); }
export function sectionHead(title, right) {
  return h('div', { class: 'section-head' }, h('h2', { class: 'h2' }, title), right ? (typeof right === 'string' ? h('span', { class: 'small muted' }, right) : right) : null);
}
