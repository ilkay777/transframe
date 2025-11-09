// src-shared-fetch.js

/**
 * Wrapper sécurisé pour appels HTTP.
 * Gère les headers, les tokens, et les erreurs.
 * @param {string} url - URL complète ou relative (ex: '/_api/tf_tag?$expand=...')
 * @param {string} method - 'GET', 'POST', 'PUT', etc.
 * @param {object|null} body - corps JSON pour POST/PUT
 * @returns {Promise<object>} - JSON parsé
 */
export async function fetchSafe(url, method = 'GET', body = null) {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  };

  if (method !== 'GET') {
    const token = await shell.getTokenDeferred();
    headers['__RequestVerificationToken'] = token;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include'
  });

  if (!res.ok) {
    console.error(`❌ ${method} ${url} → ${res.status}`);
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  return await res.json();
}

/**
 * Mise à jour sécurisée via PUT
 * @param {string} strQry - segment d'URL (ex: 'tf_tag(guid)')
 * @param {object} payload - données à envoyer
 * @returns {Promise<object>} - réponse JSON
 */
export async function updateSafe(strQry, payload) {
  const url = `/_api/${strQry}`;
  return await fetchSafe(url, 'PUT', payload);
}

/**
 * Comptage via $count=true
 * @param {string} entity - nom d'entité (ex: 'tf_tag')
 * @param {string} filter - clause OData (ex: "startswith(tf_tag,'A')")
 * @returns {Promise<number>} - nombre d'éléments
 */
export async function countSafe(entity, filter = '') {
  const baseUrl = '/_api';
  const filterClause = filter ? `&$filter=${filter}` : '';
  const url = `${baseUrl}/${entity}?$count=true&$top=1${filterClause}`;
  const json = await fetchSafe(url);
  const count = json?.['@odata.count'];
  if (typeof count === 'number') return count;
  throw new Error(`❌ Count failed for ${entity}`);
}

/**
 * Appel typé vers une entité
 * @param {string} entity - nom d'entité (ex: 'tf_tag')
 * @param {string} query - requête OData (ex: '?$expand=...')
 * @returns {Promise<Array>} - tableau de résultats
 */
export async function fetchFrom(entity, query = '') {
  const baseUrl = '/_api';
  const fullUrl = `${baseUrl}/${entity}${query}`;
  const json = await fetchSafe(fullUrl);
  return json?.value || [];
}

/**
 * Fonctions typées paramétrables
 * @param {object} opts - { filter, select, expand, top }
 */
export async function fetchTs(opts = {}) {
  return await fetchTyped('tf_tag', opts);
}

export async function fetchCs(opts = {}) {
  return await fetchTyped('tf_code', opts);
}

export async function fetchJs(opts = {}) {
  return await fetchTyped('tf_job', opts);
}

export async function fetchWs(opts = {}) {
  return await fetchTyped('tf_layout', opts);
}

export async function fetchComs(opts = {}) {
  return await fetchTyped('tf_com', opts);
}

export async function fetchiTs(opts = {}) {
  return await fetchTyped('tf_itags', opts);
}

export async function fetchiCs(opts = {}) {
  return await fetchTyped('tf_icodes', opts);
}

/**
 * Générateur de requête OData typée
 * @param {string} entity - nom d'entité
 * @param {object} opts - { filter, select, expand, top }
 * @returns {Promise<Array>}
 */
async function fetchTyped(entity, { filter = '', select = '', expand = '', top = 0 } = {}) {
  const parts = [];
  if (select) parts.push(`$select=${select}`);
  if (expand) parts.push(`$expand=${expand}`);
  if (filter) parts.push(`$filter=${filter}`);
  if (top > 0) parts.push(`$top=${top}`);

  const query = parts.length ? '?' + parts.join('&') : '';
  return await fetchFrom(entity, query);
}