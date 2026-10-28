// Liaison avec EchoLearn : réglages et synthèse de la progression (les images restent sur le téléphone de l'interne)
import { cfg, all, S } from './store.js';
import { gestesOf } from './logic.js';

export function echoCfg() { return cfg('echo') || {}; }
export function echoOn() { return echoCfg().actif !== false; }
/** Adresse d'EchoLearn (https uniquement), ou '' si l'application est désactivée ou non renseignée */
export function echoUrl() {
  const u = String(echoCfg().url || '').trim();
  return echoOn() && /^https:\/\/[A-Za-z0-9._~\-\/]{4,200}$/.test(u) ? u : '';
}
export function etabServiceOn() { return !!echoCfg().etabService; }

const isItem = r => !r.del && r.key && r.key.indexOf('.') > 0;
export function echoItemsOf(uid) { return all('echo_items').filter(r => r.uid === uid && isItem(r)); }
export function echoValidOf(uid) { return all('echo_valid').filter(r => r.uid === uid && !r.del); }

/* ---------- Catalogue (modules → sections → items), modifiable par l'équipe dans Admin → EchoLearn → Contenu ---------- */
export const ECHO_LIMITS = { modules: 20, tabs: 20, itemsPerTab: 200, items: 300, chars: 40000 };
export function echoCatalogue() { const c = cfg('echoCatalogue'); return c && Array.isArray(c.modules) ? c : { v: 1, modules: [] }; }
/** Items que voient les internes pour un module : ni le module, ni la section, ni l'item ne sont masqués */
export function echoVisibleItems(m) { return m.hidden ? [] : (m.tabs || []).filter(t => !t.hidden).flatMap(t => (t.items || []).filter(i => !i.hidden)); }
export function echoStats(cat) {
  const mods = cat.modules || [];
  return { modules: mods.length, items: mods.reduce((n, m) => n + (m.tabs || []).reduce((k, t) => k + (t.items || []).length, 0), 0), visible: mods.reduce((n, m) => n + echoVisibleItems(m).length, 0), chars: JSON.stringify(cat).length };
}

/** Synthèse par module visible : examens, items acquis (Fait ou Maîtrisé), items maîtrisés, validations */
export function echoSummary(uid, sem) {
  const cat = echoCatalogue(), mods = [], vis = {}, byNom = {};
  cat.modules.forEach(m => {
    const its = echoVisibleItems(m); if (!its.length) return;
    const o = { id: m.id, nom: m.name, total: its.length, acq: 0, mait: 0, exams: 0 };
    mods.push(o);
    its.forEach(i => (vis[m.id + '.' + i.id] = o));
    [m.name].concat(m.oldNames || []).forEach(n => (byNom[n] = o)); // un module renommé garde ses anciens examens
  });
  echoItemsOf(uid).forEach(r => {
    const m = vis[r.key]; if (!m) return; // un item masqué ne compte plus
    if (r.statut === 'fait' || r.statut === 'maitrise') m.acq++;
    if (r.statut === 'maitrise') m.mait++;
  });
  const exams = gestesOf(uid, sem).filter(g => g.type === 'echo');
  exams.forEach(g => { const m = byNom[g.site]; if (m) m.exams++; });
  const sum = k => mods.reduce((n, m) => n + m[k], 0);
  return { mods: mods, exams: exams.length, acq: sum('acq'), mait: sum('mait'), total: sum('total'), vals: echoValidOf(uid).length, any: exams.length > 0 || echoItemsOf(uid).length > 0 };
}
