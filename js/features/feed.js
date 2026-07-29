import { fetchItems, requestFeedIds } from "../api/client.js";
import { POST_BATCH_SIZE } from "../config.js";
import { state } from "../state.js";

/**
 * Fetches a category's ID list once, then loads its first page.
 *
 * @param {"stories" | "jobs"} category
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<import("../state.js").FeedState>}
 */
export async function initializeFeed(
  category,
  { signal } = {},
) {
  const feed = getFeedState(category);

  if (feed.initialized || feed.loading) {
    return feed;
  }

  feed.loading = true;
  feed.error = null;

  try {
    const ids = await requestFeedIds(category, { signal });

    if (!Array.isArray(ids)) {
      throw new Error("Invalid feed response");
    }

    feed.ids = [...ids];
    feed.cursor = 0;
    feed.initialized = true;
    feed.exhausted = ids.length === 0;
  } catch (error) {
    feed.error = "Unable to load posts. Try again.";
  } finally {
    feed.loading = false;
  }

  if (feed.initialized && !feed.exhausted) {
    return loadNextPage(category, { signal });
  }

  return feed;
}

/**
 * Loads the next fixed-size group of item IDs from a feed.
 *
 * @param {"stories" | "jobs"} category
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<import("../state.js").FeedState>}
 */
export async function loadNextPage(
  category,
  { signal } = {},
) {
  const feed = getFeedState(category);

  if (feed.loading || feed.exhausted || !feed.initialized) {
    return feed;
  }

  const startCursor = feed.cursor;
  const endCursor = Math.min(
    startCursor + POST_BATCH_SIZE,
    feed.ids.length,
  );
  const pageIds = feed.ids.slice(startCursor, endCursor);

  if (pageIds.length === 0) {
    feed.exhausted = true;
    return feed;
  }

  feed.loading = true;
  feed.error = null;

  try {
    const items = await fetchItems(pageIds, { signal });

    feed.items = [...feed.items, ...items];
    feed.cursor = endCursor;
    feed.exhausted = feed.cursor >= feed.ids.length;
  } catch (error) {
    feed.error = "Unable to load posts. Try again.";
  } finally {
    feed.loading = false;
  }

  return feed;
}

export function mergeFeedItems() {
  throw new Error("mergeFeedItems is not implemented");
}

export function isVisibleTopLevelItem() {
  throw new Error("isVisibleTopLevelItem is not implemented");
}

function getFeedState(category) {
  if (category !== "stories" && category !== "jobs") {
    throw new Error(`Unsupported progressive feed: ${category}`);
  }

  return state.feeds[category];
}
