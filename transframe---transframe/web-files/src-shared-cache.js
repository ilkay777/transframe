// cache.js

/**
 * Crée un cache typé avec expiration TTL.
 * Chaque entrée est stockée avec une date d’expiration.
 */
export function createTypedCache({ ttl = 3600 } = {}) {
  const store = new Map();

  return {
    /**
     * Récupère une entrée du cache si elle est encore valide.
     * @param {string} id - Identifiant de l’objet
     * @param {number} customTTL - TTL personnalisé (en secondes)
     * @returns {object|undefined}
     */
    get(id, customTTL = ttl) {
      const entry = store.get(id);
      if (!entry) return undefined;
      const expired = Date.now() > entry.expiry;
      return expired ? undefined : entry.value;
    },

    /**
     * Ajoute une entrée au cache avec TTL.
     * @param {string} id - Identifiant
     * @param {object} value - Objet à stocker
     * @param {number} customTTL - TTL personnalisé (en secondes)
     */
    set(id, value, customTTL = ttl) {
      store.set(id, {
        value,
        expiry: Date.now() + customTTL * 1000
      });
    },

    /**
     * Supprime une entrée du cache.
     * @param {string} id - Identifiant
     */
    clear(id) {
      store.delete(id);
    },

    /**
     * Vide complètement le cache.
     */
    clearAll() {
      store.clear();
    }
  };
}

/**
 * Cache global typé pour chaque entité métier.
 * Utilisé par mapApi ou les modules par type (C.js, T.js, etc.)
 */
export const cache = {
  T: createTypedCache({ ttl: 3600 }),
  C: createTypedCache({ ttl: 1800 }),
  J: createTypedCache({ ttl: 300 }),
  W: createTypedCache({ ttl: 86400 }),
  Com: createTypedCache({ ttl: 3600 }),
  iT: createTypedCache({ ttl: 3600 }),
  iC: createTypedCache({ ttl: 3600 })
};