const itemCache = new Map();

/**
 * Returns a cached Hacker News item by ID.
 *
 * @param {number} id
 * @returns {unknown}
 */
export function getCachedItem(id) {
  return itemCache.get(id);
}

/**
 * Stores a Hacker News item in the cache.
 *
 * @param {number} id
 * @param {unknown} item
 */
export function setCachedItem(id, item) {
  itemCache.set(id, item);
}

/**
 * Removes a cached Hacker News item by ID.
 *
 * @param {number} id
 */
export function deleteCachedItem(id) {
  itemCache.delete(id);
}

/**
 * Clears all cached Hacker News items.
 */
export function clearItemCache() {
  itemCache.clear();
}
