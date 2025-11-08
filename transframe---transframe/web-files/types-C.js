// C.js

import { cache } from './src-shared-cache.js';
import { mappers } from './srd-shared-map.js';
import { normalizeArray, isMapped } from './src-shared-tools.js';

const TTL = 1800; // ⏱️ TTL par défaut pour les codes

/**
 * Mappe et met en cache les objets Code (C) à partir des données brutes.
 * @param {Array|Object} raw - Données brutes (array ou objet unique)
 * @returns {Array} - Liste des objets C mappés
 */
export function getC(raw) {
  const items = normalizeArray(raw);

  return items.map(item => {
    const id = item?.tf_codeid;
    if (!id) return undefined;

    const cached = cache.C.get(id, TTL);
    if (isMapped(cached, ['id', 'name'])) return cached;

    const mapped = mappers.C(item);
    cache.C.set(id, mapped, TTL);
    return mapped;
  });
}