const pendingRequests = new Map();

/**
 * Shares one in-flight request per key.
 *
 * @param {string} key
 * @param {() => Promise<unknown>} loader
 * @returns {Promise<unknown>}
 */
export function dedupeRequest(key, loader) {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const requestPromise = Promise.resolve().then(loader);

  pendingRequests.set(key, requestPromise);

  requestPromise.finally(() => {
    pendingRequests.delete(key);
  });

  return requestPromise;
}

/**
 * Clears all tracked in-flight requests.
 */
export function clearPendingRequests() {
  pendingRequests.clear();
}
