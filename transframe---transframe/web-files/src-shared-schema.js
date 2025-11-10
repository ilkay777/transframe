console.log("Javascript-Common Initiated.")
let bolLogEnabled = true;
// 🧠 Caches globaux
const cacheTs = new Map();   // clé = tagid, valeur = tag ou tableau
const cacheiTs = new Map();  // clé = `${scope}:${tid}:${filter}:${mode}:${cid}`, valeur = tableau

const DEFAULT_TTL = 300000; // 5 minutes

function createTypedCache() {
  const map = new Map();

  return {
    get(key, ttl = DEFAULT_TTL) {
      const entry = map.get(key);
      if (!entry) return null;
      return Date.now() - entry.timestamp < ttl ? entry.value : null;
    },
    set(key, value) {
      map.set(key, { value, timestamp: Date.now() });
    },
    clear(key) {
      map.delete(key);
    },
    clearAll() {
      map.clear();
    },
  };
}

// 🧠 Caches typés
const cache = {
  C: createTypedCache(), 
  T: createTypedCache(), 
  J: createTypedCache(), 
  iC: createTypedCache(), 
  iT: createTypedCache(), 
  W: createTypedCache(), 
  // Ajoute d'autres types ici si besoin
};

function tglO(strElemType, elemId) {
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Toggling:', strElemType, elemId);
  const myElem = document.getElementById(strElemType + `_${elemId}_`);
  if (!myElem) return;

  const myO = myElem.querySelector(`[class*='` + strElemType + `o']`);
  const myActions = myElem.querySelector(`[class*='` + strElemType + `actions']`);
  if (myO) myO.classList.toggle('visible');
  if (myActions) myActions.classList.toggle('visible');

  // Ligne à ajouter à la fin de tglO(), après avoir rendu le contenu visible :
// myElem.querySelector(`#J_${id}_ .n${nLevel}Jrow`)?.classList.toggle('visible');
}

async function fillLayout(strW, context) {
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Filling layout');
  return strW.replace(/\{\{(.*?)\}\}/g, (match, myMatch) => {
    try {
      return new Function("with(this) { return " + myMatch + "; }").call(context);
    } catch (e) {
      if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.warn('Could not evaluate:', myMatch);
      return match; // Keep the placeholder if evaluation fails
    }
  });
}

function findElements(element, strAttr) {
  let myLoopElements = [];

  function searchLoopElements(element) {
    let myChildElements = Array.from(element.children);

    for (let myChildElement of myChildElements) {
      if (myChildElement.hasAttribute(strAttr)) {
        myLoopElements.push(myChildElement);
      } else {
        searchLoopElements(myChildElement);
      }
    }
  }
  searchLoopElements(element);
  return myLoopElements;
}

async function handleComponents(element, context) {
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Handling components');
  const componentElements = findElements(element, 'data-component');

  for (const componentElement of componentElements) {
    const componentName = componentElement.getAttribute('data-component');
    componentElement.removeAttribute('data-component');
    const componentParams = JSON.parse(componentElement.getAttribute('data-parameters'));
    componentElement.removeAttribute('data-parameters');
    if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Inserting components:', componentName, componentParams);

    componentElement.innerHTML = (components[componentName] ?? (() => ""))(componentParams);
  }
}

async function handleLoops(element, context) {
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Handling loops');
  const loopElements = findElements(element, 'data-loop');

  for (const loopElement of loopElements) {
    const loopAttr = loopElement.getAttribute('data-loop');
    loopElement.removeAttribute('data-loop')
    if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Looping through:', loopAttr);

    const loopLayout = (loopElement.children[0].outerHTML);
    loopElement.innerHTML = '';
    loopElement.style.display = 'block';

    let dataItems = [];
    try {
      dataItems = await fetchData(loopAttr, context) || [];
    } catch (err) {
      console.error('fetchData failed for', loopAttr, err);
      dataItems = [];
    }

    if (dataItems.length === 0) {
      loopElement.innerHTML = '<div class="no-item"></div>';
    } else {
      for (const dataItem of dataItems) {
        let filledLayout = await fillLayout(loopLayout, dataItem);
        if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Filled item');

        let tempContainer = document.createElement('div');
        tempContainer.innerHTML = filledLayout;
        await handleComponents(tempContainer, dataItem);
        await handleLoops(tempContainer, dataItem);
        loopElement.innerHTML += tempContainer.innerHTML;
      }
    }
  }
}

async function fetchData(dataType, context) {
  const dataFetchMap = {
    'JLs': async (context) => {
      return await getJs(context.J.id, 'L');
    }
  };
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log(`Fetching ${dataType}...`);
  const fetchedData = await dataFetchMap[dataType](context);
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log(`Fetched ${dataType}:`, fetchedData);
  return fetchedData.map(item => ({ ...context, [dataType.slice(0, -1)]: item }));
}

async function getCs(strCid, strScope = '', nLimit = 0, strFilter) {
  let myStrQry;
  strFilter = strFilter ? ' and ' + strFilter + ' ' : '';
  switch (strScope) {
    case 'R': //parents
      myStrQry = 'tf_icodes?' +
        '$select=tf_icodeid&' +
        '$expand=tf_Parent($select=tf_code,tf_codeid,tf_o;' +
        '$expand=tf_Tag($select=tf_tag,tf_tagid,tf_svgicon;' +
        '$expand=tf_Layout($select=tf_layout,tf_layoutid,tf_levels,tf_def),' +
        '        tf_LayoutAssoc($select=tf_layout,tf_layoutid,tf_levels,tf_def)))&' +
        '$orderby=tf_porder&' +
        '$filter=_tf_child_value eq \'' + strCid + '\'' + strFilter;
      break;
    case 'L': //childs
      myStrQry = 'tf_icodes?' +
        '$select=tf_icodeid&' +
        '$expand=tf_Child($select=tf_code,tf_codeid,tf_o;' +
        '$expand=tf_Tag($select=tf_tag,tf_tagid,tf_svgicon;' +
        '$expand=tf_Layout($select=tf_layout,tf_layoutid,tf_levels,tf_def),' +
        '        tf_LayoutAssoc($select=tf_layout,tf_layoutid,tf_levels,tf_def)))&' +
        '$orderby=tf_corder&' +
        '$filter=_tf_parent_value eq \'' + strCid + '\'' + strFilter;
      break;
    case 'U': //sources
      myStrQry = 'tf_frames?' +
        '$select=tf_frameid&' +
        '$expand=tf_srcC($select=tf_code,tf_codeid,tf_o;' +
        '$expand=tf_Tag($select=tf_tag,tf_tagid,tf_svgicon;' +
        '$expand=tf_Layout($select=tf_layout,tf_layoutid,tf_levels,tf_def),' +
        '        tf_LayoutAssoc($select=tf_layout,tf_layoutid,tf_levels,tf_def)))&' +
        '$orderby=tf_uorder&' +
        '$filter=_tf_dstc_value eq \'' + strCid + '\'' + strFilter;
      break;
    case 'D': //destinations
      myStrQry = 'tf_frames?' +
        '$select=tf_frameid&' +
        '$expand=tf_dstC($select=tf_code,tf_codeid,tf_o;' +
        '$expand=tf_Tag($select=tf_tag,tf_tagid,tf_svgicon;' +
        '$expand=tf_Layout($select=tf_layout,tf_layoutid,tf_levels,tf_def),' +
        '        tf_LayoutAssoc($select=tf_layout,tf_layoutid,tf_levels,tf_def)))&' +
        '$orderby=tf_dorder&' +
        '$filter=_tf_srcc_value eq \'' + strCid + '\'' + strFilter;
      break;
    case '': //self
    default:
      nLimit = -1;
      myStrQry = 'tf_codes?' +
        '$select=tf_code,tf_codeid,tf_o&' +
        '$expand=tf_Tag($select=tf_tag,tf_tagid,tf_svgicon;' +
        '$expand=tf_Layout($select=tf_layout,tf_layoutid,tf_levels,tf_def),' +
        '        tf_LayoutAssoc($select=tf_layout,tf_layoutid,tf_levels,tf_def))&' +
        '$filter=tf_codeid eq \'' + strCid + '\'' + strFilter;
      break;
  }
  myStrQry += (nLimit ? ('&$top=' + Math.abs(nLimit)) : '');
  let myValues = await DVapiValues(myStrQry);
  switch (strScope) {
    case 'R': myValues = myValues.map(item => (item.tf_Parent));
      break;
    case 'L': myValues = myValues.map(item => (item.tf_Child));
      break;
    case 'D': myValues = myValues.map(item => (item.tf_dstC));
      break;
    case 'U': myValues = myValues.map(item => (item.tf_srcC));
      break;
  }
  const myMappedValues = await mapApiCs(myValues);
  return nLimit == -1 ? myMappedValues[0] : myMappedValues;
}

