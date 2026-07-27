import {
  getFeedUrl,
  getItemUrl,
  getMaxItemUrl,
  getUpdatesUrl,
} from "./endpoints.js";

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