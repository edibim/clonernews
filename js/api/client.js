import {
  getFeedUrl,
  getItemUrl,
  getMaxItemUrl,
  getUpdatesUrl,
} from "./endpoints.js";

import {
  getCachedItem,
  setCachedItem,
} from "../services/itemCache.js";
import { dedupeRequest } from "../services/requestDeduper.js";
import { enqueueRequest } from "../services/requestQueue.js";

/**
 * Fetches JSON data from a URL.
 *
 * @param {string} url
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<unknown>}
 */
export async function fetchJson(url, { signal } = {}) {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }

  const data = await response.json();

  return data;
}

/**
 * Requests a Hacker News item by ID.
 *
 * @param {number} id
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<unknown>}
 */
export async function requestItem(id, { signal } = {}) {
  const url = getItemUrl(id);

  return fetchJson(url, { signal });
}

/**
 * Requests Hacker News feed IDs for a supported category.
 *
 * @param {string} category
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<unknown>}
 */
export async function requestFeedIds(category, { signal } = {}) {
  const url = getFeedUrl(category);

  return fetchJson(url, { signal });
}

/**
 * Requests the current maximum Hacker News item ID.
 *
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<unknown>}
 */
export async function requestMaxItem({ signal } = {}) {
  const url = getMaxItemUrl();

  return fetchJson(url, { signal });
}

/**
 * Requests Hacker News update metadata.
 *
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<unknown>}
 */
export async function requestUpdates({ signal } = {}) {
  const url = getUpdatesUrl();

  return fetchJson(url, { signal });
}

/**
 * Fetches a Hacker News item with cache, deduplication, and queue control.
 *
 * @param {number} id
 * @param {{ forceRefresh?: boolean, signal?: AbortSignal }} [options]
 * @returns {Promise<unknown>}
 */
export async function fetchItem(id, { forceRefresh = false, signal } = {}) {
  const cachedItem = getCachedItem(id);

  if (!forceRefresh && cachedItem !== undefined) {
    return cachedItem;
  }

  return dedupeRequest(`item:${id}`, async () => {
    const item = await enqueueRequest(
      () => requestItem(id, { signal }),
      { signal },
    );

    setCachedItem(id, item);

    return item;
  });
}

/**
 * Fetches multiple Hacker News items while preserving input order.
 *
 * @param {number[]} ids
 * @param {{ forceRefresh?: boolean, signal?: AbortSignal }} [options]
 * @returns {Promise<unknown[]>}
 */
export async function fetchItems(ids, options = {}) {
  const uniqueIds = [];
  const seenIds = new Set();

  for (const id of ids) {
    if (!seenIds.has(id)) {
      seenIds.add(id);
      uniqueIds.push(id);
    }
  }

  const resultsById = new Map();

  await Promise.all(
    uniqueIds.map(async (id) => {
      const item = await fetchItem(id, options);
      resultsById.set(id, item);
    }),
  );

  return ids.map((id) => resultsById.get(id));
}
