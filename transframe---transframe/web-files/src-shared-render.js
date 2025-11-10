import { W } from './types-W.js';
import { C } from './types-C.js';
import { J } from './types-J.js';
import { T } from './types-T.js';

/**
 * Génère un tableau de contextes enrichis à partir d’un type hiérarchique.
 * Utilisé dans les galeries data-gallery.
 */
export async function generateContext(dataType, context) {
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) {
    console.log(`🖼️ Generating context for ${dataType}...`);
  }

  const map = {
    'CLs': async ({ C }) => await C.fetch(C.id, 'children'),
    'CUs': async ({ C }) => await C.fetch(C.id, 'sources'),
    'CDs': async ({ C }) => await C.fetch(C.id, 'destinations'),
    'TLs': async ({ T }) => await T.fetch(T.id, 'children'),
    'TLCLs': async ({ C, TL }) =>
      await C.fetch(C.id, 'children', {
        filter: `tf_Child/tf_Tag/tf_tagid eq '${TL.id}'`
      }),
    'JLs': async ({ J }) => await J.fetch(J.id, 'children'),
  };

  const fetchFn = map[dataType];
  if (!fetchFn) throw new Error(`❌ Unknown dataType: ${dataType}`);

  const items = await fetchFn(context);
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) {
    console.log(`✅ Generated ${items.length} contexts for ${dataType}`);
  }

  const key = dataType.slice(0, -1); // 'CLs' → 'CL'
  return items.map(item => ({ ...context, [key]: item }));
}

/**
 * Remplit un layout HTML avec un contexte donné.
 */
export async function fillLayout(strW, context) {
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('🔧 Filling layout');
  return strW.replace(/\{\{(.*?)\}\}/g, (match, expr) => {
    try {
      return new Function("with(this) { return " + expr + "; }").call(context);
    } catch (e) {
      if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.warn('⚠️ Could not evaluate:', expr);
      return match;
    }
  });
}

/**
 * Gère les galeries dynamiques via data-gallery.
 */
export async function handleGallery(element, context) {
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('🖼️ Handling gallery');
  const galleryElements = element.querySelectorAll('[data-gallery]');

  for (const el of galleryElements) {
    const galleryAttr = el.getAttribute('data-gallery');
    el.removeAttribute('data-gallery');

    const itemLayout = el.children[0]?.outerHTML || '';
    el.innerHTML = '';
    el.style.display = 'block';

    let items = [];
    try {
      items = await generateContext(galleryAttr, context) || [];
    } catch (err) {
      console.error('⚠️ generateContext failed for', galleryAttr, err);
    }

    if (items.length === 0) {
      el.innerHTML = '<div class="no-item"></div>';
    } else {
      for (const item of items) {
        const filled = await fillLayout(itemLayout, item);
        const temp = document.createElement('div');
        temp.innerHTML = filled;
        await handleGallery(temp, item);
        el.innerHTML += temp.innerHTML;
      }
    }
  }
}

/**
 * Gère les éléments différés via data-gallery-item.
 */
export async function handleGalleryItems(element, nLevel) {
  if (typeof bolLogEnabled !== 'undefined' && bolLogEnabled) console.log('🧩 Handling gallery items');
  const itemElements = element.querySelectorAll('[data-gallery-item]');

  for (const el of itemElements) {
    el.removeAttribute('data-gallery-item');

    const [type, id] = el.id.split('_');
    if (!type || !id) continue;

    let context = null;
    let strWid = null;

    if (type === 'C') {
      const myC = await C.fetch(id);
      context = { C: myC };
      strWid = myC?.T?.WAssoc;
    }

    if (type === 'J') {
      const myJ = await J.fetch(id);
      context = { J: myJ };
      strWid = myJ?.Com?.WAssoc;
    }

    if (!strWid || !context) continue;

    await render(strWid, { nLevel }, [context], el.id, false);
  }
}

/**
 * Rend un layout identifié par strWid avec un contexte partagé et des contextes multiples.
 */
export async function render(strWid, sharedContext = {}, contexts = [], containerId = 'Cmaster', append = false) {
  const container = document.getElementById(containerId);
  if (!container) throw new Error(`❌ Container not found: ${containerId}`);

  const myW = await W.fetch(strWid);
  const layout = myW?.def;
  if (!layout) throw new Error(`❌ Layout not found for W: ${strWid}`);

  for (const ctx of contexts) {
    const context = { ...sharedContext, ...ctx };
    const html = await fillLayout(layout, context);
    const temp = document.createElement('div');
    temp.innerHTML = html.trim();
    const newEl = temp.firstElementChild;

    if (!append) container.innerHTML = '';
    container.appendChild(newEl);

    await handleGallery(newEl, context);

    const nLevel = context?.nLevel || 1;
    if (myW?.nLevels && nLevel < myW.nLevels) {
      await handleGalleryItems(newEl, nLevel);
    }
  }
}