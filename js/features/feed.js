import { fetchItems, requestFeedIds } from "../api/client.js";
import { POST_BATCH_SIZE } from "../config.js";
import { state } from "../state.js";
import { sortNewestFirst } from "../utils/time.js";

const MAX_INSPECTED_IDS_PER_PAGE = POST_BATCH_SIZE * 3;

const ITEM_TYPE_BY_CATEGORY = Object.freeze({
  stories: "story",
  jobs: "job",
  polls: "poll",
});

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

    feed.ids = ids.filter(
      (id) => Number.isSafeInteger(id) && id > 0,
    );
    feed.cursor = 0;
    feed.initialized = true;
    feed.exhausted = feed.ids.length === 0;
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

  if (feed.cursor >= feed.ids.length) {
    feed.exhausted = true;
    return feed;
  }

  feed.loading = true;
  feed.error = null;

  try {
    const knownItemIds = new Set(
      feed.items.map((item) => item.id),
    );
    const visibleItems = [];
    let inspectedCount = 0;
    let nextCursor = feed.cursor;

    while (
      visibleItems.length < POST_BATCH_SIZE &&
      inspectedCount < MAX_INSPECTED_IDS_PER_PAGE &&
      nextCursor < feed.ids.length
    ) {
      const remainingSlots =
        POST_BATCH_SIZE - visibleItems.length;
      const remainingInspectionBudget =
        MAX_INSPECTED_IDS_PER_PAGE - inspectedCount;
      const chunkSize = Math.min(
        remainingSlots,
        remainingInspectionBudget,
      );
      const endCursor = Math.min(
        nextCursor + chunkSize,
        feed.ids.length,
      );
      const pageIds = feed.ids.slice(nextCursor, endCursor);
      const items = await fetchItems(pageIds, { signal });

      inspectedCount += pageIds.length;
      nextCursor = endCursor;

      for (const item of items) {
        if (
          !isVisibleTopLevelItem(item, category) ||
          knownItemIds.has(item.id)
        ) {
          continue;
        }

        knownItemIds.add(item.id);
        visibleItems.push(item);
      }
    }

    mergeFeedItems(category, visibleItems);
    feed.cursor = nextCursor;
    feed.exhausted = feed.cursor >= feed.ids.length;
  } catch (error) {
    feed.error = "Unable to load posts. Try again.";
  } finally {
    feed.loading = false;
  }

  return feed;
}

/**
 * Merges visible items into a feed without duplicates.
 * A newer copy of an existing ID replaces the stored record.
 *
 * @param {"stories" | "jobs"} category
 * @param {Array<object>} incomingItems
 * @returns {Array<object>}
 */
export function mergeFeedItems(category, incomingItems) {
  const feed = getFeedState(category);
  const itemsById = new Map();

  for (const item of feed.items) {
    if (item && Number.isSafeInteger(item.id)) {
      itemsById.set(item.id, item);
    }
  }

  for (const item of incomingItems) {
    if (isVisibleTopLevelItem(item, category)) {
      itemsById.set(item.id, item);
    }
  }

  feed.items = sortNewestFirst([...itemsById.values()]);

  return feed.items;
}

/**
 * Checks whether an API item can appear in the selected feed.
 *
 * @param {object|null} item
 * @param {"stories" | "jobs" | "polls"} category
 * @returns {boolean}
 */
export function isVisibleTopLevelItem(item, category) {
  const expectedType = ITEM_TYPE_BY_CATEGORY[category];

  return Boolean(
    item &&
      expectedType &&
      Number.isSafeInteger(item.id) &&
      item.id > 0 &&
      !item.dead &&
      !item.deleted &&
      item.type === expectedType,
  );
}

function getFeedState(category) {
  if (category !== "stories" && category !== "jobs") {
    throw new Error(`Unsupported progressive feed: ${category}`);
  }

  return state.feeds[category];
}
