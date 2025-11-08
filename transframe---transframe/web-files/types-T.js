// T.js

import { cache } from './src-shared-cache.js';
import { mappers } from './src-shared-map.js';
import { normalizeArray, isMapped } from './src-shared-map.js';

const TTL = 3600; // ⏱️ TTL par défaut pour les tags (T)

/**
 * Mappe et met en cache les objets Tag (T) à partir des données brutes.
 * @param {Array|Object} raw - Données brutes (array ou objet unique)
 * @returns {Array} - Liste des objets T mappés
 */
export function getT(raw) {
  const items = normalizeArray(raw);

  return items.map(item => {
    const id = item?.tf_tagid;
    if (!id) return undefined;

    const cached = cache.T.get(id, TTL);
    if (isMapped(cached, ['id', 'name'])) return cached;

    const mapped = mappers.T(item);
    cache.T.set(id, mapped, TTL);
    return mapped;
  });
}