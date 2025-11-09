// types-Com.js

import { fetchSafe } from './src-shared-fetch.js';
import { mappers } from './src-shared-map.js';
import { createTypedCache } from './src-shared-cache.js';
import { normalizeArray, isMapped } from './src-shared-tools.js';

const TTL = 3600;
const cache = createTypedCache({ ttl: TTL });

function map(raw) {
  const items = normalizeArray(raw);

  return items.map(item => {
    const id = item?.tf_comid;
    if (!id) return undefined;

    const cached = cache.get(id);
    if (isMapped(cached, ['id', 'name'])) return cached;

    const mapped = mappers.Com(item);
    cache.set(id, mapped);
    return mapped;
  });
}

async function fetch(id) {
  const cached = cache.get(id);
  if (cached) return cached;

  const url = `/_api/tf_coms?$select=tf_com,tf_comid,tf_svgicon&` +
              `$expand=tf_Layout($select=tf_layout,tf_layoutid,tf_levels,tf_def),` +
              `tf_LayoutAssoc($select=tf_layout,tf_layoutid,tf_levels,tf_def)&` +
              `$filter=tf_comid eq '${id}'&$top=1`;

  const raw = await fetchSafe(url);
  const mapped = map(raw.value || []);
  const result = mapped[0];

  cache.set(id, result);
  return result;
}

export const Com = { fetch, map, cache };