async function getTs(strTid, strScope, nLimit = 0, strFilter = '', mode = 'normal', strCid = '') {
  strFilter = strFilter ? ' and ' + strFilter + ' ' : '';
  const cacheKey = `${strScope}:${strTid}:${strFilter}:${mode}:${strCid}`;

  // 🧱 Vérifier le cache
  if (strScope === '') {
    const cached = cache.T.get(strTid);
    if (cached) return cached;
  } else if (mode === 'normal' || mode === '') {
    const cached = cache.iT?.get?.(cacheKey);
    if (cached) return cached;
  }

  // 🔍 Construire la requête
  let myStrQry;
  switch (strScope) {
    case 'R':
      myStrQry = 'tf_itags?' +
        '$select=tf_itagid&' +
        '$expand=tf_Parent($select=tf_tag,tf_tagid,tf_o,tf_svgicon)&' +
        '$orderby=tf_porder&' +
        `$filter=_tf_child_value eq '${strTid}'${strFilter}`;
      break;
    case 'L':
      myStrQry = 'tf_itags?' +
        '$select=tf_itagid&' +
        '$expand=tf_Child($select=tf_tag,tf_tagid,tf_o,tf_svgicon)&' +
        '$orderby=tf_corder&' +
        `$filter=_tf_parent_value eq '${strTid}'${strFilter}`;
      break;
    default:
      nLimit = -1;
      myStrQry = 'tf_tags?' +
        '$select=tf_tag,tf_tagid,tf_o,tf_svgicon&' +
        `$filter=tf_tagid eq '${strTid}'${strFilter}`;
      break;
  }

  if (nLimit) {
    myStrQry += `&$top=${Math.abs(nLimit)}`;
  }

  // 📡 Appel API
  let myValues = await DVapiValues(myStrQry);
  switch (strScope) {
    case 'R': myValues = myValues.map(item => item.tf_Parent); break;
    case 'L': myValues = myValues.map(item => item.tf_Child); break;
  }

  let myMappedValues = await mapApiTs(myValues);

  // 🧩 Enrichir avec nCs si applicable
  if (strScope === 'L' && (mode === 'normal' || mode === '')) {
    myMappedValues = await Promise.all(
      myMappedValues.map(async TL => ({
        ...TL,
        nCs: strCid ? await getTnCs(TL.id, strCid) : undefined
      }))
    );
  }

  // 🌳 Mode 'tree'
  if (mode === 'tree') {
    const result = [];
    for (const TL of myMappedValues) {
      const subTLs = await getTs(TL.id, 'L', 0, strFilter, 'tree', strCid);
      result.push({ ...TL, TLs: subTLs.length > 0 ? subTLs : [] });
    }
    return result;
  }

  // 🧱 Mode 'flat'
  if (mode === 'flat') {
    const flatTLs = [];
    const iTLs = [];

    async function walk(TL, TRid = null) {
      flatTLs.push(TL);
      if (TRid) iTLs.push({ TRid, TLid: TL.id });

      const children = await getTs(TL.id, 'L', 0, strFilter, 'normal', strCid);
      for (const subTL of children) {
        await walk(subTL, TL.id);
      }
    }

    for (const TL of myMappedValues) {
      await walk(TL, strTid);
    }

    return { flatTLs, iTLs };
  }

  // 🗃️ Stocker dans le cache
  if (strScope === '') {
    const result = nLimit === -1 ? myMappedValues[0] : myMappedValues;
    cache.T.set(strTid, result);
    return result;
  } else if (mode === 'normal' || mode === '') {
    cache.iT?.set?.(cacheKey, myMappedValues);
    return myMappedValues;
  }

  return myMappedValues;
}

async function getW(strWid) {
  let myStrQry
  nLimit = -1;
  myStrQry = 'tf_layouts?' +
    '$select=tf_layoutid,tf_layout,tf_def,tf_levels&' +
    '$orderby=tf_layout&' +
    '$filter=tf_layoutid eq \'' + strWid + '\' &$top=1';
  let myValues = await DVapiValues(myStrQry);

  const myMappedValues = await mapApiWs(myValues);
  return nLimit == -1 ? myMappedValues[0] : myMappedValues;
}

async function getJs(strJid, strScope, nLimit = 0, strFilter = '') {
  const safeFilter = strFilter ? ` and ${strFilter}` : '';

  const dynamicFields = ['x', 'y', 'z']
    .flatMap(i => ['c', 't'].map(j => `_tf_${i}${j}_value`));

  const selectFields = [
    'tf_jobid', 'tf_job', 'tf_o', 'tf_v', 'tf_out',
    '_tf_sourcejob_value', 'statuscode',
    ...dynamicFields
  ].join(',');

  const baseExpand = [
    `tf_Com(` +
      `$select=tf_com,tf_comid,tf_svgicon;` +
      `$expand=` +
        `tf_Layout($select=tf_layout,tf_layoutid,tf_levels,tf_def),` +
        `tf_LayoutAssoc($select=tf_layout,tf_layoutid,tf_levels,tf_def)` +
    `)`
  ].join('');

  const topQuery = nLimit > 0 ? `&$top=${Math.abs(nLimit)}` : '';

  // Fonction récursive pour collecter tous les descendants
  async function getDescendants(rootId, collected = new Set()) {
    if (collected.has(rootId)) return [];
    collected.add(rootId);

    const query = [
      "tf_jobs?",
      `$select=${selectFields}`,
      `&$expand=${baseExpand}`,
      "&$orderby=tf_job",
      `&$filter=_tf_sourcejob_value eq '${rootId}'${safeFilter}`
    ].join('');

    try {
      const children = await DVapiValues(query.trim());
      const mapped = await mapApiJs(children);
      const subResults = await Promise.all(
        mapped.map(child => getDescendants(child.id, collected))
      );
      return [...mapped, ...subResults.flat()];
    } catch (err) {
      if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.error('⚠️ getDescendants error:', err);
      return [];
    }
  }

  let filterQuery;
  switch (strScope) {
    case 'R':
      filterQuery = `_tf_child_value eq '${strJid}'${safeFilter}`;
      break;
    case 'L':
      filterQuery = `_tf_sourcejob_value eq '${strJid}'${safeFilter}`;
      break;
    case 'F':
      filterQuery = `tf_Com/tf_com eq 'Jfld' and _tf_zc_value eq '${curC.id}'`;
      break;
    case 'S':
      return await getDescendants(strJid);
    default:
      filterQuery = `tf_jobid eq '${strJid}'${safeFilter}`;
      nLimit = -1;
      break;
  }

  const myStrQry = [
    "tf_jobs?",
    "$select=tf_jobid,tf_job,tf_o,tf_v,tf_out,_tf_sourcejob_value,statuscode",
    `&$expand=${baseExpand}`,
    "&$orderby=tf_job",
    `&$filter=${filterQuery}`,
    topQuery
  ].join('');

  try {
    const myValues = await DVapiValues(myStrQry.trim());
    const myMappedValues = await mapApiJs(myValues);
    return nLimit === -1 ? myMappedValues[0] : myMappedValues;
  } catch (err) {
    if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.error('⚠️ getJs error:', err);
    return [];
  }
}

