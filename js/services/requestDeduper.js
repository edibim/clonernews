/**
 * Shares one in-flight request per key.
 *
 * @param {string} key
 * @param {() => Promise<unknown>} loader
 * @returns {Promise<unknown>}
 */
export function dedupeRequest(key, loader) {}

/**
 * Clears all tracked in-flight requests.
 */
export function clearPendingRequests() {}
