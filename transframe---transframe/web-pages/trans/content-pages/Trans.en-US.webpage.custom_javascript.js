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