async function mapApiCs(apiCs) {
  return apiCs.map(apiC => ({
    id: apiC.tf_codeid,
    name: apiC.tf_code,
    o: apiC.tf_o ? apiC.tf_o : '',
    T: {
      id: apiC.tf_Tag.tf_tagid,
      name: apiC.tf_Tag.tf_tag,
      svgIcon: apiC.tf_Tag.tf_svgicon,
      W: {
        id: apiC.tf_Tag.tf_Layout.tf_layoutid,
        name: apiC.tf_Tag.tf_Layout.tf_layout,
        nLevels: apiC.tf_Tag.tf_Layout.tf_levels,
        def: apiC.tf_Tag.tf_Layout.tf_def
      },
      WAssoc: {
        id: apiC.tf_Tag.tf_LayoutAssoc.tf_layoutid,
        name: apiC.tf_Tag.tf_LayoutAssoc.tf_layout,
        nLevels: apiC.tf_Tag.tf_LayoutAssoc.tf_levels,
        def: apiC.tf_Tag.tf_LayoutAssoc.tf_def
      }
    }
  }));
}

async function mapApiWs(apiWs) {
  return apiWs.map(apiW => ({
    id: apiW.tf_layoutid,
    name: apiW.tf_layout,
    nLevels: apiW.tf_levels,
    def: apiW.tf_def
  }));
}

async function mapApiTs(apiTs) {
  const mapped = [];

  for (const apiT of apiTs) {
    const tagid = apiT.tf_tagid;
    const cached = cache.T.get(tagid);
    if (cached) {
      mapped.push(cached);
    } else {
      const mappedT = {
        id: tagid,
        name: apiT.tf_tag,
        svgIcon: apiT.tf_svgicon,
        o: apiT.tf_o,
      };
      cache.T.set(tagid, mappedT);
      mapped.push(mappedT);
    }
  }

  return mapped;
}

function JoutHtml(myJout) {
  if (!myJout || typeof myJout !== "object") return "";

  function render(value) {
    if (value === null || value === undefined) return `<span class="Jout-null">null</span>`;
    if (typeof value !== "object") return `<span class="Jout-primitive">${value}</span>`;

    return Object.entries(value)
      .map(([key, val]) => {
        const isObjectWithValue = val && typeof val === "object" && "value" in val;
        const innerVal = isObjectWithValue ? val.value : val;

        // Affiche la clé avec un conteneur caché pour la valeur
        return `
          <div class="Jout-item">
            <span class="Jout-key" onclick="this.nextElementSibling.classList.toggle('visible')">
              ${key}
            </span>
            <div class="Jout-value">${render(innerVal)}</div>
          </div>
        `;
      })
      .join("");
  }

  return `<div class="Jout-container">${render(myJout)}</div>`;
}

async function mapApiJs(apiJs) {
  const runningStatuses = ['reset', 'ready', 'validated', 'packed', 'batched'];

  return apiJs.map(apiJ => {
    const rawStatus = apiJ["statuscode@OData.Community.Display.V1.FormattedValue"] || '';
    const normalized = rawStatus.toLowerCase();
    const status = runningStatuses.includes(normalized) ? 'running' : normalized;

    const com = apiJ.tf_Com || {};
    const w = com.tf_Layout || {};
    const wAssoc = com.tf_LayoutAssoc || {};

    // ✅ Parsing sécurisé de v et out
    let parsedV = {};
    let parsedOut = {};
    try { parsedV = JSON.parse(apiJ.tf_v || '{}'); } catch (e) { parsedV = {}; }
    try { parsedOut = JSON.parse(apiJ.tf_out || '{}'); } catch (e) { parsedOut = {}; }

    const outHtml = JoutHtml((parsedOut.pssOut || {}).value || {});

    return {
      id: apiJ.tf_jobid,
      name: apiJ.tf_job,
      o: apiJ.tf_o || '',
      v: parsedV,
      out: parsedOut,
      outHtml,
      srcJ: { id: apiJ._tf_sourcejob_value },
      status,
      statusHtml: strIcon[status] || strIcon.clear,
      com: {
        id: com.tf_comid,
        name: com.tf_com,
        svgIcon: com.tf_svgicon,
        w: {
          id: w.tf_layoutid,
          name: w.tf_layout,
          nLevels: w.tf_levels,
          def: w.tf_def
        },
        wAssoc: {
          id: wAssoc.tf_layoutid,
          name: wAssoc.tf_layout,
          nLevels: wAssoc.tf_levels,
          def: wAssoc.tf_def
        }
      },
      x: {
        C: {id: apiJ._tf_xc_value || '' },
        T: {id: apiJ._tf_xt_value || '' }
      },
      y: {
        C: {id: apiJ._tf_yc_value || '' },
        T: {id: apiJ._tf_yt_value || '' }
      },
      z: {
        C: {id: apiJ._tf_zc_value || '' },
        T: {id: apiJ._tf_zt_value || '' }
      }
    };
  });
}

async function DVapiCount(strQry) {
  strQry = '/_api/' + strQry + '&$count=true&$top=1'
  return new Promise((resolve, reject) => {
    webapi.safeAjax({
      type: "GET",
      url: strQry,
      contentType: "application/json",
      success: function (res) {
        if (res && res['@odata.count']>=0) {
          resolve(res['@odata.count'])
        } else reject(err);
      },
      error: function (err) {
        reject(err);
      }
    });
  })
}

async function DVapiValues(strQry) {
  const url = `/_api/${strQry}`; 
  const cacheKey = `DVcache_${url}`;

  // ✅ Cache local (30 secondes)
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    const { timestamp, data } = JSON.parse(cached);
    if (Date.now() - timestamp < 30000) return data;
  }

  return new Promise((resolve, reject) => {
    webapi.safeAjax({
      type: "GET",
      url,
      contentType: "application/json",
      success: res => {
        const data = res?.value || [];
        sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
        resolve(data);
      },
      error: err => {
        if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.error(`❌ Dataverse error: ${url}`, err);
        reject(err);
      }
    });
  });
}

async function DVapiUpdate(strQry, newValue) {
  const url = `/_api/${strQry}`; 
  return new Promise((resolve, reject) => {
    webapi.safeAjax({
      type: "PUT",
      url,
      contentType: "application/json",
      data: JSON.stringify({
        "value": newValue
      }),
      success: res => {
        // table.updateRecord(attributeName, newValue, recordObj);
      if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log(`✅ Update successful: ${url}`, res);
      },
      error: err => {
        if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.error(`❌ Update error: ${url}`, err);
        reject(err);
      }
    });
  });
}

