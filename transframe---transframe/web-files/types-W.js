// types-W.js

import { fetchSafe } from './src-shared-fetch.js';
import { mappers } from './src-shared-map.js';
import { createTypedCache } from './src-shared-cache.js';
import { normalizeArray, isMapped } from './src-shared-tools.js';

const TTL = 3600;
const cache = createTypedCache({ ttl: TTL });

function map(raw) {
  const items = normalizeArray(raw);

  return items.map(item => {
    const id = item?.tf_layoutid;
    if (!id) return undefined;

    const cached = cache.get(id);
    if (isMapped(cached, ['id', 'name'])) return cached;

    const mapped = mappers.W(item);
    cache.set(id, mapped);
    return mapped;
  });
}

async function fetch(id) {
  const cached = cache.get(id);
  if (cached) return cached;

  const url = `/_api/tf_layouts?$select=tf_layoutid,tf_layout,tf_def,tf_levels&$orderby=tf_layout&$filter=tf_layoutid eq '${id}'&$top=1`;
  const json = await fetchSafe(url);
  const mapped = map(json.value || []);
  const result = mapped[0];

  cache.set(id, result);
  return result;
}

export const W = { fetch, map, cache };