// types-Com.js

import { cache } from './src-shared-cache.js';
import { mappers } from './src-shared-map.js';
import { normalizeArray, isMapped } from './src-shared-tools.js';

const TTL = 3600; // ⏱️ TTL par défaut pour les composants (Com)

/**
 * Mappe et met en cache les objets Composant (Com) à partir des données brutes.
 * @param {Array|Object} raw - Données brutes (array ou objet unique)
 * @returns {Array} - Liste des objets Com mappés
 */
export function getCom(raw) {
  const items = normalizeArray(raw);

  return items.map(item => {
    const id = item?.tf_comid;
    if (!id) return undefined;

    const cached = cache.Com.get(id, TTL);
    if (isMapped(cached, ['id', 'name'])) return cached;

    const mapped = mappers.Com(item);
    cache.Com.set(id, mapped, TTL);
    return mapped;
  });
}