console.log("Javascript-Common Initiated.")
let bolLogEnabled = true;
// 🧠 Caches globaux
const cacheTs = new Map();   // clé = tagid, valeur = tag ou tableau
const cacheiTs = new Map();  // clé = `${scope}:${tid}:${filter}:${mode}:${cid}`, valeur = tableau

const DEFAULT_TTL = 300000; // 5 minutes

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

$(document).ready(function () {

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