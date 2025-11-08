// J.js

import { cache } from './src-shared-cache.js';
import { mappers } from './src-shared-map.js';
import { normalizeArray, isMapped } from './src-shared-tools.js';

const TTL = 300; // ⏱️ TTL par défaut pour les jobs (J)

/**
 * Mappe et met en cache les objets Job (J) à partir des données brutes.
 * @param {Array|Object} raw - Données brutes (array ou objet unique)
 * @returns {Array} - Liste des objets J mappés
 */
export function getJ(raw) {
  const items = normalizeArray(raw);

  return items.map(item => {
    const id = item?.tf_jobid;
    if (!id) return undefined;

    const cached = cache.J.get(id, TTL);
    if (isMapped(cached, ['id', 'name', 'status'])) return cached;

    const mapped = mappers.J(item);
    cache.J.set(id, mapped, TTL);
    return mapped;
  });
}