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

async function getJs(strJid, strScope, nLimit = 0, strFilter = '') {
  const safeFilter = strFilter ? ` and ${strFilter}` : '';

  // Base expand (sans espaces ni sauts de ligne parasites)
  const baseExpand = [
    "tf_Com($select=tf_com,tf_comid,tf_svgicon;",
    "$expand=tf_Layout($select=tf_layout,tf_layoutid,tf_levels,tf_def),",
    "tf_LayoutAssoc($select=tf_layout,tf_layoutid,tf_levels,tf_def))"
  ].join('');

  let filterQuery;
  switch (strScope) {
    case 'R':
      filterQuery = `_tf_child_value eq '${strJid}'${safeFilter}`;
      break; // parents
    case 'L':
      filterQuery = `_tf_sourcejob_value eq '${strJid}'${safeFilter}`;
      break; // children
    default:
      filterQuery = `tf_jobid eq '${strJid}'${safeFilter}`;
      nLimit = -1;
      break; // self
  }

  const topQuery = nLimit > 0 ? `&$top=${Math.abs(nLimit)}` : '';

  // Nettoyage automatique des espaces inutiles
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

async function getTLs(strTid, strJid) {
  let myTLs = await getTs(strTid, 'L');
  return await Promise.all(myTLs.map(async (myTL) => {
    return { ...myTL, nCs: await getTnCs(myTL.id, strJid) };
  }));
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

async function startupProc() {
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Startup procedure initiated.');

  window.addEventListener("popstate", function (event) {
    if (event.state) window.location.reload();
  });

  const urlParams = new URLSearchParams(window.location.search);
  let strJid = urlParams.get('jid');
  if (strJid) wrJ(strJid); else wrJ();
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

    const outParsed = JSON.parse(apiJ.tf_out || '{}');
    const outHtml = JoutHtml((outParsed.pssOut || {}).value || {});

    return {
      id: apiJ.tf_jobid,
      name: apiJ.tf_job,
      o: apiJ.tf_o || '',
      v: apiJ.tf_v,
      out: outParsed,
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
      }
    };
  });
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

