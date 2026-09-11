import {
  ALGOLIA_POLL_CANDIDATE_LIMIT,
  ALGOLIA_POLL_SEARCH_URL,
  API_BASE_URL,
} from "../config.js";

/**
 * Builds the Hacker News item endpoint for a valid item ID.
 *
 * @param {number} id
 * @returns {string}
 */
export function getItemUrl(id) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid item id");
  }

  return `${API_BASE_URL}/item/${id}.json`;
}

/**
 * Builds the Hacker News feed endpoint for a supported category.
 *
 * @param {string} category
 * @returns {string}
 */
export function getFeedUrl(category) {
  if (category === "stories") {
    return `${API_BASE_URL}/newstories.json`;
  }

  if (category === "jobs") {
    return `${API_BASE_URL}/jobstories.json`;
  }

  throw new Error("Unsupported feed category");
}

/**
 * Builds the Hacker News max item endpoint.
 *
 * @returns {string}
 */
export function getMaxItemUrl() {
  return `${API_BASE_URL}/maxitem.json`;
}

/**
 * Builds the Hacker News updates endpoint.
 *
 * @returns {string}
 */
export function getUpdatesUrl() {
  return `${API_BASE_URL}/updates.json`;
}

/**
 * Builds the Algolia HN Search endpoint for discovering candidate poll IDs.
 * Poll data itself is never sourced from this endpoint.
 *
 * @param {{ limit?: number }} [options]
 * @returns {string}
 */
export function getAlgoliaPollSearchUrl({
  limit = ALGOLIA_POLL_CANDIDATE_LIMIT,
} = {}) {
  if (!Number.isSafeInteger(limit) || limit <= 0) {
    throw new Error("Invalid poll candidate limit");
  }

  return `${ALGOLIA_POLL_SEARCH_URL}&hitsPerPage=${limit}`;
}
