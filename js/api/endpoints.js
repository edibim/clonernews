import { API_BASE_URL } from "../config.js";

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