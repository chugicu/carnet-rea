// Graphiques SVG : radar, silhouette, anneau, barres
import { h, esc } from './util.js';
import { radarCfg, letterValue } from './logic.js';

export const C_AUTO = '#2BA8E0';
export const C_EQUIPE = 'var(--accent)';

export function radarChart(series, opts = {}) {
  const cfgR = radarCfg();
  const axes = cfgR.axes, N = cfgR.echelle.length, n = axes.length;
  const W = 380, H = 330, cx = W / 2, cy = 160, R = opts.radius || 100;
  const ang = i => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i, f) => [cx + Math.cos(ang(i)) * R * f, cy + Math.sin(ang(i)) * R * f];
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Diagramme radar des compétences" xmlns="http://www.w3.org/2000/svg">`;
  for (let k = 1; k <= N; k++) {
    const pts = axes.map((a, i) => pt(i, k / N).map(v => v.toFixed(1)).join(',')).join(' ');
    s += `<polygon points="${pts}" fill="none" stroke="var(--line2)" stroke-width="${k === N ? 1.4 : 1}" ${k < N ? 'stroke-dasharray="3 4"' : ''}/>`;
  }
  axes.forEach((a, i) => {
    const [x, y] = pt(i, 1);
    s += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line2)" stroke-width="1"/>`;
  });
  // lettres sur l'axe vertical
  for (let k = 1; k <= N; k++) {
    const l = cfgR.echelle[N - k].l;
    s += `<text x="${cx - 6}" y="${(cy - (R * k) / N + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="var(--muted)" font-family="JetBrains Mono, monospace">${esc(l)}</text>`;
  }
  // étiquettes
  axes.forEach((a, i) => {
    const [x, y] = pt(i, 1.2);
    const anchor = Math.abs(x - cx) < 8 ? 'middle' : x > cx ? 'start' : 'end';
    const words = String(a.court || a.nom).split(' ');
    const lines = words.length > 1 && String(a.court || a.nom).length > 11 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [words.join(' ')];
    const y0 = y + (y < cy - 10 ? -2 : y > cy + 40 ? 12 : 4) - (lines.length - 1) * 6;
    lines.forEach((ln, j) => {
      s += `<text x="${x.toFixed(1)}" y="${(y0 + j * 13).toFixed(1)}" text-anchor="${anchor}" font-size="12" font-weight="600" fill="var(--soft)" font-family="Sora, sans-serif">${esc(ln)}</text>`;
    });
  });
  // séries
  series.forEach(se => {
    const vals = axes.map(a => (se.values && se.values[a.id] ? letterValue(se.values[a.id]) : 0));
    if (!vals.some(v => v > 0)) return;
    const pts = vals.map((v, i) => pt(i, Math.max(v, 0.04)).map(x => x.toFixed(1)).join(',')).join(' ');
    s += `<polygon points="${pts}" fill="${se.color}" fill-opacity=".2" stroke="${se.color}" stroke-width="2.4" stroke-linejoin="round"/>`;
    vals.forEach((v, i) => {
      if (!v) return;
      const [x, y] = pt(i, v);
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${se.color}" stroke="var(--surface)" stroke-width="1.5"/>`;
    });
  });
  s += '</svg>';
  return h('div', { class: 'radar-wrap', html: s });
}

export function legend(items) {
  return h('div', { class: 'legend' }, items.map(it => h('span', { html: `<i style="background:${it.color}"></i>${esc(it.label)}` })));
}

export function silhouette(pct, id = 's') {
  const lvl = 214 - 214 * Math.max(0, Math.min(1, pct));
  const shapes = '<circle cx="60" cy="30" r="20"/><rect x="30" y="56" width="60" height="86" rx="24"/><rect x="12" y="62" width="16" height="78" rx="8"/><rect x="92" y="62" width="16" height="78" rx="8"/><rect x="35" y="136" width="23" height="78" rx="11"/><rect x="62" y="136" width="23" height="78" rx="11"/>';
  return h('div', {
    class: 'sil-wrap',
    html: `<svg viewBox="0 0 120 220" role="img" aria-label="Silhouette de progression : ${Math.round(pct * 100)} %" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="g${id}" gradientUnits="userSpaceOnUse" x1="0" y1="214" x2="0" y2="8"><stop offset="0" stop-color="#FFD84D"/><stop offset=".35" stop-color="#FFA96B"/><stop offset=".65" stop-color="#FF6F91"/><stop offset="1" stop-color="#A86BDB"/></linearGradient>
<clipPath id="c${id}"><rect x="0" y="${lvl.toFixed(1)}" width="120" height="${(220 - lvl).toFixed(1)}"/></clipPath></defs>
<g fill="var(--line2)">${shapes}</g>
<g fill="url(#g${id})" clip-path="url(#c${id})">${shapes}</g>
<path d="M44 62c0 14 8 20 16 20s16-6 16-20" fill="none" stroke="var(--bg)" stroke-width="2.5" stroke-linecap="round" opacity=".55"/>
</svg>`
  });
}

export function ring(pct, label, color = 'var(--accent)', size = 64) {
  const r = 26, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
  return h('div', {
    style: { width: size + 'px', height: size + 'px', position: 'relative', flex: 'none' },
    html: `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true"><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--line2)" stroke-width="6"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 32 32)"/></svg><span class="mono" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${size > 60 ? 14 : 12}px">${esc(label)}</span>`
  });
}

export function barsChart(values, labels, color = 'var(--accent)', height = 110) {
  const max = Math.max(1, ...values), n = values.length, W = 320, bw = Math.min(26, (W - 10) / n - 4);
  let s = `<svg viewBox="0 0 ${W} ${height + 22}" width="100%" role="img" aria-label="Histogramme" xmlns="http://www.w3.org/2000/svg">`;
  values.forEach((v, i) => {
    const x = 6 + (i * (W - 12)) / n + ((W - 12) / n - bw) / 2;
    const bh = Math.round((v / max) * height);
    s += `<rect x="${x.toFixed(1)}" y="${height - bh}" width="${bw}" height="${Math.max(bh, v ? 2 : 0)}" rx="4" fill="${color}" opacity="${v ? 1 : 0.25}"/>`;
    if (v) s += `<text x="${(x + bw / 2).toFixed(1)}" y="${height - bh - 4}" text-anchor="middle" font-size="10" fill="var(--soft)" font-family="JetBrains Mono, monospace">${v}</text>`;
    if (labels[i] !== undefined && (n <= 12 || i % 2 === 0)) s += `<text x="${(x + bw / 2).toFixed(1)}" y="${height + 15}" text-anchor="middle" font-size="9.5" fill="var(--muted)">${esc(labels[i])}</text>`;
  });
  s += '</svg>';
  return h('div', { html: s });
}
