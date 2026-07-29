import { assert, assertEqual, test } from "./runner.js";

import {
  initializeFeed,
  isVisibleTopLevelItem,
  loadNextPage,
  mergeFeedItems,
} from "../js/features/feed.js";
import {
  createPostCard,
  renderFeedItems,
  renderFeedView,
} from "../js/ui/feedView.js";
import {
  closePostDetail,
  openPostDetail,
  renderPostDetail,
} from "../js/ui/detailView.js";
import { renderShell } from "../js/ui/shell.js";
import { resetState, state } from "../js/state.js";
import { clearItemCache } from "../js/services/itemCache.js";
import { clearPendingRequests } from "../js/services/requestDeduper.js";
import { resetRequestQueue } from "../js/services/requestQueue.js";
import {
  createMockFetch,
  createMockResponse,
} from "./mockFetch.js";
import {
  jobFixture,
  pollFixture,
  storyFixture,
} from "./fixtures.js";

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

function createDeferred() {
  let resolve;

  const promise = new Promise((promiseResolve) => {
    resolve = promiseResolve;
  });

  return {
    promise,
    resolve,
  };
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

test("an active feed request disables Load more", () => {
  resetFeedTestState();

  const root = document.createElement("div");
  document.body.append(root);

  try {
    renderShell(root);

    state.feeds.stories.loading = true;
    renderFeedView(root, "stories");

    const loadMoreButton = root.querySelector("#load-more");

    assertEqual(loadMoreButton.disabled, true);
    assertEqual(loadMoreButton.textContent, "Loading...");
    assertEqual(
      root.querySelector("#feed-list").getAttribute("aria-busy"),
      "true",
    );
  } finally {
    root.remove();
  }
});

test("story, job, and poll cards show their required metadata", () => {
  const storyCard = createPostCard(storyFixture);
  const jobCard = createPostCard(jobFixture);
  const pollCard = createPostCard(pollFixture);

  assert(storyCard.textContent.includes("Test story"));
  assert(storyCard.textContent.includes("alice"));
  assert(storyCard.textContent.includes("120 points"));
  assert(storyCard.textContent.includes("2 comments"));
  assert(storyCard.textContent.includes("example.com"));
  assert(storyCard.querySelector("time"));

  const externalLink = storyCard.querySelector(
    '[data-action="external"]',
  );

  assert(externalLink);
  assertEqual(externalLink.target, "_blank");
  assert(externalLink.rel.includes("noopener"));
  assert(storyCard.querySelector('[data-action="open-detail"]'));

  assert(jobCard.textContent.includes("Frontend Developer"));
  assert(jobCard.textContent.includes("example-company"));
  assert(jobCard.textContent.includes("Remote role"));
  assert(jobCard.querySelector("time"));

  assert(pollCard.textContent.includes("Which language"));
  assert(pollCard.textContent.includes("bob"));
  assert(pollCard.textContent.includes("42 points"));
  assert(pollCard.textContent.includes("1 comment"));
  assert(pollCard.textContent.includes("2 options"));
});

test("post cards tolerate missing optional fields", () => {
  const card = createPostCard({
    id: 70_001,
    type: "story",
  });

  assert(card.textContent.includes("Untitled item"));
  assert(card.textContent.includes("unknown user"));
  assert(card.textContent.includes("0 comments"));
});

test("post cards sanitize unsafe titles and body text", () => {
  const card = createPostCard({
    id: 70_002,
    type: "job",
    title: '<img src=x onerror="alert(1)">Unsafe title',
    text: '<p>Safe <strong>preview</strong></p><script>alert(1)</script>',
  });

  assertEqual(card.querySelector("img"), null);
  assertEqual(card.querySelector("script"), null);
  assert(card.textContent.includes("Unsafe title"));
  assert(card.querySelector("strong"));
});

test("invalid external URLs are not rendered as links", () => {
  const card = createPostCard({
    id: 70_003,
    type: "story",
    title: "Unsafe link",
    url: "javascript:alert(1)",
  });

  assertEqual(
    card.querySelector('[data-action="external"]'),
    null,
  );
  assert(card.querySelector('[data-action="open-detail"]'));
});

test("renderFeedItems replaces the list with semantic post cards", () => {
  const container = document.createElement("ul");

  renderFeedItems(container, [
    storyFixture,
    jobFixture,
  ]);

  assertEqual(container.children.length, 2);
  assertEqual(container.children[0].tagName, "LI");
  assert(container.querySelector('[data-post-id="1001"]'));
  assert(container.querySelector('[data-post-id="1002"]'));
});

test("null and deleted detail items render a stable unavailable state", () => {
  const nullDetail = renderPostDetail(null);
  const deletedDetail = renderPostDetail({
    id: 70_004,
    type: "story",
    deleted: true,
  });

  assert(nullDetail.classList.contains("detail-unavailable"));
  assert(deletedDetail.classList.contains("detail-unavailable"));
  assert(nullDetail.textContent.includes("unavailable"));
  assert(deletedDetail.textContent.includes("unavailable"));
});

test("post detail sanitizes unsafe API content", () => {
  const detail = renderPostDetail({
    id: 70_005,
    type: "job",
    title: "<script>alert(1)</script>Safe title",
    text: '<p onclick="alert(1)">Safe <em>body</em></p>',
    url: "javascript:alert(1)",
  });

  assertEqual(detail.querySelector("script"), null);
  assertEqual(detail.querySelector("[onclick]"), null);
  assertEqual(
    detail.querySelector('[data-action="external"]'),
    null,
  );
  assert(detail.textContent.includes("Safe title"));
  assert(detail.querySelector("em"));
});

test("stale detail responses cannot replace the selected post", async () => {
  resetFeedTestState();

  const originalFetch = globalThis.fetch;
  const firstResponse = createDeferred();
  const secondResponse = createDeferred();
  const root = document.createElement("div");

  document.body.append(root);
  renderShell(root);

  const dialog = root.querySelector("#post-detail");

  dialog.showModal = () => {
    dialog.setAttribute("open", "");
  };
  dialog.close = () => {
    dialog.removeAttribute("open");
  };

  globalThis.fetch = (url) => {
    if (url.includes("/item/70006.json")) {
      return firstResponse.promise;
    }

    return secondResponse.promise;
  };

  try {
    const firstOpen = openPostDetail(70_006);
    const secondOpen = openPostDetail(70_007);

    secondResponse.resolve(
      createMockResponse({
        body: {
          id: 70_007,
          type: "story",
          title: "Current post",
        },
      }),
    );
    await secondOpen;

    firstResponse.resolve(
      createMockResponse({
        body: {
          id: 70_006,
          type: "story",
          title: "Stale post",
        },
      }),
    );
    await firstOpen;

    assertEqual(state.selectedPostId, 70_007);
    assert(
      root
        .querySelector("#detail-content")
        .textContent.includes("Current post"),
    );
    assertEqual(
      root
        .querySelector("#detail-content")
        .textContent.includes("Stale post"),
      false,
    );

    closePostDetail();
    assertEqual(state.selectedPostId, null);
  } finally {
    globalThis.fetch = originalFetch;
    root.remove();
  }
});
