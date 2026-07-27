/**
 * Enqueues a request loader with concurrency control.
 *
 * @param {() => Promise<unknown>} loader
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<unknown>}
 */
export function enqueueRequest(loader, { signal } = {}) {}

/**
 * Returns current queue statistics.
 *
 * @returns {unknown}
 */
export function getQueueStats() {}

/**
 * Resets all queue bookkeeping.
 */
export function resetRequestQueue() {}