$(document).ready(function () {

  (function (webapi, $) {
    function safeAjax(ajaxOptions) {
      var deferredAjax = $.Deferred();
      var startTime = performance.now(); // début du chronométrage
      var type = (ajaxOptions.type || "GET").toUpperCase();
      var isReadOnly = type === "GET";

      // Fonction pour loguer la durée
      function logDuration(success, textStatus, errorThrown) {
        if (!bolLogEnabled) return;
        var duration = performance.now() - startTime;
        console.log(`${success ? "✅" : "❌"} WebAPI call ${success ? "succeeded" : "failed"}`);
        console.log(`⏱️ Duration: ${duration.toFixed(2)} ms`);
        if (!success && errorThrown) console.log(`Error: ${textStatus}, ${errorThrown}`);
      }

      // Préparer headers
      ajaxOptions.headers = ajaxOptions.headers || {};

      if (isReadOnly) {
        // GET : ajouter X-Requested-With et withCredentials
        ajaxOptions.headers["X-Requested-With"] = "XMLHttpRequest";
        ajaxOptions.xhrFields = { withCredentials: true };

        $.ajax(ajaxOptions)
          .done(function (data, textStatus, jqXHR) {
            logDuration(true);
            deferredAjax.resolve(data, textStatus, jqXHR);
          })
          .fail(function (jqXHR, textStatus, errorThrown) {
            logDuration(false, textStatus, errorThrown);
            deferredAjax.reject(jqXHR, textStatus, errorThrown);
          });

      } else {
        // POST/PUT/DELETE : obtenir le token
        shell.getTokenDeferred()
          .done(function (token) {
            ajaxOptions.headers["__RequestVerificationToken"] = token;
            ajaxOptions.xhrFields = { withCredentials: true };

            $.ajax(ajaxOptions)
              .done(function (data, textStatus, jqXHR) {
                logDuration(true);
                validateLoginSession(data, textStatus, jqXHR, deferredAjax.resolve);
              })
              .fail(function (jqXHR, textStatus, errorThrown) {
                logDuration(false, textStatus, errorThrown);
                deferredAjax.reject(jqXHR, textStatus, errorThrown);
              });
          })
          .fail(function () {
            deferredAjax.rejectWith(this, arguments);
          });
      }

      return deferredAjax.promise();
    }

    webapi.safeAjax = safeAjax;
  })(window.webapi = window.webapi || {}, jQuery);
  var notificationMsg = (function() {
    var $processingMsgEl = $('#processingMsg'),
      _msg = 'Processing...',
      _stack = 0,
      _endTimeout;
    return {
      show: function(msg) {
        
        $processingMsgEl.text(msg || _msg);
        if (_stack === 0) {
          clearTimeout(_endTimeout);
          $processingMsgEl.show();
        }
        _stack++;
      },
      hide: function() {
        _stack--;
        if (_stack <= 0) {
          _stack = 0;
          clearTimeout(_endTimeout);
          _endTimeout = setTimeout(function() {
            $processingMsgEl.hide();
          }, 500);
        }
      }
    }
  });

  if (typeof startupProc === "function") {
      startupProc();
  }});

function htmlCTmap(strCid, nLevel = 1) {
  if (false
  ) 
    return '';

  let html = '';

  for (const [name, action] of TLs) {
    // Si Jcom = Jctr et status = running, n'afficher que approve
    if (myParams.Jcom === 'Jctr') {
      if (name !== 'approve') continue;
    } 
    // Pour les autres Jcom, ne pas afficher approve
    else {
      if (name === 'approve') continue;
    }

    html += `
      <button 
        class="CTmap ${tgl.status}" 
        onclick="tglCLs('${strCid}', '${nLevel}', )"
      >
        ${strIcon[action.icon] || ''} ${action.label}
      </button>`;
  }
  return html;
}


  function Jactions(myParams) {
  // Pas d'actions pour Jpss
  if (myParams.Jcom === 'Jpss' ||
    (myParams.Jcom === 'Jctr' && myParams.Jstatus !== 'running')
  ) 
    return '';

  let html = '';

  for (const [name, action] of Object.entries(arrJactions)) {
    // Si Jcom = Jctr et status = running, n'afficher que approve
    if (myParams.Jcom === 'Jctr') {
      if (name !== 'approve') continue;
    } 
    // Pour les autres Jcom, ne pas afficher approve
    else {
      if (name === 'approve') continue;
    }

    html += `
      <button 
        class="Jaction ${action.status}" 
        onclick="Jaction('${name}', '${myParams.Jid}')"
      >
        ${strIcon[action.icon] || ''} ${action.label}
      </button>`;
  }

  return html;
}

async function Japprove(strJid) {
  await setJstatus(strJid, 'finished');
}

async function Jreset(strJid) {
  await setJstatus(strJid, 'reset');
}

async function setJstatus(strJid, strJstatus) {
  if (!strJid) {
    alert("No Job provided !");
    return;
  }

  try {
    const myStrQry = `tf_jobs(${strJid})/statuscode`;
    await DVapiUpdate(myStrQry, arrJstatuses[strJstatus].value);
    if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log(`✅ Job status update successful: ${arrJstatuses[strJstatus].label}`);
  } catch (error) {
    console.error("❌ Job status update unsuccessful :", error);
  }
}


function Cactions(myParams) {}
function Jstatuses(myParams) {}


const components = {
  Jactions,
  Cactions,
  Jstatuses
};

