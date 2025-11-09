// types-T.js

import { fetchSafe } from './src-shared-fetch.js';
import { mappers } from './src-shared-map.js';
import { createTypedCache } from './src-shared-cache.js';
import { getTnCs } from './types-C.js';
import { normalizeArray, isMapped } from './src-shared-tools.js';

const TTL = 3600;
const cache = createTypedCache({ ttl: TTL });
const iCache = createTypedCache({ ttl: 1800 });

function map(raw) {
  const items = normalizeArray(raw);

  return items.map(item => {
    const id = item?.tf_tagid;
    if (!id) return undefined;

    const cached = cache.get(id);
    if (isMapped(cached, ['id', 'name'])) return cached;

    const mapped = mappers.T(item);
    cache.set(id, mapped);
    return mapped;
  });
}

async function fetch(id, scope = 'self', {
  limit = 0,
  filter = '',
  mode = 'normal',
  cid = ''
} = {}) {
  const key = `${scope}:${id}:${filter}:${mode}:${cid}`;
  const filterClause = filter ? ` and ${filter}` : '';

  // 🔁 Cache
  if (scope === 'self') {
    const cached = cache.get(id);
    if (cached) return cached;
  } else if (mode === 'normal') {
    const cached = iCache.get(key);
    if (cached) return cached;
  }

  // 🔍 Requête
  let url;
  if (scope === 'parents') {
    url = `/_api/tf_itags?$select=tf_itagid&$expand=tf_Parent($select=tf_tag,tf_tagid,tf_o,tf_svgicon)&$orderby=tf_porder&$filter=_tf_child_value eq '${id}'${filterClause}`;
  } else if (scope === 'children') {
    url = `/_api/tf_itags?$select=tf_itagid&$expand=tf_Child($select=tf_tag,tf_tagid,tf_o,tf_svgicon)&$orderby=tf_corder&$filter=_tf_parent_value eq '${id}'${filterClause}`;
  } else {
    limit = -1;
    url = `/_api/tf_tag?$select=tf_tag,tf_tagid,tf_o,tf_svgicon&$filter=tf_tagid eq '${id}'${filterClause}`;
  }

  if (limit > 0) url += `&$top=${limit}`;

  const raw = await fetchSafe(url);
  let values = raw.value || [];

  if (scope === 'parents') values = values.map(e => e.tf_Parent);
  if (scope === 'children') values = values.map(e => e.tf_Child);

  let mapped = map(values);

  // 🧩 Enrichir avec nCs
  if (scope === 'children' && mode === 'normal' && cid) {
    mapped = await Promise.all(
      mapped.map(async TL => ({
        ...TL,
        nCs: await getTnCs(TL.id, cid)
      }))
    );
  }

  // 🌳 Mode tree
  if (mode === 'tree') {
    const result = [];
    for (const TL of mapped) {
      const children = await fetch(TL.id, 'children', { filter, mode: 'tree', cid });
      result.push({ ...TL, TLs: children.length > 0 ? children : [] });
    }
    return result;
  }

  // 🧱 Mode flat
  if (mode === 'flat') {
    const flat = [], links = [];

    async function walk(TL, parentId = null) {
      flat.push(TL);
      if (parentId) links.push({ _TR_id: parentId, _TL_id: TL.id });

      const children = await fetch(TL.id, 'children', { filter, mode: 'normal', cid });
      for (const child of children) await walk(child, TL.id);
    }

    for (const TL of mapped) await walk(TL, id);
    return { flatTLs: flat, iTLs: links };
  }

  // 🗃️ Cache
  if (scope === 'self') {
    const result = limit === -1 ? mapped[0] : mapped;
    cache.set(id, result);
    return result;
  } else if (mode === 'normal') {
    iCache.set(key, mapped);
    return mapped;
  }

  return mapped;
}

export const T = { fetch, map, cache, iCache };