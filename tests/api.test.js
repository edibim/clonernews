import { assertEqual, test } from "./runner.js";

import {
  fetchJson,
  requestFeedIds,
  requestItem,
  requestMaxItem,
  requestUpdates,
} from "../js/api/client.js";

import {
  getFeedUrl,
  getItemUrl,
  getMaxItemUrl,
  getUpdatesUrl,
} from "../js/api/endpoints.js";

import { createMockFetch } from "./mockFetch.js";

test("getItemUrl builds the official item URL", () => {
  assertEqual(
    getItemUrl(8863),
    "https://hacker-news.firebaseio.com/v0/item/8863.json",
  );
});

test("getItemUrl rejects invalid item IDs", () => {
  const invalidIds = [0, -1, 1.5, "8863", Number.NaN];

  for (const id of invalidIds) {
    let receivedError = null;

    try {
      getItemUrl(id);
    } catch (error) {
      receivedError = error;
    }

    assertEqual(receivedError instanceof Error, true);
  }
});

test("getFeedUrl builds the stories feed URL", () => {
  assertEqual(
    getFeedUrl("stories"),
    "https://hacker-news.firebaseio.com/v0/newstories.json",
  );
});

test("getFeedUrl builds the jobs feed URL", () => {
  assertEqual(
    getFeedUrl("jobs"),
    "https://hacker-news.firebaseio.com/v0/jobstories.json",
  );
});

test("getFeedUrl rejects unsupported feed categories", () => {
  let receivedError = null;

  try {
    getFeedUrl("polls");
  } catch (error) {
    receivedError = error;
  }

  assertEqual(receivedError instanceof Error, true);
});

test("getMaxItemUrl builds the max item URL", () => {
  assertEqual(
    getMaxItemUrl(),
    "https://hacker-news.firebaseio.com/v0/maxitem.json",
  );
});

test("getUpdatesUrl builds the updates URL", () => {
  assertEqual(
    getUpdatesUrl(),
    "https://hacker-news.firebaseio.com/v0/updates.json",
  );
});

test("fetchJson returns parsed JSON for a successful response", async () => {
  const originalFetch = globalThis.fetch;
  const mockFetch = createMockFetch([
    {
      body: {
        id: 1001,
        type: "story",
      },
    },
  ]);

  globalThis.fetch = mockFetch;

  try {
    const data = await fetchJson("/item/1001.json");

    assertEqual(data.id, 1001);
    assertEqual(data.type, "story");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchJson throws for an HTTP error response", async () => {
  const originalFetch = globalThis.fetch;
  const mockFetch = createMockFetch([
    {
      body: {
        error: "Not found",
      },
      status: 404,
    },
  ]);

  globalThis.fetch = mockFetch;
  let receivedError = null;

  try {
    await fetchJson("/missing.json");
  } catch (error) {
    receivedError = error;
  } finally {
    globalThis.fetch = originalFetch;
  }

  assertEqual(receivedError instanceof Error, true);
  assertEqual(receivedError.message, "HTTP error 404");
});

test("requestItem requests the item endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const mockFetch = createMockFetch([
    {
      body: {
        id: 8863,
      },
    },
  ]);

  globalThis.fetch = mockFetch;

  try {
    await requestItem(8863);

    assertEqual(
      mockFetch.calls[0].url,
      "https://hacker-news.firebaseio.com/v0/item/8863.json",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requestFeedIds requests the selected feed endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const mockFetch = createMockFetch([
    {
      body: [1001, 1002],
    },
  ]);

  globalThis.fetch = mockFetch;

  try {
    await requestFeedIds("stories");

    assertEqual(
      mockFetch.calls[0].url,
      "https://hacker-news.firebaseio.com/v0/newstories.json",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requestMaxItem requests the max item endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const mockFetch = createMockFetch([
    {
      body: 6000,
    },
  ]);

  globalThis.fetch = mockFetch;

  try {
    await requestMaxItem();

    assertEqual(
      mockFetch.calls[0].url,
      "https://hacker-news.firebaseio.com/v0/maxitem.json",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requestUpdates requests the updates endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const mockFetch = createMockFetch([
    {
      body: {
        items: [1001],
        profiles: [],
      },
    },
  ]);

  globalThis.fetch = mockFetch;

  try {
    await requestUpdates();

    assertEqual(
      mockFetch.calls[0].url,
      "https://hacker-news.firebaseio.com/v0/updates.json",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

