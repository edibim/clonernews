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

  let requestPromise;

  try {
    requestPromise = Promise.resolve(loader());
  } catch (error) {
    requestPromise = Promise.reject(error);
  }

  pendingRequests.set(key, requestPromise);

  requestPromise.then(
    () => {
      pendingRequests.delete(key);
    },
    () => {
      pendingRequests.delete(key);
    },
  );

  return requestPromise;
}

/**
 * Clears all tracked in-flight requests.
 */
export function clearPendingRequests() {
  pendingRequests.clear();
}
