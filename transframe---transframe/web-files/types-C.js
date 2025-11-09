// types-C.js

import { fetchSafe } from './src-shared-fetch.js';
import { mappers } from './src-shared-map.js';
import { createTypedCache } from './src-shared-cache.js';
import { normalizeArray, isMapped } from './src-shared-tools.js';

const TTL = 3600;
const cache = createTypedCache({ ttl: TTL });
const iCache = createTypedCache({ ttl: 1800 });

function map(raw) {
  const items = normalizeArray(raw);

  return items.map(item => {
    const id = item?.tf_codeid;
    if (!id) return undefined;

    const cached = cache.get(id);
    if (isMapped(cached, ['id', 'name'])) return cached;

    const mapped = mappers.C(item);
    cache.set(id, mapped);
    return mapped;
  });
}

async function fetch(id, scope = 'self', {
  limit = 0,
  filter = ''
} = {}) {
  const key = `${scope}:${id}:${filter}`;
  const filterClause = filter ? ` and ${filter}` : '';

  // 🔁 Cache
  if (scope === 'self') {
    const cached = cache.get(id);
    if (cached) return cached;
  } else {
    const cached = iCache.get(key);
    if (cached) return cached;
  }

  // 🔍 Requête
  let url;
  if (scope === 'parents') {
    url = `/_api/tf_icodes?$select=tf_icodeid&$expand=tf_Parent($select=tf_code,tf_codeid,tf_o;$expand=tf_Tag($select=tf_tag,tf_tagid,tf_svgicon;$expand=tf_Layout($select=tf_layout,tf_layoutid,tf_levels,tf_def),tf_LayoutAssoc($select=tf_layout,tf_layoutid,tf_levels,tf_def)))&$orderby=tf_porder&$filter=_tf_child_value eq '${id}'${filterClause}`;
  } else if (scope === 'children') {
    url = `/_api/tf_icodes?$select=tf_icodeid&$expand=tf_Child($select=tf_code,tf_codeid,tf_o;$expand=tf_Tag($select=tf_tag,tf_tagid,tf_svgicon;$expand=tf_Layout($select=tf_layout,tf_layoutid,tf_levels,tf_def),tf_LayoutAssoc($select=tf_layout,tf_layoutid,tf_levels,tf_def)))&$orderby=tf_corder&$filter=_tf_parent_value eq '${id}'${filterClause}`;
  } else if (scope === 'sources') {
    url = `/_api/tf_frames?$select=tf_frameid&$expand=tf_srcC($select=tf_code,tf_codeid,tf_o;$expand=tf_Tag($select=tf_tag,tf_tagid,tf_svgicon;$expand=tf_Layout($select=tf_layout,tf_layoutid,tf_levels,tf_def),tf_LayoutAssoc($select=tf_layout,tf_layoutid,tf_levels,tf_def)))&$orderby=tf_uorder&$filter=_tf_dstc_value eq '${id}'${filterClause}`;
  } else if (scope === 'destinations') {
    url = `/_api/tf_frames?$select=tf_frameid&$expand=tf_dstC($select=tf_code,tf_codeid,tf_o;$expand=tf_Tag($select=tf_tag,tf_tagid,tf_svgicon;$expand=tf_Layout($select=tf_layout,tf_layoutid,tf_levels,tf_def),tf_LayoutAssoc($select=tf_layout,tf_layoutid,tf_levels,tf_def)))&$orderby=tf_dorder&$filter=_tf_srcc_value eq '${id}'${filterClause}`;
  } else {
    limit = -1;
    url = `/_api/tf_codes?$select=tf_code,tf_codeid,tf_o&$expand=tf_Tag($select=tf_tag,tf_tagid,tf_svgicon;$expand=tf_Layout($select=tf_layout,tf_layoutid,tf_levels,tf_def),tf_LayoutAssoc($select=tf_layout,tf_layoutid,tf_levels,tf_def))&$filter=tf_codeid eq '${id}'${filterClause}`;
  }

  if (limit > 0) url += `&$top=${limit}`;

  const raw = await fetchSafe(url);
  let values = raw.value || [];

  if (scope === 'parents') values = values.map(e => e.tf_Parent);
  if (scope === 'children') values = values.map(e => e.tf_Child);
  if (scope === 'sources') values = values.map(e => e.tf_srcC);
  if (scope === 'destinations') values = values.map(e => e.tf_dstC);

  const mapped = map(values);

  // 🗃️ Cache
  if (scope === 'self') {
    const result = limit === -1 ? mapped[0] : mapped;
    cache.set(id, result);
    return result;
  } else {
    iCache.set(key, mapped);
    return mapped;
  }
}

export const C = { fetch, map, cache, iCache };