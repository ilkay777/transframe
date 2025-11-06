console.log("Javascript-Common Initiated.")
let bolLogEnabled = true;

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

  let myStrQry;
  switch (strScope) {
    case 'R': // parents
      myStrQry = 'tf_itags?' +
        '$select=tf_itagid&' +
        '$expand=tf_Parent($select=tf_tag,tf_tagid,tf_o,tf_svgicon)&' +
        '$orderby=tf_porder&' +
        `$filter=_tf_child_value eq '${strTid}'${strFilter}`;
      break;
    case 'L': // childs
      myStrQry = 'tf_itags?' +
        '$select=tf_itagid&' +
        '$expand=tf_Child($select=tf_tag,tf_tagid,tf_o,tf_svgicon)&' +
        '$orderby=tf_corder&' +
        `$filter=_tf_parent_value eq '${strTid}'${strFilter}`;
      break;
    case '': // self
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

  // 🌳 Mode 'tree' : hiérarchie imbriquée
  if (mode === 'tree') {
    const result = [];
    for (const TL of myMappedValues) {
      const subTLs = await getTs(TL.id, 'L', 0, strFilter, 'tree', strCid);
      result.push({ ...TL, TLs: subTLs.length > 0 ? subTLs : [] });
    }
    return result;
  }

  // 🧱 Mode 'flat' : structure aplatie + liens
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

  return nLimit === -1 ? myMappedValues[0] : myMappedValues;
}

/*
async function getTs2(strTid, strScope, nLimit = 0, strFilter) {
  let myStrQry;
  strFilter = strFilter ? ' and ' + strFilter + ' ' : '';
  switch (strScope) {
    case 'R': //parents
      myStrQry = 'tf_itags?' +
        '$select=tf_itagid&' +
        '$expand=tf_Parent($select=tf_tag,tf_tagid,tf_o,tf_svgicon)&' +
        '$orderby=tf_porder&' +
        '$filter=_tf_child_value eq \'' + strTid + '\'' + strFilter;
      break;
    case 'L': //childs
      myStrQry = 'tf_itags?' +
        '$select=tf_itagid&' +
        '$expand=tf_Child($select=tf_tag,tf_tagid,tf_o,tf_svgicon)&' +
        '$orderby=tf_corder&' +
        '$filter=_tf_parent_value eq \'' + strTid + '\'' + strFilter;
      break;
    case '': //self
    default:
      nLimit = -1;
      myStrQry = 'tf_tags?' +
        '$select=tf_tag,tf_tagid,tf_o,tf_svgicon&' +
        '$filter=tf_tagid eq \'' + strTid + '\'' + strFilter;
      break;
  }
  myStrQry += (nLimit ? ('&$top=' + Math.abs(nLimit)) : '')

  let myValues = await DVapiValues(myStrQry);
  switch (strScope) {
    case 'R': myValues = myValues.map(item => (item.tf_Parent));
      break;
    case 'L': myValues = myValues.map(item => (item.tf_Child));
      break;
  }
  const myMappedValues = await mapApiTs(myValues);

  return nLimit == -1 ? myMappedValues[0] : myMappedValues;
}

async function getTLs2(strTid, strCid, mode = '') {
  let myTLs = await getTs(strTid, 'L');

  if (mode !== 'tree') {
    return await Promise.all(
      myTLs.map(async (myTL) => ({
        ...myTL,
        nCs: await getTnCs(myTL.id, strCid)
      }))
    );
  }

  const result = [];
  for (const myTL of myTLs) {
    const subTLs = await getTLs(myTL.id, strCid, 'tree'); 
    const node = {
      ...myTL,
      TLs: subTLs.length > 0 ? subTLs : []
    };

    result.push(node);
  }

  return result;
}
*/

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
  return apiTs.map(apiT => ({
    id: apiT.tf_tagid,
    name: apiT.tf_tag,
    svgIcon: apiT.tf_svgicon,
    o: apiT.tf_o,
  }));
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

async function DVapiAction(url, data = {}) {
  if (!url) throw new Error('URL of the action is required');

  return new Promise((resolve, reject) => {
    webapi.safeAjax({
      type: "POST",
      url,
      contentType: "application/json",
      data: Object.keys(data).length ? JSON.stringify(data) : null,
      success: res => resolve(res),
      error: err => {
        console.error(`❌ Dataverse Action error: ${url}`, err);
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