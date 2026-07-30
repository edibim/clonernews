import { assertEqual, test } from "./runner.js";

import {
  acceptLiveUpdates,
  checkLiveUpdates,
  initializeLiveSnapshot,
  startLiveUpdates,
  stopLiveUpdates,
} from "../js/features/liveUpdates.js";
import { resetState, state } from "../js/state.js";
import { clearItemCache } from "../js/services/itemCache.js";
import { clearPendingRequests } from "../js/services/requestDeduper.js";
import { resetRequestQueue } from "../js/services/requestQueue.js";
import { maxItemFixture, storyFixture, updatesFixture } from "./fixtures.js";

function resetLiveTestState() {
  resetState();
  clearItemCache();
  clearPendingRequests();
  resetRequestQueue();
}

function createJsonResponse(body) {
  return {
    ok: true,
    json: async () => body,
  };
}

test("initializeLiveSnapshot stores the initial max item snapshot", async () => {
  resetLiveTestState();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes("/maxitem.json")) {
      return createJsonResponse(maxItemFixture);
    }

    return createJsonResponse({ items: [], profiles: [] });
  };

  try {
    await initializeLiveSnapshot();

    assertEqual(state.live.lastSeenMaxItem, maxItemFixture);
    assertEqual(state.live.newestObservedMaxItem, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("checkLiveUpdates refreshes known changed items and tracks pending new count", async () => {
  resetLiveTestState();
  state.feeds.stories.items = [storyFixture];
  state.live.lastSeenMaxItem = 5000;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes("/updates.json")) {
      return createJsonResponse({
        items: [storyFixture.id, 9999],
        profiles: [],
      });
    }

    if (url.includes("/maxitem.json")) {
      return createJsonResponse(5002);
    }

    if (url.includes(`/item/${storyFixture.id}.json`)) {
      return createJsonResponse({ ...storyFixture, title: "Updated story" });
    }

    return createJsonResponse(null);
  };

  try {
    await checkLiveUpdates();

    assertEqual(state.live.changedItems.length, 1);
    assertEqual(state.live.changedItems[0].title, "Updated story");
    assertEqual(state.live.pendingNewCount, 2);
    assertEqual(state.live.newestObservedMaxItem, 5002);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("acceptLiveUpdates merges new items without duplicates and updates the last-seen snapshot", async () => {
  resetLiveTestState();
  state.live.lastSeenMaxItem = 5000;
  state.live.newestObservedMaxItem = 5002;
  state.live.pendingNewCount = 2;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes("/item/5001.json")) {
      return createJsonResponse({ ...storyFixture, id: 5001, title: "New story" });
    }

    if (url.includes("/item/5002.json")) {
      return createJsonResponse({ ...storyFixture, id: 5002, title: "Another new story" });
    }

    return createJsonResponse(null);
  };

  try {
    await acceptLiveUpdates("stories");

    assertEqual(state.live.lastSeenMaxItem, 5002);
    assertEqual(state.live.pendingNewCount, 0);
    assertEqual(state.feeds.stories.items[0].id, 5002);
    assertEqual(state.feeds.stories.items[1].id, 5001);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("startLiveUpdates and stopLiveUpdates control one interval", () => {
  resetLiveTestState();

  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  let intervalCount = 0;

  globalThis.setInterval = () => {
    intervalCount += 1;
    return intervalCount;
  };
  globalThis.clearInterval = () => {
    intervalCount -= 1;
  };

  try {
    const firstId = startLiveUpdates(() => {});
    const secondId = startLiveUpdates(() => {});

    assertEqual(firstId, secondId);
    assertEqual(intervalCount, 1);

    stopLiveUpdates();
    assertEqual(intervalCount, 0);
  } finally {
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  }
});
