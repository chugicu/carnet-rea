// Champs « établissement » et « service » : masqués tant que le réglage n'est pas activé dans Admin → EchoLearn
import { selectInput, field } from '../ui.js';

/** cfg = { etabService, etabs, services } ; cur = { etab, service } ; renvoie { active, etab, service, nodes } */
export function etabServiceField(cfg, cur) {
  const active = !!(cfg && cfg.etabService);
  const opts = (list, v) => [{ v: '', label: 'Choisir…' }].concat((list || []).concat(v && (list || []).indexOf(v) < 0 ? [v] : []).map(x => ({ v: x, label: x })));
  const etab = selectInput(opts(cfg && cfg.etabs, cur && cur.etab), (cur && cur.etab) || '');
  const service = selectInput(opts(cfg && cfg.services, cur && cur.service), (cur && cur.service) || '');
  return { active, etab, service, nodes: active ? [field('Établissement', etab), field('Service', service)] : null };
}