// constants
const nApiValuesLimit = 0;
const strCidRoot = "1dd9bdba-d685-ef11-ac21-6045bd5f9b62";
const strJidRoot = "80ccc75d-21a3-f011-bbd3-0022483ea92e";
const strTidFolder = "16a5524e-d685-ef11-ac21-6045bd5f9b62";
let svgIconChevronRight = document.createElement('svg');
const spanSeparator = document.createElement('span');
spanSeparator.className = 'separator';
spanSeparator.textContent = ' | '; 
const svg = p => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${p}"/></svg>`;
const strIcon = {
  new: svg("M12 5a7 7 0 107 7 7 7 0 00-7-7zm0 12a5 5 0 115-5 5 5 0 01-5 5zm1-8v2h2a1 1 0 010 2h-2v2a1 1 0 01-2 0v-2H9a1 1 0 010-2h2V9a1 1 0 012 0z"),
  view: svg("M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7zm0 11a4 4 0 110-8 4 4 0 010 8z"),
  folder: svg("M3 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"),
  edit: svg("M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 00-1.41 0l-2.34 2.34 3.75 3.75 2.34-2.34a1 1 0 000-1.41l-2.34-2.34z"),
  approve: svg("M9 16.17l-3.88-3.88L3.71 13.7l5.29 5.29L20.29 7.29 18.88 5.88z"),
  finished: svg("M9 16.17l-3.88-3.88L3.71 13.7l5.29 5.29L20.29 7.29 18.88 5.88z"),
  pending: svg("M12 8v5l4.28 2.54.72-1.21-3.5-2.08V8zM12 2a10 10 0 1010 10A10 10 0 0012 2z"),
  running: svg("M13 2v2a8 8 0 11-7.9 9h-2A10 10 0 1013 2z"),
  failed: svg("M12 2a10 10 0 1010 10A10 10 0 0012 2zm1 15h-2v-2h2zm0-4h-2V7h2z"),
  synchronizing: svg("M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6a6 6 0 01-6 6v2a8 8 0 000-16zm-6 8a6 6 0 016-6V4a8 8 0 000 16v-3l4 4-4 4v-3a6 6 0 01-6-6z"),
  refresh: svg("M17.65 6.35A7.95 7.95 0 0012 4V1L7 6l5 5V7a6 6 0 015.65 8.03 6.003 6.003 0 01-11.3-2.09H4a8 8 0 0013.65 3.41A8 8 0 0017.65 6.35z"),
  clear: svg("M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"),
  copy: svg("M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v16h14c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 18H8V7h11v16z"),
  delete: svg("M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zm3.46-9.12l1.41-1.41L12 10.59l1.12-1.12 1.41 1.41L13.41 12l1.12 1.12-1.41 1.41L12 13.41l-1.12 1.12-1.41-1.41L10.59 12l-1.13-1.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z")
};
const arrJactions = {
  refresh: { label: 'Refresh', icon: 'refresh', status: 'active', approval: false },
  view: { label: 'View', icon: 'view', status: 'active', approval: true },
  approve: { label: 'Approve', icon: 'approve', status: 'success', approval: true },
  edit: { label: 'Edit', icon: 'edit', status: 'active', approval: true },
  reset: { label: 'Reset', icon: 'reset', status: 'active', approval: true },
  clear: { label: 'Clear', icon: 'clear', status: 'active', approval: true },
  copy: { label: 'Copy', icon: 'copy', status: 'active', approval: true },
  delete: { label: 'Delete', icon: 'delete', status: 'active', approval: true }
};
const arrJstatuses = {
  finished: { value: 777770002, label: 'Finished', icon: 'finished', importance: 'low', color: 'green' },
  reset: { value: 777770004, label: 'Reset', icon: 'reset', importance: 'low', color: 'green' },
  pending: { value: 1, label: 'Pending', icon: 'pending', importance: 'medium', color: 'orange' },
  running: { value: -1, label: 'Running', icon: 'running', importance: 'medium', color: 'blue' },
  failed: { value: 777770003, label: 'Failed', icon: 'failed', importance: 'high', color: 'red' },
  synchronizing: { value: 777770013, label: 'Synchronizing', icon: 'synchronizing', importance: 'medium', color: 'purple' }
};




////// Frames

//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////


console.log("Javascript Initiated.")
// globals & constants
let curC;
let curJs;
let Ts = [];
let iTs = [];
let bolCTmapEditMode = false;

async function tglCLs(strCid, nLevel = 1, strTLid) {

  if (!strCid) {
    const regex = new RegExp(`^TLCLs_(.*?)_${strTLid}_`);
    const divs = Array.from(document.querySelectorAll(`div[id*='TLCLs_'][id*='_${strTLid}_']`));
      if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('TLCLs:', divs);

    for (const div of divs) {
      const match = div.id.match(regex);
      if (match && match[1]) {
        const myStrCid = match[1];
        await tglCLs(myStrCid, nLevel, strTLid);
      }
    }
    return;
  }

  const myStrCntId = `TLCLs_${strCid}_${strTLid}_`;
  const container = document.getElementById(myStrCntId);
  if (!container) {
    if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.warn(`⚠️ No element found for ID : ${myStrCntId}`);
    return;
  }

  if (container.style.display === 'none' || getComputedStyle(container).display === 'none') {
    if (!container.dataset.loaded) {
      await wrCLs(strCid, nLevel, myStrCntId, strTLid);
      container.dataset.loaded = true;
    }
    container.style.display = 'block';
  } else {
    container.style.display = 'none';
  }
}

async function wrCLs(strCid = strCidRoot, nLevel = 1, strCntId = 'Cmaster', strTLid) {
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Starting wrCLs with strCid:', strCid, 'nLevel:', nLevel, 'strTLid:', strTLid);
  let CLs = await getCs(strCid, 'L', 0,
    (strTLid) ? `tf_Child/_tf_tag_value eq '${strTLid}'` : '');
  for (let CL of CLs) {
    await wrC(CL.id, nLevel, `TLCLs_${strCid}_${strTLid}_`, true);
  }
}

async function wrC(strCid = strCidRoot, nLevel = 1, strCntId = 'Cmaster', bolAssoc) {
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Starting wrC with strCid:', strCid, 'nLevel:', nLevel, 'strCntId:', strCntId);
  let C = await getCs(strCid);
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Fetched C:', C);
  let container = document.getElementById(strCntId);

  if (nLevel === 1) {
    if (curC) {
      if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Updating history state and curC.');
      history.pushState({ page: curC.id }, curC.name, `?cid=${curC.id}`);
    }
    curC = C;
    wrCP(C.id);

    const folderJ = await getJs('', 'F', -1, '');
    if (folderJ && typeof folderJ.id === 'string') {
      curJs = await getJs(folderJ.id, 'S', 0, '') || [];
    }

    wrCTmap(C.id, curJs);
  }

  let filledLayout = await fillLayout(
    bolAssoc ? C.T.WAssoc.def : C.T.W.def, { nLevel, C });

  let tempContainer = document.createElement('div');
  tempContainer.innerHTML = filledLayout.trim();
  let newElement = tempContainer.firstElementChild;

  if (bolAssoc) container.appendChild(newElement);
  else container.innerHTML = ''; 
  container.appendChild(newElement);

  await handleLoops(newElement, { nLevel, C });

  if (nLevel < curC.T.W.nLevels) await handleExpands(newElement, nLevel);
}

async function fetchData(dataType, context) {
  const dataFetchMap = {
    'TLs': async (context) => {
      return await getTs(context.C.T.id, 'L', 0, '', 'normal', context.C.id);
    },
    'TLCLs': async (context) => {
      return await getCs(context.C.id, 'L', 0, `tf_Child/tf_Tag/tf_tagid eq '${context.TL.id}'`);
    },
    'CLs': async (context) => {
      return await getCs(context.C.id, 'L');
    },
    'CUs': async (context) => {
      return await getCs(context.C.id, 'U');
    },
    'CDs': async (context) => {
      return await getCs(context.C.id, 'D');
    }
  };
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log(`Fetching ${dataType}...`);
  const fetchedData = await dataFetchMap[dataType](context);
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log(`Fetched ${dataType}:`, fetchedData);
  return fetchedData.map(item => ({ ...context, [dataType.slice(0, -1)]: item }));
}

async function wrCP(strCid) {
  arrCPCs = await getCPs(strCid);
  const cntMainP = document.getElementById('cntMainP');
  cntMainP.innerHTML = '';

  arrCPCs.forEach((myC, myIndex) => {
    const spanP = document.createElement('span');
    spanP.textContent = myC.name;
    spanP.className = 'CP';
    spanP.onclick = async () => await wrC(myC.id, 1);

    cntMainP.appendChild(spanP);

    if (myIndex < arrCPCs.length - 1) {
      cntMainP.appendChild(spanSeparator.cloneNode(true));
    }
  });
}

function tglCTmapEdit() {
  const btns = document.querySelectorAll('.CTmapTnew');
  btns.forEach(btn => {
    btn.classList.toggle('hidden');
  });
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log(`🆕 Toggled New button`);
}

function mapTfromConventions(T) {
  return {
    id: T.id || null,
    name: T["T Name"] || '(Sans nom)',
    o: T["T Description"] || '',
    svgIcon: T["T svgIcon"] || '',
    TLs: Array.isArray(T.TLs) ? T.TLs.map(mapTfromConventions) : []
  };
}

