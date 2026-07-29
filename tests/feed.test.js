import { assert, assertEqual, test } from "./runner.js";

import {
  initializeFeed,
  isVisibleTopLevelItem,
  loadNextPage,
  mergeFeedItems,
} from "../js/features/feed.js";
import { renderFeedView } from "../js/ui/feedView.js";
import { renderShell } from "../js/ui/shell.js";
import { resetState, state } from "../js/state.js";
import { clearItemCache } from "../js/services/itemCache.js";
import { clearPendingRequests } from "../js/services/requestDeduper.js";
import { resetRequestQueue } from "../js/services/requestQueue.js";
import { createMockFetch } from "./mockFetch.js";

function createIds(start, count) {
  return Array.from(
    { length: count },
    (_, index) => start + index,
  );
}

function createItem(id, type = "story") {
  return {
    id,
    type,
    time: id,
    title: `Item ${id}`,
  };
}

function createItemResponses(ids, type = "story") {
  return ids.map((id) => ({
    body: createItem(id, type),
  }));
}

function resetFeedTestState() {
  resetState();
  clearItemCache();
  clearPendingRequests();
  resetRequestQueue();
}

async function withMockFetch(responses, callback) {
  const originalFetch = globalThis.fetch;
  const mockFetch = createMockFetch(responses);

  globalThis.fetch = mockFetch;

  try {
    await callback(mockFetch);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("initial feed load requests one list and one 15-ID batch", async () => {
  resetFeedTestState();

  const ids = createIds(10_000, 30);

  await withMockFetch(
    [
      { body: ids },
      ...createItemResponses(ids.slice(0, 15)),
    ],
    async (mockFetch) => {
      await initializeFeed("stories");

      assertEqual(mockFetch.calls.length, 16);
      assertEqual(
        mockFetch.calls[0].url,
        "https://hacker-news.firebaseio.com/v0/newstories.json",
      );
      assertEqual(state.feeds.stories.cursor, 15);
      assertEqual(state.feeds.stories.items.length, 15);
      assertEqual(state.feeds.stories.initialized, true);
    },
  );
});

test("a second page begins at the saved feed cursor", async () => {
  resetFeedTestState();

  const ids = createIds(20_000, 30);
  const feed = state.feeds.stories;

  feed.ids = ids;
  feed.initialized = true;

  await withMockFetch(
    createItemResponses(ids),
    async (mockFetch) => {
      await loadNextPage("stories");
      await loadNextPage("stories");

      assertEqual(state.feeds.stories.cursor, 30);
      assertEqual(mockFetch.calls.length, 30);
      assertEqual(
        mockFetch.calls[15].url,
        "https://hacker-news.firebaseio.com/v0/item/20015.json",
      );
    },
  );
});

test("merged feed results are newest-first regardless of source order", () => {
  resetFeedTestState();

  mergeFeedItems("stories", [
    createItem(1),
    createItem(3),
    createItem(2),
  ]);

  assertEqual(state.feeds.stories.items[0].id, 3);
  assertEqual(state.feeds.stories.items[1].id, 2);
  assertEqual(state.feeds.stories.items[2].id, 1);
});

test("null, dead, deleted, and wrong-type records are excluded", () => {
  resetFeedTestState();

  assertEqual(isVisibleTopLevelItem(null, "stories"), false);
  assertEqual(
    isVisibleTopLevelItem(
      { ...createItem(1), dead: true },
      "stories",
    ),
    false,
  );
  assertEqual(
    isVisibleTopLevelItem(
      { ...createItem(2), deleted: true },
      "stories",
    ),
    false,
  );
  assertEqual(
    isVisibleTopLevelItem(createItem(3, "job"), "stories"),
    false,
  );
  assertEqual(
    isVisibleTopLevelItem(createItem(4, "story"), "stories"),
    true,
  );
  assertEqual(
    isVisibleTopLevelItem(createItem(5, "job"), "jobs"),
    true,
  );
});

test("loading continues past unusable records until 15 items are visible", async () => {
  resetFeedTestState();

  const ids = createIds(30_000, 30);
  const feed = state.feeds.stories;

  feed.ids = ids;
  feed.initialized = true;

  await withMockFetch(
    [
      ...ids.slice(0, 15).map(() => ({ body: null })),
      ...createItemResponses(ids.slice(15)),
    ],
    async (mockFetch) => {
      await loadNextPage("stories");

      assertEqual(mockFetch.calls.length, 30);
      assertEqual(feed.cursor, 30);
      assertEqual(feed.items.length, 15);
    },
  );
});

test("one page inspects no more than 45 IDs", async () => {
  resetFeedTestState();

  const ids = createIds(40_000, 60);
  const feed = state.feeds.stories;

  feed.ids = ids;
  feed.initialized = true;

  await withMockFetch(
    ids.slice(0, 45).map(() => ({ body: null })),
    async (mockFetch) => {
      await loadNextPage("stories");

      assertEqual(mockFetch.calls.length, 45);
      assertEqual(feed.cursor, 45);
      assertEqual(feed.exhausted, false);
    },
  );
});

test("merging duplicate item IDs does not create duplicate cards", () => {
  resetFeedTestState();

  mergeFeedItems("stories", [
    createItem(1),
    createItem(2),
  ]);
  mergeFeedItems("stories", [
    createItem(2),
    createItem(3),
  ]);

  assertEqual(state.feeds.stories.items.length, 3);
  assertEqual(
    state.feeds.stories.items.filter((item) => item.id === 2).length,
    1,
  );
});

test("concurrent Load more calls request only one batch", async () => {
  resetFeedTestState();

  const ids = createIds(50_000, 30);
  const feed = state.feeds.stories;

  feed.ids = ids;
  feed.initialized = true;

  await withMockFetch(
    createItemResponses(ids.slice(0, 15)),
    async (mockFetch) => {
      await Promise.all([
        loadNextPage("stories"),
        loadNextPage("stories"),
      ]);

      assertEqual(mockFetch.calls.length, 15);
      assertEqual(feed.cursor, 15);
      assertEqual(feed.items.length, 15);
    },
  );
});

test("a failed page exposes retry without advancing its cursor", async () => {
  resetFeedTestState();

  const ids = createIds(60_000, 15);
  const feed = state.feeds.stories;

  feed.ids = ids;
  feed.initialized = true;

  await withMockFetch(
    [
      { reject: new Error("Network unavailable") },
      ...createItemResponses(ids.slice(1)),
    ],
    async () => {
      await loadNextPage("stories");
    },
  );

  assertEqual(feed.cursor, 0);
  assertEqual(feed.loading, false);
  assertEqual(typeof feed.error, "string");

  const root = document.createElement("div");
  document.body.append(root);

  try {
    renderShell(root);
    renderFeedView(root, "stories");

    const loadMoreButton = root.querySelector("#load-more");

    assertEqual(loadMoreButton.disabled, false);
    assertEqual(loadMoreButton.textContent, "Retry");
  } finally {
    root.remove();
  }
});

test("an exhausted feed disables Load more", () => {
  resetFeedTestState();

  const root = document.createElement("div");
  document.body.append(root);

  try {
    renderShell(root);

    state.feeds.stories.exhausted = true;
    renderFeedView(root, "stories");

    const loadMoreButton = root.querySelector("#load-more");

    assertEqual(loadMoreButton.disabled, true);
    assertEqual(loadMoreButton.textContent, "No more posts");
  } finally {
    root.remove();
  }
});
