// src-shared-mapApi.js

import { getC } from './types-C.js';
import { getT } from './types-T.js';
import { getJ } from './types-J.js';
import { getW } from './types-W.js';
import { getCom } from './types-Com.js';
import { getiT } from './types-iT.js';
import { getiC } from './types-iC.js';

/**
 * Mappe toutes les entités API en objets plats typés.
 * @param {object} api - Données brutes de l’API (groupées par type)
 * @returns {object} - Objets mappés par type
 */
export function mapApi(api) {
  return {
    C: getC(api.C),
    T: getT(api.T),
    J: getJ(api.J),
    W: getW(api.W),
    Com: getCom(api.Com),
    iT: getiT(api.iT),
    iC: getiC(api.iC)
  };
}