function flattenNewT(T, parentId, srcJid, scope, idPrefix, Ts, iTs) {
  const localId = `${idPrefix}_${Math.random().toString(36).slice(2)}`;
  const mapped = mapTfromConventions(T);
  const flatT = {
    ...mapped,
    id: localId,
    srcJid,
    state: 'new',
    scope
  };
  Ts.push(flatT);

  if (parentId) {
    iTs.push({ TRid: parentId, TLid: localId });
  }

  if (Array.isArray(T.TLs)) {
    T.TLs.forEach(subT => {
      flattenNewT(subT, localId, srcJid, scope, idPrefix, Ts, iTs);
    });
  }
}

async function wrCTmap(strCid, arrJs = []) {
  const rootT = (await getCs(strCid)).T;
  const strTid = rootT.id;

  if (strTid === strTidFolder) {
    if (window.cy) {
      window.cy.destroy();
      window.cy = null;
    }
    const container = document.getElementById('cntMainCTmap');
    container.innerHTML = '';
    container.style.height = '0px';
    return null;
  }

  const { flatTLs, iTLs } = await getTs(strTid, 'L', 0, '', 'flat', strCid);

  Ts = [];
  iTs = [...iTLs];

  // Racine
  Ts.push({ ...rootT, state: 'ready', scope: 'local' });

  // TLs
  flatTLs.forEach(T => {
    Ts.push({ ...T, state: 'ready', scope: 'local' });
  });

  // Tnew hiérarchiques
  arrJs
    .filter(J =>
      J.com?.name === 'Tnew' &&
      J.status !== "finished" &&
      J.v?.newT && J.v.newT["T Name"]
    )
    .forEach(J => {
      const parentId = J.z?.T?.id;
      const isParentKnown = parentId === strTid || flatTLs.some(T => T.id === parentId);
      const scope = isParentKnown ? 'local' : 'external';
      const idPrefix = `Tnew_${J.id}`;

      flattenNewT(J.v.newT, parentId, J.id, scope, idPrefix, Ts, iTs);
    });

  // Calcul profondeur
  function computeDepths(rootId, edges) {
    const childMap = new Map();
    edges.forEach(({ TRid, TLid }) => {
      if (!childMap.has(TRid)) childMap.set(TRid, []);
      childMap.get(TRid).push(TLid);
    });

    const visited = new Set();
    function dfs(nodeId, depth = 0) {
      if (visited.has(nodeId)) return depth;
      visited.add(nodeId);
      const children = childMap.get(nodeId) || [];
      return Math.max(depth, ...children.map(child => dfs(child, depth + 1)));
    }

    return dfs(rootId, 1);
  }

  const maxDepth = computeDepths(strTid, iTs);
  const graphHeight = Math.min(500, Math.max(50, maxDepth * 50));

  const container = document.getElementById('cntMainCTmap');
  container.style.height = `${graphHeight}px`;

  const elements = [];

  Ts.forEach(T => {
    const labelClass = (T.state === 'new')
      ? `CTmapLabel${T.scope === 'external' ? 'External' : 'New'}`
      : 'CTmapLabel';

    elements.push({
      data: {
        id: T.id,
        Tid: T.id,
        html: `
          <div class="${labelClass}" data-id="${T.id}">
            ${T.svgIcon || ''}
            <span>${T.name || '(Sans nom)'}</span>
          </div>
        `
      },
      classes: 'clickable'
    });
  });

  iTs.forEach(({ TRid, TLid }) => {
    elements.push({
      data: { source: TRid, target: TLid },
      classes: ''
    });
  });

  const cy = cytoscape({
    container,
    elements,
    style: [
      {
        selector: 'node',
        style: {
          'background-color': '#dde4f5',
          'border-width': 1,
          'border-color': '#4a5e8c',
          'shape': 'roundrectangle',
          'width': '1px',
          'hight': '1px',
          'padding': '0px',
          'cursor': 'pointer'
        }
      },
      {
        selector: 'edge',
        style: {
          'background-opacity': 0,
          'border-width': 10,
          'width': 10,
          'height': 10,
          'padding': 0,
          'label': '',
          'text-opacity': 0,
          'cursor': 'pointer'
        }
      }
    ],
    layout: {
      name: 'breadthfirst',
      spacingFactor: 10,
      directed: true,
      padding: 25,
      animate: false
    }
  });

  cy.nodeHtmlLabel([
    {
      query: 'node',
      halign: 'center',
      valign: 'center',
      halignBox: 'center',
      valignBox: 'center',
      tpl: (data) => data.html || ''
    }
  ]);

  cy.on('tap', 'node', async (evt) => {
    const Tid = evt.target.data('Tid');
    const T = Ts.find(t => t.id === Tid);
    if (!T) return;

    if (bolCTmapEditMode) {
      registerMainToolbar(Tid);
    } else {
      await tglCLs('', 1, Tid);
    }
  });

  container.addEventListener('click', async (e) => {
    const el = e.target.closest('.CTmapLabel, .CTmapLabelNew, .CTmapLabelExternal');
    if (el) {
      const Tid = el.dataset.id;
      if (bolCTmapEditMode) {
        await registerMainToolbar(Tid);
      } else {
        await tglCLs('', 1, Tid);
      }
      e.stopPropagation();
    }
  });

  window.cy = cy;

  if (bolLogEnabled) {
    console.log('[wrCTmap] strCid:', strCid);
    console.log('[wrCTmap] strTid:', strTid);
    console.log('[wrCTmap] Ts:', Ts);
    console.log('[wrCTmap] iTs:', iTs);
    console.log('[wrCTmap] maxDepth:', maxDepth);
    console.log('[wrCTmap] elements:', elements);
  }
}

function registerMainToolbar(Tid) {
  const inputName = document.getElementById('inputName');
  const inputDesc = document.getElementById('inputDesc');
  const inputIcon = document.getElementById('inputIcon');

  document.getElementById('btnTupdate').onclick = () => {
    const name = inputName.value.trim();
    const desc = inputDesc.value.trim();
    const iconKey = inputIcon.value;
    const svgIcon = strIcon[iconKey] || '';

    const job = {
      id: `J_${Date.now()}`,
      com: { name: 'updateT' },
      status: 'pending',
      v: {
        T: {
          id: Tid,
          ...(name && { tf_tag: name }),
          ...(desc && { tf_o: desc }),
          ...(svgIcon && { tf_svgicon: svgIcon })
        }
      }
    };

    arrJs.push(job);
    console.log('✅ Update job added to arrJs:', job);
  };

  document.querySelectorAll('.btnTaction').forEach(btn => {
    btn.onclick = () => {
      const action = btn.dataset.action;
      const job = {
        id: `J_${Date.now()}`,
        com: { name: action },
        status: 'pending',
        v: { T: { id: Tid } }
      };
      arrJs.push(job);
      console.log(`✅ Action "${action}" added to arrJs:`, job);
    };
  });
}

function tglCTmapEdit() {
  bolCTmapEditMode = !bolCTmapEditMode;
  document.getElementById('cntMainToolbar').style.display = bolCTmapEditMode ? 'block' : 'none';
}

