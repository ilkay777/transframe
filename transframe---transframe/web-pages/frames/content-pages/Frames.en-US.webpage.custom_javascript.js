console.log("Javascript Initiated.")
// globals and constants
var curC;
var curJs;
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
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Container element:', container);

  if (nLevel === 1) {
    if (curC) {
      if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('Updating history state and curC.');
      history.pushState({ page: curC.id }, curC.name, `?cid=${curC.id}`);
    }
    curC = C;
    wrCP(C.id);
    curJs = getJs(await getJs('', 'F', -1, '')?.id, 'S', 0, '') || [];
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
      return await getTLs(context.C.T.id, context.C.id);
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

async function wrCTmap(strCid, arrJs = []) {
  const strTid = (await getCs(strCid)).T.id;
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

  const arrCTmap = await getTLs(strTid, strCid, 'tree');
  const elements = [];

  function addNode(T, parentId = null, isNew = false) {
    const nodeId = T.id || `Tnew_${Math.random().toString(36).slice(2)}`;
    const labelClass = isNew ? 'CTmapLabelNew' : 'CTmapLabel';
    const edgeClass = isNew ? 'CTmapLinkNew' : '';

    elements.push({
      data: {
        id: nodeId,
        TLid: T.id,
        html: `
          <div class="${labelClass}" data-id="${T.id || ''}">
            ${T.svgIcon || ''}
            <span>${T.name || '(Sans nom)'}</span>
          </div>
        `
      },
      classes: 'clickable'
    });

    if (parentId) {
      elements.push({
        data: { source: parentId, target: nodeId },
        classes: edgeClass
      });
    }

    if (Array.isArray(T.TLs)) {
      T.TLs.forEach(subT => addNode(subT, nodeId, isNew));
    }
  }

  // 1. Arbre réel
  arrCTmap.forEach(rootTL => addNode(rootTL));

  // 2. Jobs Tnew non terminés
  arrJs
    .filter(J =>
      J.com?.name === 'Tnew' &&
      J.status !== arrJstatuses.finished.value &&
      J.v?.Tnew && J.v.Tnew.name
    )
    .forEach(J => {
      const Tnew = J.v.Tnew;
      const TR = J.v.TR;
      const parentId = TR?.id;
      if (!parentId) return;

      // Injecte le Tnew et ses TLs sous TR
      addNode(Tnew, parentId, true);
    });

  const maxDepth = Math.max(...arrCTmap.map(t => getMaxDepth(t)));
  const graphHeight = Math.min(500, Math.max(50, maxDepth * 50));
  const container = document.getElementById('cntMainCTmap');
  container.style.height = `${graphHeight}px`;

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
    const TLid = evt.target.data('TLid');
    if (bolCTmapEditMode) {
      await tglToolbar(TLid);
    } else {
      await tglCLs('', 1, TLid);
    }
  });

  container.addEventListener('click', async (e) => {
    const el = e.target.closest('.CTmapLabel, .CTmapLabelNew');
    if (el) {
      const TLid = el.dataset.id;
      if (bolCTmapEditMode) {
        await tglToolbar(TLid);
      } else {
        await tglCLs('', 1, TLid);
      }
      e.stopPropagation();
    }
  });

  window.cy = cy;

  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) {
    console.log('[wrCTmap] strCid:', strCid);
    console.log('[wrCTmap] arrJs:', arrJs);
    console.log('[wrCTmap] strTid:', strTid);
    console.log('[wrCTmap] maxDepth:', maxDepth);
    console.log('[wrCTmap] elements:', elements);
  }
}

function getMaxDepth(TL, depth = 1) {
  if (!TL.TLs || TL.TLs.length === 0) return depth;
  return Math.max(...TL.TLs.map(child => getMaxDepth(child, depth + 1)));
}

function tglCTmapEdit() {
  bolCTmapEditMode = !bolCTmapEditMode;
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

async function getTLs2(strTid, strCid) {
  let myTLs = await getTs(strTid, 'L');
  return await Promise.all(myTLs.map(async (myTL) => {
    return { ...myTL, nCs: await getTnCs(myTL.id, strCid) };
  }));
}

async function getTLs(strTid, strCid, mode = '') {
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

