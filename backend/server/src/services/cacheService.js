/**
 * ADMA — Cache serveur en mémoire avec TTL et protection mémoire (LRU / max entries)
 * Conçu pour minimiser la mémoire sur Render (512MB RAM) et réduire la charge sur TiDB
 */
const MAX_ENTRIES = 500;
const store = new Map();

export function setCache(key, value, ttlMs = 5 * 60 * 1000) {
  // Eviction si limite atteinte
  if (store.size >= MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of store.entries()) {
      if (now > v.expires) store.delete(k);
    }
    // Si toujours saturé, évincer les plus anciens (première entrée du Map)
    while (store.size >= MAX_ENTRIES) {
      const oldestKey = store.keys().next().value;
      if (oldestKey) store.delete(oldestKey);
      else break;
    }
  }
  store.set(key, { value, expires: Date.now() + ttlMs });
}

export function getCache(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function invalidateCache(pattern) {
  for (const key of store.keys()) {
    if (key.startsWith(pattern)) store.delete(key);
  }
}

// Nettoyage périodique toutes les 5 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now > v.expires) store.delete(k);
  }
}, 5 * 60 * 1000);

if (cleanupInterval.unref) cleanupInterval.unref();
