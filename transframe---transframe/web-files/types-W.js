// types-W.js

import { cache } from './src-shared-cache.js';
import { mappers } from './src-shared-map.js';
import { normalizeArray, isMapped } from './src-shared-tools.js';

const TTL = 86400; // ⏱️ TTL par défaut pour les layouts (W)

/**
 * Mappe et met en cache les objets Layout (W) à partir des données brutes.
 * @param {Array|Object} raw - Données brutes (array ou objet unique)
 * @returns {Array} - Liste des objets W mappés
 */
export function getW(raw) {
  const items = normalizeArray(raw);

  return items.map(item => {
    const id = item?.tf_layoutid;
    if (!id) return undefined;

    const cached = cache.W.get(id, TTL);
    if (isMapped(cached, ['id', 'name'])) return cached;

    const mapped = mappers.W(item);
    cache.W.set(id, mapped, TTL);
    return mapped;
  });
}