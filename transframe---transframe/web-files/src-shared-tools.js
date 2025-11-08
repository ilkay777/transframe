// src-shared-tools.js

// 🧮 Utils — fonctions génériques

/**
 * Normalise une entrée en tableau.
 * @param {any} input - tableau ou élément unique
 * @returns {Array}
 */
export function normalizeArray(input) {
  return Array.isArray(input) ? input : [input];
}

/**
 * Vérifie si un objet contient toutes les clés spécifiées.
 * @param {object} obj - objet à tester
 * @param {string[]} keys - liste de clés attendues
 * @returns {boolean}
 */
export function isMapped(obj, keys) {
  return obj && keys.every(k => obj[k] !== undefined);
}

// 🎨 Icons et statuts

/**
 * Icônes associées aux statuts métier.
 */
export const strIcon = {
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

/**
 * Formate un statut en icône.
 * @param {string} status - statut brut
 * @returns {string} - icône correspondante
 */
export function formatStatus(status) {
  return strIcon[status?.toLowerCase()] || strIcon.unknown;
}

/**
 * Transforme un objet structuré en HTML interactif.
 * Gère les objets imbriqués, les primitives, et les valeurs nulles.
 * @param {object} Jout - Objet à transformer
 * @returns {string} - HTML généré
 */
export function JoutHtml(Jout) {
  if (!Jout || typeof Jout !== 'object') return '';

  const render = value => {
    if (value === null || value === undefined)
      return `<span class="Jout-null">null</span>`;

    if (typeof value !== 'object')
      return `<span class="Jout-primitive">${value}</span>`;

    return Object.entries(value)
      .map(([key, val]) => {
        const inner = val?.value ?? val;
        return `
          <div class="Jout-item">
            <span class="Jout-key" onclick="this.nextElementSibling.classList.toggle('visible')">
              ${key}
            </span>
            <div class="Jout-value">${render(inner)}</div>
          </div>
        `;
      })
      .join('');
  };

  return `<div class="Jout-container">${render(Jout)}</div>`;
}