async function handleExpands(element, nLevel) {
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Checking for expand elements.');
  const expandElements = element.querySelectorAll('[data-expand="true"]');
  for (const expandElement of expandElements) {
    const expandId = expandElement.id.split('_')[1];
    if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Expanding into element with expandId:', expandId);
    //element.appendChild(expandElement);
    expandElement.removeAttribute('data-expand');
    await wrC(expandId, nLevel + 1, expandElement.id);
  }
}

async function getCPs(strCid) {
  let myCPs = [];
  let myC = await getCs(strCid);

  while (myC && myC.id != strCidRoot) {
    myC = await getCs(myC.id, 'R', -1);
    myCPs.push(myC);
  }

  return myCPs.reverse();
}

async function getTnCs(strTid, strCRid, strFilter) {
  let myStrQry;
  strFilter = strFilter ? ' and ' + strFilter : '';
  myStrQry = 'tf_icodes?' +
    '$select=tf_icodeid&' +
    '$expand=tf_Child($select=_tf_tag_value)&' +
    `$filter=tf_Child/_tf_tag_value eq '${strTid}'` +
    (strCRid ? ` and _tf_parent_value eq '${strCRid}' ` : '') +
    strFilter;

  return await DVapiCount(myStrQry);
}

async function getCnF(strCid) {
  const myValues = await DVapiValues(
    '/_api/tf_frames?$select=tf_frameid&$filter=_tf_srcc_value eq \'' + strCid + '\''
  );
  if (myValues) {
    return myValues.length;
  } else {
    return 0; //handle exceptions
  };
}

async function startupProc() {
  console.log('Startup procedure initiated.');

////////////////////////////////////////////////////////////////////////////////////////////////

(function () {
    "use strict";
    var $$find = function (arr, predicate) {
        if (typeof predicate !== "function") {
            throw new TypeError("predicate must be a function");
        }
        var length = arr.length >>> 0;
        var thisArg = arguments[1];
        var value;
        for (var i = 0; i < length; i++) {
            value = arr[i];
            if (predicate.call(thisArg, value, i, arr)) {
                return value;
            }
        }
        return undefined;
    };
    var LabelElement = (function () {
        function LabelElement(_a, params) {
            var node = _a.node, _b = _a.position, position = _b === void 0 ? null : _b, _c = _a.data, data = _c === void 0 ? null : _c;
            this.updateParams(params);
            this._node = node;
            this.initStyles(params.cssClass);
            if (data) {
                this.updateData(data);
            }
            if (position) {
                this.updatePosition(position);
            }
        }
        LabelElement.prototype.updateParams = function (_a) {
            var _b = _a.tpl, tpl = _b === void 0 ? function () { return ""; } : _b, _c = _a.cssClass, cssClass = _c === void 0 ? null : _c, _d = _a.halign, halign = _d === void 0 ? "center" : _d, _e = _a.valign, valign = _e === void 0 ? "center" : _e, _f = _a.halignBox, halignBox = _f === void 0 ? "center" : _f, _g = _a.valignBox, valignBox = _g === void 0 ? "center" : _g;
            var _align = {
                "top": -.5,
                "left": -.5,
                "center": 0,
                "right": .5,
                "bottom": .5
            };
            this._align = [
                _align[halign],
                _align[valign],
                100 * (_align[halignBox] - 0.5),
                100 * (_align[valignBox] - 0.5)
            ];
            this.tpl = tpl;
        };
        LabelElement.prototype.updateData = function (data) {
            while (this._node.firstChild) {
                this._node.removeChild(this._node.firstChild);
            }
            var children = new DOMParser()
                .parseFromString(this.tpl(data), "text/html")
                .body.children;
            for (var i = 0; i < children.length; ++i) {
                var el = children[i];
                this._node.appendChild(el);
            }
        };
        LabelElement.prototype.getNode = function () {
            return this._node;
        };
        LabelElement.prototype.updatePosition = function (pos) {
            this._renderPosition(pos);
        };
        LabelElement.prototype.initStyles = function (cssClass) {
            var stl = this._node.style;
            stl.position = "absolute";
            if (cssClass && cssClass.length) {
                this._node.classList.add(cssClass);
            }
        };
        LabelElement.prototype._renderPosition = function (position) {
            var prev = this._position;
            var x = position.x + this._align[0] * position.w;
            var y = position.y + this._align[1] * position.h;
            if (!prev || prev[0] !== x || prev[1] !== y) {
                this._position = [x, y];
                var valRel = "translate(" + this._align[2] + "%," + this._align[3] + "%) ";
                var valAbs = "translate(" + x.toFixed(2) + "px," + y.toFixed(2) + "px) ";
                var val = valRel + valAbs;
                var stl = this._node.style;
                stl.webkitTransform = val;
                stl.msTransform = val;
                stl.transform = val;
            }
        };
        return LabelElement;
    }());
    var LabelContainer = (function () {
        function LabelContainer(node) {
            this._node = node;
            this._elements = {};
        }
        LabelContainer.prototype.addOrUpdateElem = function (id, param, payload) {
            if (payload === void 0) { payload = {}; }
            var cur = this._elements[id];
            if (cur) {
                cur.updateParams(param);
                cur.updateData(payload.data);
                cur.updatePosition(payload.position);
            }
            else {
                var nodeElem = document.createElement("div");
                this._node.appendChild(nodeElem);
                this._elements[id] = new LabelElement({
                    node: nodeElem,
                    data: payload.data,
                    position: payload.position
                }, param);
            }
        };
        LabelContainer.prototype.removeElemById = function (id) {
            if (this._elements[id]) {
                this._node.removeChild(this._elements[id].getNode());
                delete this._elements[id];
            }
        };
        LabelContainer.prototype.updateElemPosition = function (id, position) {
            var ele = this._elements[id];
            if (ele) {
                ele.updatePosition(position);
            }
        };
        LabelContainer.prototype.updatePanZoom = function (_a) {
            var pan = _a.pan, zoom = _a.zoom;
            var val = "translate(" + pan.x + "px," + pan.y + "px) scale(" + zoom + ")";
            var stl = this._node.style;
            var origin = "top left";
            stl.webkitTransform = val;
            stl.msTransform = val;
            stl.transform = val;
            stl.webkitTransformOrigin = origin;
            stl.msTransformOrigin = origin;
            stl.transformOrigin = origin;
        };
        return LabelContainer;
    }());
    function cyNodeHtmlLabel(_cy, params, options) {
        var _params = (!params || typeof params !== "object") ? [] : params;
        var _lc = createLabelContainer();
        _cy.one("render", function (e) {
            createNodesCyHandler(e);
            wrapCyHandler(e);
        });
        _cy.on("add", addCyHandler);
        _cy.on("layoutstop", layoutstopHandler);
        _cy.on("remove", removeCyHandler);
        _cy.on("data", updateDataOrStyleCyHandler);
        _cy.on("style", updateDataOrStyleCyHandler);
        _cy.on("pan zoom", wrapCyHandler);
        _cy.on("position bounds", moveCyHandler);
        return _cy;
        function createLabelContainer() {
            var _cyContainer = _cy.container();
            var _titlesContainer = document.createElement("div");
            var _cyCanvas = _cyContainer.querySelector("canvas");
            var cur = _cyContainer.querySelector("[class^='cy-node-html']");
            if (cur) {
                _cyCanvas.parentNode.removeChild(cur);
            }
            var stl = _titlesContainer.style;
            stl.position = 'absolute';
            stl['z-index'] = 10;
            stl.width = '500px';
            stl.margin = '0px';
            stl.padding = '0px';
            stl.border = '0px';
            stl.outline = '0px';
            stl.outline = '0px';
            if (options && options.enablePointerEvents !== true) {
                stl['pointer-events'] = 'none';
            }
            _cyCanvas.parentNode.appendChild(_titlesContainer);
            return new LabelContainer(_titlesContainer);
        }
        function createNodesCyHandler(_a) {
            var cy = _a.cy;
            _params.forEach(function (x) {
                cy.elements(x.query).forEach(function (d) {
                    if (d.isNode()) {
                        _lc.addOrUpdateElem(d.id(), x, {
                            position: getNodePosition(d),
                            data: d.data()
                        });
                    }
                });
            });
        }
        function addCyHandler(ev) {
            var target = ev.target;
            var param = $$find(_params.slice().reverse(), function (x) { return target.is(x.query); });
            if (param) {
                _lc.addOrUpdateElem(target.id(), param, {
                    position: getNodePosition(target),
                    data: target.data()
                });
            }
        }
        function layoutstopHandler(_a) {
            var cy = _a.cy;
            _params.forEach(function (x) {
                cy.elements(x.query).forEach(function (d) {
                    if (d.isNode()) {
                        _lc.updateElemPosition(d.id(), getNodePosition(d));
                    }
                });
            });
        }
        function removeCyHandler(ev) {
            _lc.removeElemById(ev.target.id());
        }
        function moveCyHandler(ev) {
            _lc.updateElemPosition(ev.target.id(), getNodePosition(ev.target));
        }
        function updateDataOrStyleCyHandler(ev) {
            setTimeout(function () {
                var target = ev.target;
                var param = $$find(_params.slice().reverse(), function (x) { return target.is(x.query); });
                if (param && !target.removed()) {
                    _lc.addOrUpdateElem(target.id(), param, {
                        position: getNodePosition(target),
                        data: target.data()
                    });
                }
                else {
                    _lc.removeElemById(target.id());
                }
            }, 0);
        }
        function wrapCyHandler(_a) {
            var cy = _a.cy;
            _lc.updatePanZoom({
                pan: cy.pan(),
                zoom: cy.zoom()
            });
        }
        function getNodePosition(node) {
            return {
                w: node.width(),
                h: node.height(),
                x: node.position("x"),
                y: node.position("y")
            };
        }
    }
    var register = function (cy) {
        if (!cy) {
            return;
        }
        cy("core", "nodeHtmlLabel", function (optArr, options) {
            return cyNodeHtmlLabel(this, optArr, options);
        });
    };
    if (typeof module !== "undefined" && module.exports) {
        module.exports = function (cy) {
            register(cy);
        };
    }
    else {
        if (typeof define !== "undefined" && define.amd) {
            define("cytoscape-nodeHtmlLabel", function () {
                return register;
            });
        }
    }
    if (typeof cytoscape !== "undefined") {
        register(cytoscape);
    }
    window.cytoscapeNodeHtmlLabel = register;
}());
  cytoscape.use(window['cytoscapeNodeHtmlLabel']);

////////////////////////////////////////////////////////////////////////////////////////////////

  window.addEventListener("popstate", function (event) {
    if (event.state) window.location.reload();
  });

  const urlParams = new URLSearchParams(window.location.search);
  let strCid = urlParams.get('cid');
  if (strCid) wrC(strCid); else wrC();
}




