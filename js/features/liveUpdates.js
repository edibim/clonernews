import {
  fetchItem,
  requestMaxItem,
  requestUpdates,
} from "../api/client.js";
import {
  LIVE_INTERVAL_MS,
  LIVE_NEW_ITEM_FETCH_CAP,
} from "../config.js";
import { state } from "../state.js";
import { sortNewestFirst } from "../utils/time.js";
import { renderLiveView } from "../ui/liveView.js";

let liveIntervalId = null;
let liveCallback = null;

/**
 * Initializes the live-update snapshot from the API.
 *
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<object>}
 */
export async function initializeLiveSnapshot({ signal } = {}) {
  const maxItem = await requestMaxItem({ signal });

  if (!Number.isSafeInteger(maxItem) || maxItem <= 0) {
    state.live.lastSeenMaxItem = null;
    state.live.newestObservedMaxItem = null;
    return state.live;
  }

  state.live.lastSeenMaxItem = maxItem;
  state.live.newestObservedMaxItem = null;
  state.live.pendingNewCount = 0;
  state.live.error = null;

  return state.live;
}

/**
 * Starts periodic live checks.
 *
 * @param {(state: object) => void} onUpdate
 * @returns {number|null}
 */
export function startLiveUpdates(onUpdate) {
  if (liveIntervalId !== null) {
    return liveIntervalId;
  }

  liveCallback = typeof onUpdate === "function" ? onUpdate : null;

  liveIntervalId = globalThis.setInterval(() => {
    void checkLiveUpdates();

    if (liveCallback) {
      liveCallback(state.live);
    }
  }, LIVE_INTERVAL_MS);

  return liveIntervalId;
}

/**
 * Stops periodic live checks.
 */
export function stopLiveUpdates() {
  if (liveIntervalId !== null) {
    globalThis.clearInterval(liveIntervalId);
    liveIntervalId = null;
  }

  liveCallback = null;
}

/**
 * Checks for changed and new items based on the Hacker News updates API.
 *
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<object>}
 */
export async function checkLiveUpdates({ signal } = {}) {
  if (state.live.checking) {
    return state.live;
  }

  state.live.checking = true;
  state.live.error = null;

  try {
    const [updates, maxItem] = await Promise.all([
      requestUpdates({ signal }),
      requestMaxItem({ signal }),
    ]);

    if (!updates || typeof updates !== "object") {
      throw new Error("Invalid live update payload");
    }

    const changedIds = Array.isArray(updates.items)
      ? updates.items.filter((id) => Number.isSafeInteger(id) && id > 0)
      : [];

    const knownIds = new Set();

    for (const feed of Object.values(state.feeds)) {
      for (const item of feed.items) {
        if (Number.isSafeInteger(item?.id)) {
          knownIds.add(item.id);
        }
      }
    }

    const relevantChangedIds = changedIds.filter((id) => knownIds.has(id));

    if (relevantChangedIds.length > 0) {
      const refreshedItems = [];
      const changedIdsToRefresh = relevantChangedIds.slice(0, 10);

      for (const id of changedIdsToRefresh) {
        const item = await fetchItem(id, {
          forceRefresh: true,
          signal,
        });
        refreshedItems.push(item);
      }

      state.live.changedItems = refreshedItems.filter(Boolean);
    } else {
      state.live.changedItems = [];
    }

    const latestMaxItem =
      Number.isSafeInteger(maxItem) && maxItem > 0
        ? maxItem
        : null;

    if (Number.isSafeInteger(state.live.lastSeenMaxItem)) {
      const pendingNewCount =
        latestMaxItem !== null &&
        latestMaxItem > state.live.lastSeenMaxItem
          ? Math.max(0, latestMaxItem - state.live.lastSeenMaxItem)
          : 0;

      state.live.pendingNewCount = pendingNewCount;
    } else {
      state.live.pendingNewCount = 0;
    }

    state.live.newestObservedMaxItem = latestMaxItem;
  } catch (error) {
    state.live.error = "Unable to check for updates. Try again.";
  } finally {
    state.live.checking = false;
  }

  const liveContainer = document.querySelector("#live-updates");

  if (liveContainer) {
    renderLiveView(liveContainer);
  }

  return state.live;
}

/**
 * Accepts pending live updates for a category.
 *
 * @param {"stories" | "jobs" | "polls"} category
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<object>}
 */
export async function acceptLiveUpdates(category, { signal } = {}) {
  const feed = state.feeds[category];
  const latestMaxItem = state.live.newestObservedMaxItem;
  const previousMaxItem = state.live.lastSeenMaxItem;

  if (
    !Number.isSafeInteger(latestMaxItem) ||
    !Number.isSafeInteger(previousMaxItem)
  ) {
    return state.live;
  }

  const candidateIds = [];

  for (let id = previousMaxItem + 1; id <= latestMaxItem; id += 1) {
    candidateIds.push(id);
  }

  const limitedCandidates = candidateIds.slice(0, LIVE_NEW_ITEM_FETCH_CAP);
  const visibleItems = [];
  const seenIds = new Set(feed.items.map((item) => item.id));

  for (const id of limitedCandidates) {
    const item = await fetchItem(id, { signal });

    if (!isRenderableLiveItem(item, category) || seenIds.has(item.id)) {
      continue;
    }

    seenIds.add(item.id);
    visibleItems.push(item);
  }

  if (visibleItems.length > 0) {
    feed.items = sortNewestFirst([...feed.items, ...visibleItems]);
  }

  state.live.pendingNewCount = 0;
  state.live.changedItems = [];
  state.live.lastSeenMaxItem = latestMaxItem;
  state.live.newestObservedMaxItem = latestMaxItem;
  state.live.error = null;

  const liveContainer = document.querySelector("#live-updates");

  if (liveContainer) {
    renderLiveView(liveContainer);
  }

  return state.live;
}

function isRenderableLiveItem(item, category) {
  return Boolean(
    item &&
      typeof item === "object" &&
      Number.isSafeInteger(item.id) &&
      item.id > 0 &&
      !item.dead &&
      !item.deleted &&
      ((category === "stories" && item.type === "story") ||
        (category === "jobs" && item.type === "job") ||
        (category === "polls" && item.type === "poll")),
  );
}
