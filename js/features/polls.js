import {
  fetchItem,
  fetchItems,
  requestMaxItem,
} from "../api/client.js";
import {
  KNOWN_POLL_IDS,
  POLL_SCAN_BUDGET,
  POLL_TARGET_COUNT,
} from "../config.js";
import { state } from "../state.js";
import { sortNewestFirst } from "../utils/time.js";

let activeDiscoveryPromise = null;

/**
 * Discovers a bounded, cached Polls feed.
 *
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<Array<object>>}
 */
export async function discoverPolls({ signal } = {}) {
  const feed = state.feeds.polls;

  if (feed.initialized) {
    return feed.items;
  }

  if (activeDiscoveryPromise) {
    return activeDiscoveryPromise;
  }

  const discoveryPromise = runPollDiscovery(feed, signal);

  activeDiscoveryPromise = discoveryPromise;

  try {
    return await discoveryPromise;
  } finally {
    if (activeDiscoveryPromise === discoveryPromise) {
      activeDiscoveryPromise = null;
    }
  }
}

export async function loadPollOptions() {
  throw new Error("loadPollOptions is not implemented");
}

export function validatePollOption() {
  throw new Error("validatePollOption is not implemented");
}

async function runPollDiscovery(feed, signal) {
  feed.loading = true;
  feed.error = null;

  try {
    const maxItem = await requestMaxItem({ signal });

    if (!Number.isSafeInteger(maxItem) || maxItem <= 0) {
      throw new Error("Invalid max item response");
    }

    const recentIds = createRecentIds(maxItem);
    const pollsById = new Map();

    for (
      let cursor = 0;
      cursor < recentIds.length &&
      pollsById.size < POLL_TARGET_COUNT;
      cursor += POLL_TARGET_COUNT
    ) {
      const batchIds = recentIds.slice(
        cursor,
        cursor + POLL_TARGET_COUNT,
      );
      const items = await fetchItems(batchIds, { signal });

      addValidPolls(pollsById, items);
    }

    for (const fallbackId of KNOWN_POLL_IDS) {
      if (
        pollsById.size >= POLL_TARGET_COUNT ||
        pollsById.has(fallbackId)
      ) {
        continue;
      }

      try {
        const fallback = await fetchItem(fallbackId, { signal });

        addValidPolls(pollsById, [fallback]);
      } catch (error) {
        if (error && error.name === "AbortError") {
          throw error;
        }
      }
    }

    const polls = sortNewestFirst(
      [...pollsById.values()].slice(0, POLL_TARGET_COUNT),
    );

    feed.ids = polls.map((poll) => poll.id);
    feed.items = polls;
    feed.cursor = polls.length;
    feed.initialized = true;
    feed.exhausted = true;

    return feed.items;
  } catch (error) {
    feed.error = "Unable to discover polls. Try again.";

    return feed.items;
  } finally {
    feed.loading = false;
  }
}

function createRecentIds(maxItem) {
  const inspectedCount = Math.min(
    POLL_SCAN_BUDGET,
    maxItem,
  );

  return Array.from(
    { length: inspectedCount },
    (_, index) => maxItem - index,
  );
}

function addValidPolls(pollsById, items) {
  for (const item of items) {
    if (
      pollsById.size >= POLL_TARGET_COUNT ||
      !isValidPoll(item)
    ) {
      continue;
    }

    pollsById.set(item.id, item);
  }
}

function isValidPoll(item) {
  return Boolean(
    item &&
      Number.isSafeInteger(item.id) &&
      item.id > 0 &&
      item.type === "poll" &&
      !item.dead &&
      !item.deleted,
  );
}