////// Trans
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////

console.log("Trans Javascript Initiated.")

async function tglJLs(strJid = strJidRoot, nLevel = 1, strCntId = 'Jmaster') {
  let container = document.getElementById(strCntId);
  if (container.style.display === 'none') {
    if (!container.dataset.loaded) {
      wrJLs(strJid, nLevel, strCntId);
      container.dataset.loaded = true;
    }
    container.style.display = 'block';
  } else {
    container.style.display = 'none';
  }
}

async function wrJLs(strJid = strJidRoot, nLevel = 1, strCntId = 'Jmaster') {
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Starting wrJLs with strJid:', strJid, 'nLevel:', nLevel, 'strCntId:', strCntId);
  let JLs = await getJs(strJid, 'L', 0, '');
  for (let JL of JLs) {
    await wrJ(JL.id, nLevel, strCntId, true);
  }
}

async function wrJ(strJid = strJidRoot, nLevel = 1, strCntId = 'Jmaster', bolAssoc) {
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Starting wrJ with strJid:', strJid, 'nLevel:', nLevel, 'strCntId:', strCntId);
  let J = await getJs(strJid, '', 0, '');
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Fetched J:', J);
  let container = document.getElementById(strCntId);
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Container element:', container);

  if (nLevel === 1) {
    if (curJ) {
      if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Updating history state and curJ.');
      history.pushState({ page: curJ.id }, curJ.name, `?jid=${curJ.id}`);
    }
    curJ = J;
    wrJP(await getJPs(J.id));
  }

  let filledLayout = await fillLayout(
    bolAssoc ? J.com.wAssoc.def : J.com.w.def, { nLevel, J });
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Filled layout (', 
    (bolAssoc ? J.com.wAssoc.name : J.com.w.name), '): ', filledLayout);
  container.innerHTML = (bolAssoc ? container.innerHTML : '') + filledLayout;

  await handleComponents(container, { nLevel, J });
  await handleLoops(container, { nLevel, J });
  if (nLevel < curJ.com.w.nLevels) await handleExpands(container, nLevel);
}

async function handleExpands(element, nLevel) {
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Checking for expand elements.');
  const expandElements = element.querySelectorAll('[data-expand="true"]');
  for (const expandElement of expandElements) {
    const expandId = expandElement.id.split('_')[1];
    if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Expanding into element with expandId:', expandId);
    //element.appendChild(expandElement);
    await wrJ(expandId, nLevel + 1, expandElement.id);
  }
}

async function wrJP(arrJPJs) {
  const cntMainP = document.getElementById('cntMainP');
  cntMainP.innerHTML = '';

  arrJPJs.forEach((myJ, myIndex) => {
    const spanP = document.createElement('span');
    spanP.textContent = myJ.name;
    spanP.className = 'JP';
    spanP.onclick = async () => await wrJ(myJ.id, 1);

    cntMainP.appendChild(spanP);

    if (myIndex < arrJPJs.length - 1) {
      cntMainP.appendChild(spanSeparator.cloneNode(true));
    }
  });
}

async function Jaction(strAction, strJid) {
  switch (strAction) {
    case 'view': wrJ(strJid,1); break; 
    case 'refresh': wrJ(strJid, 1, 'J_' + strJid); break; 
    case 'approve': Japprove(strJid); break; 
    case 'reset': Jreset(strJid); break; 
  }
}

async function getJPs(strJid) {
  let myJPs = [];
  let myJ = await getJs(strJid);

  while (myJ && myJ.id != strJidRoot) {
    myJ = await getJs(myJ.srcJ.id);
    myJPs.push(myJ);
  }

  return myJPs.reverse();
}

async function startupProc() {
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Startup procedure initiated.');

  window.addEventListener("popstate", function (event) {
    if (event.state) window.location.reload();
  });

  const urlParams = new URLSearchParams(window.location.search);
  let strJid = urlParams.get('jid');
  if (strJid) wrJ(strJid); else wrJ();
}

// Activation du toggle display pour le style
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('Jout-key')) {
    const valDiv = e.target.nextElementSibling;
    if (!valDiv) return;
    const isVisible = valDiv.classList.toggle('visible');
    valDiv.style.display = isVisible ? 'block' : 'none';
  }
});
// constants
var curJ;

