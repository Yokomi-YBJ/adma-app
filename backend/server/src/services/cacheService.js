/**
 * ADMA — Cache serveur en mémoire avec TTL
 * Remplacer par Redis en production
 */
const store = new Map();

export function setCache(key, value, ttlMs = 5 * 60 * 1000) {
  store.set(key, { value, expires: Date.now() + ttlMs });
}

export function getCache(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { store.delete(key); return null; }
  return entry.value;
}

export function invalidateCache(pattern) {
  for (const key of store.keys()) {
    if (key.startsWith(pattern)) store.delete(key);
  }
}

// Nettoyage automatique toutes les 10 min
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now > v.expires) store.delete(k);
  }
}, 10 * 60 * 1000);
