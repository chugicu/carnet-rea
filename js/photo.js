// Photos de profil : avatar (photo ou initiales), redimensionnement sur le téléphone, champ de sélection
import { h, clear, icon } from './util.js';
import { photoOf, setPhoto, initials } from './store.js';
import { toast } from './ui.js';

/** Remplit un élément « avatar » avec la photo de la personne, à défaut ses initiales */
export function fillAvatar(el, u, photo) {
  const p = photo === undefined ? (u ? photoOf(u.id) : '') : photo;
  clear(el);
  el.classList.toggle('has-photo', !!p);
  if (p) el.append(h('img', { src: p, alt: '' }));
  else el.append(document.createTextNode(initials(u)));
  return el;
}
/** size : 'xs' | 'sm' | 'lg' | 'xl' (taille normale si omis) */
export function avatar(u, size) { return fillAvatar(h('span', { class: 'avatar' + (size ? ' ' + size : '') }), u); }

function loadImg(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Image illisible : choisis une photo au format JPEG ou PNG.')); };
    img.src = url;
  });
}
/** Recadre au centre en carré, réduit à 192 px et compresse en JPEG (quelques Ko seulement) */
export async function resizePhoto(file, size = 192) {
  if (!file) throw new Error('Aucune image.');
  const img = await loadImg(file);
  const w = img.naturalWidth, hh = img.naturalHeight;
  if (!w || !hh) throw new Error('Image illisible.');
  const side = Math.min(w, hh);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, size, size);
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, (w - side) / 2, (hh - side) / 2, side, side, 0, 0, size, size);
  let q = 0.85, url = c.toDataURL('image/jpeg', q);
  while (url.length > 24000 && q > 0.45) { q -= 0.1; url = c.toDataURL('image/jpeg', q); }
  if (!/^data:image\/jpeg;base64,/.test(url) || url.length > 38000) throw new Error('Photo impossible à réduire : essaie une autre image.');
  return url;
}

/**
 * Champ photo : aperçu + « Ajouter / Changer » + « Retirer ».
 * Rien n'est enregistré tant qu'on n'appelle pas savePhoto(u, champ) (en général au clic sur « Enregistrer »).
 */
export function photoField(u) {
  const st = { dirty: false, value: photoOf(u.id) };
  const prev = h('span', { class: 'avatar xl' });
  const file = h('input', { type: 'file', accept: 'image/*', hidden: true, 'aria-label': 'Choisir une photo', 'data-photo-input': '1' });
  const add = h('button', { class: 'btn sm', type: 'button', onclick: () => file.click() });
  const rm = h('button', { class: 'btn sm ghost', type: 'button', onclick: () => { st.value = ''; st.dirty = true; draw(); } }, 'Retirer la photo');
  function draw() {
    fillAvatar(prev, u, st.value);
    clear(add); add.append(icon('camera', 16), st.value ? 'Changer la photo' : 'Ajouter une photo');
    rm.hidden = !st.value;
  }
  file.addEventListener('change', async () => {
    const f = file.files && file.files[0];
    file.value = '';
    if (!f) return;
    try { st.value = await resizePhoto(f); st.dirty = true; draw(); }
    catch (e) { toast(e.message || 'Photo illisible.', { err: true }); }
  });
  draw();
  const node = h('div', { class: 'photo-field' }, prev, h('div', { class: 'col', style: { gap: '8px', alignItems: 'flex-start' } }, add, rm), file);
  node.state = st;
  return node;
}
/** Enregistre (hors ligne compris) la photo choisie dans le champ, s'il y a eu un changement */
export function savePhoto(u, node) {
  if (node && node.state && node.state.dirty) { setPhoto(u.id, node.state.value); node.state.dirty = false; return true; }
  return false;
}
