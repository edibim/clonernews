import { API_BASE_URL } from "../config.js";

// Builds the Hacker News item endpoint for a valid item ID.
export function getItemUrl(id) {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error("Invalid item id");
    }

    return `${API_BASE_URL}/item/${id}.json`;
}