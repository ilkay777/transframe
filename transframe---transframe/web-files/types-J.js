// types-J.js

import { fetchSafe } from './src-shared-fetch.js';
import { mappers } from './src-shared-map.js';
import { createTypedCache } from './src-shared-cache.js';
import { normalizeArray, isMapped } from './src-shared-tools.js';

import { JoutHtml } from './src-shared-format.js';
import { Com } from './types-Com.js';
import { C } from './types-C.js';
import { T } from './types-T.js';

const TTL = 3600;
const cache = createTypedCache({ ttl: TTL });
const iCache = createTypedCache({ ttl: 1800 });

const dynamicFields = ['x', 'y', 'z'].flatMap(i => ['c', 't'].map(j => `_tf_${i}${j}_value`));
const selectFields = [
  'tf_jobid', 'tf_job', 'tf_o', 'tf_v', 'tf_out',
  '_tf_sourcejob_value', '_tf_com_value',
  ...dynamicFields,
  'statuscode'
].join(',');

const baseExpand = [
  `tf_Com(` +
    `$select=tf_com,tf_comid,tf_svgicon;` +
    `$expand=` +
      `tf_Layout($select=tf_layout,tf_layoutid,tf_levels,tf_def),` +
      `tf_LayoutAssoc($select=tf_layout,tf_layoutid,tf_levels,tf_def)` +
  `)`
].join('');

function map(raw) {
  const items = normalizeArray(raw);

  return items.map(item => {
    const id = item?.tf_jobid;
    if (!id) return undefined;

    const cached = cache.get(id);
    if (isMapped(cached, ['id', 'name', 'status'])) return cached;

    const mapped = mappers.J(item);
    cache.set(id, mapped);
    return mapped;
  });
}

async function fetch(id, scope = 'self', {
  limit = 0,
  filter = '',
  curC = null
} = {}) {
  const key = `${scope}:${id}:${filter}`;
  const safeFilter = filter ? ` and ${filter}` : '';

  if (scope === 'self') {
    const cached = cache.get(id);
    if (cached) return cached;
  } else {
    const cached = iCache.get(key);
    if (cached) return cached;
  }

  if (scope === 'descendants') {
    const collected = new Set();
    async function walk(rootId) {
      if (collected.has(rootId)) return [];
      collected.add(rootId);

      const url = `/_api/tf_jobs?$select=${selectFields}&$expand=${baseExpand}&$orderby=tf_job&$filter=_tf_sourcejob_value eq '${rootId}'${safeFilter}`;
      const raw = await fetchSafe(url);
      const mapped = map(raw.value || []);
      const sub = await Promise.all(mapped.map(j => walk(j.id)));
      return [...mapped, ...sub.flat()];
    }
    return await walk(id);
  }

  let filterQuery;
  switch (scope) {
    case 'parents':
      filterQuery = `_tf_child_value eq '${id}'${safeFilter}`;
      break;
    case 'children':
      filterQuery = `_tf_sourcejob_value eq '${id}'${safeFilter}`;
      break;
    case 'current':
      if (!curC?.id) throw new Error('Missing Code for scope "current"');
      filterQuery = `_tf_com_value eq 'Jfld' and _tf_zc_value eq '${curC.id}'`;
      break;
    default:
      filterQuery = `tf_jobid eq '${id}'${safeFilter}`;
      limit = -1;
      break;
  }

  const topQuery = limit > 0 ? `&$top=${Math.abs(limit)}` : '';
  const url = `/_api/tf_jobs?$select=${selectFields}&$expand=${baseExpand}&$orderby=tf_job&$filter=${filterQuery}${topQuery}`;
  const raw = await fetchSafe(url);
  const mapped = map(raw.value || []);

  if (scope === 'self') {
    const result = limit === -1 ? mapped[0] : mapped;
    cache.set(id, result);
    return result;
  } else {
    iCache.set(key, mapped);
    return mapped;
  }
}

async function enrich(job) {
  const [srcJ, com, xC, xT, yC, yT, zC, zT] = await Promise.all([
    job._srcJ_id ? fetch(job._srcJ_id) : null,
    job._com_id ? Com.fetch(job._com_id) : null,
    job.x?._C_id ? C.fetch(job.x._C_id) : null,
    job.x?._T_id ? T.fetch(job.x._T_id) : null,
    job.y?._C_id ? C.fetch(job.y._C_id) : null,
    job.y?._T_id ? T.fetch(job.y._T_id) : null,
    job.z?._C_id ? C.fetch(job.z._C_id) : null,
    job.z?._T_id ? T.fetch(job.z._T_id) : null
  ]);

  return {
    ...job,
    srcJ,
    com,
    x: { ...job.x, C: xC, T: xT },
    y: { ...job.y, C: yC, T: yT },
    z: { ...job.z, C: zC, T: zT }
  };
}

export const J = { fetch, map, enrich, cache, iCache };