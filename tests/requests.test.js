import { assertEqual, test } from "./runner.js";

import {
  fetchItem,
  fetchItems,
} from "../js/api/client.js";
import {
  clearItemCache,
  deleteCachedItem,
  getCachedItem,
  setCachedItem,
} from "../js/services/itemCache.js";
import {
  clearPendingRequests,
  dedupeRequest,
} from "../js/services/requestDeduper.js";
import {
  enqueueRequest,
  getQueueStats,
  resetRequestQueue,
} from "../js/services/requestQueue.js";

import { createMockFetch } from "./mockFetch.js";

function createDeferred() {
  let resolve;
  let reject;

  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return {
    promise,
    reject,
    resolve,
  };
}

function resetRequestServices() {
  clearItemCache();
  clearPendingRequests();
  resetRequestQueue();
}

test("getCachedItem returns undefined for an unknown item ID", () => {
  resetRequestServices();

  assertEqual(getCachedItem(9999), undefined);
});

test("setCachedItem stores and returns an item by ID", () => {
  resetRequestServices();

  const item = {
    id: 1001,
    type: "story",
    title: "Cached story",
  };

  setCachedItem(1001, item);

  assertEqual(getCachedItem(1001), item);
});

test("deleteCachedItem removes a stored item", () => {
  resetRequestServices();

  const item = {
    id: 1002,
    type: "job",
  };

  setCachedItem(1002, item);
  deleteCachedItem(1002);

  assertEqual(getCachedItem(1002), undefined);
});

test("clearItemCache removes every stored item", () => {
  resetRequestServices();

  setCachedItem(1001, { id: 1001, type: "story" });
  setCachedItem(1002, { id: 1002, type: "job" });

  clearItemCache();

  assertEqual(getCachedItem(1001), undefined);
  assertEqual(getCachedItem(1002), undefined);
});

test("dedupeRequest shares one Promise for the same key", async () => {
  resetRequestServices();

  let callCount = 0;
  const deferred = createDeferred();

  const loader = () => {
    callCount += 1;
    return deferred.promise;
  };

  const firstPromise = dedupeRequest("item:1001", loader);
  const secondPromise = dedupeRequest("item:1001", loader);

  assertEqual(firstPromise, secondPromise);
  assertEqual(callCount, 1);

  deferred.resolve("done");

  assertEqual(await firstPromise, "done");
});

test("dedupeRequest removes a failed request and allows retry", async () => {
  resetRequestServices();

  let callCount = 0;

  let receivedError = null;

  try {
    await dedupeRequest("item:2001", () => {
      callCount += 1;
      return Promise.reject(new Error("Temporary failure"));
    });
  } catch (error) {
    receivedError = error;
  }

  assertEqual(receivedError instanceof Error, true);
  assertEqual(receivedError.message, "Temporary failure");

  const retryResult = await dedupeRequest("item:2001", () => {
    callCount += 1;
    return Promise.resolve("retried");
  });

  assertEqual(retryResult, "retried");
  assertEqual(callCount, 2);
});

test("enqueueRequest runs six loaders concurrently and queues the seventh", async () => {
  resetRequestServices();

  const deferreds = Array.from({ length: 7 }, () => createDeferred());
  let startedCount = 0;

  const promises = deferreds.map((deferred) =>
    enqueueRequest(() => {
      startedCount += 1;
      return deferred.promise;
    }),
  );

  assertEqual(startedCount, 6);
  assertEqual(getQueueStats().activeCount, 6);
  assertEqual(getQueueStats().queuedCount, 1);

  deferreds[0].resolve("first");
  await promises[0];

  assertEqual(startedCount, 7);
  assertEqual(getQueueStats().activeCount, 6);
  assertEqual(getQueueStats().queuedCount, 0);

  for (let index = 1; index < deferreds.length; index += 1) {
    deferreds[index].resolve(`done-${index}`);
  }

  await Promise.all(promises.slice(1));
});

test("queue counters return to zero after success", async () => {
  resetRequestServices();

  await enqueueRequest(() => Promise.resolve("ok"));

  assertEqual(getQueueStats().activeCount, 0);
  assertEqual(getQueueStats().queuedCount, 0);
});

test("queue counters return to zero after error", async () => {
  resetRequestServices();

  let receivedError = null;

  try {
    await enqueueRequest(() => Promise.reject(new Error("Queue failure")));
  } catch (error) {
    receivedError = error;
  }

  assertEqual(receivedError instanceof Error, true);
  assertEqual(receivedError.message, "Queue failure");
  assertEqual(getQueueStats().activeCount, 0);
  assertEqual(getQueueStats().queuedCount, 0);
});

test("queue bookkeeping stays clean after aborting a queued request", async () => {
  resetRequestServices();

  const firstDeferred = createDeferred();
  const blockers = Array.from({ length: 5 }, () => createDeferred());
  const blockerPromises = [
    enqueueRequest(() => firstDeferred.promise),
    ...blockers.map((deferred) => enqueueRequest(() => deferred.promise)),
  ];

  const abortController = new AbortController();
  const abortedPromise = enqueueRequest(
    () => Promise.resolve("should not start"),
    { signal: abortController.signal },
  );

  assertEqual(getQueueStats().activeCount, 6);
  assertEqual(getQueueStats().queuedCount, 1);

  abortController.abort();

  let receivedError = null;

  try {
    await abortedPromise;
  } catch (error) {
    receivedError = error;
  }

  assertEqual(receivedError.name, "AbortError");
  assertEqual(getQueueStats().queuedCount, 0);

  firstDeferred.resolve("done");

  for (const deferred of blockers) {
    deferred.resolve("done");
  }

  await Promise.all(blockerPromises);

  assertEqual(getQueueStats().activeCount, 0);
  assertEqual(getQueueStats().queuedCount, 0);
});

test("fetchItem uses cached items without a second network call", async () => {
  resetRequestServices();

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
    await fetchItem(1001);
    await fetchItem(1001);

    assertEqual(mockFetch.calls.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchItem forceRefresh bypasses completed cache data", async () => {
  resetRequestServices();

  const originalFetch = globalThis.fetch;
  const mockFetch = createMockFetch([
    {
      body: {
        id: 1001,
        type: "story",
        title: "Original",
      },
    },
    {
      body: {
        id: 1001,
        type: "story",
        title: "Refreshed",
      },
    },
  ]);

  globalThis.fetch = mockFetch;

  try {
    await fetchItem(1001);
    const refreshedItem = await fetchItem(1001, {
      forceRefresh: true,
    });

    assertEqual(mockFetch.calls.length, 2);
    assertEqual(refreshedItem.title, "Refreshed");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchItem shares one network call for simultaneous requests", async () => {
  resetRequestServices();

  const originalFetch = globalThis.fetch;
  const deferred = createDeferred();
  const calls = [];

  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });

    await deferred.promise;

    return {
      ok: true,
      status: 200,
      async json() {
        return {
          id: 1001,
          type: "story",
        };
      },
    };
  };

  try {
    const firstPromise = fetchItem(1001);
    const secondPromise = fetchItem(1001);

    assertEqual(calls.length, 1);

    deferred.resolve();

    const [firstItem, secondItem] = await Promise.all([
      firstPromise,
      secondPromise,
    ]);

    assertEqual(firstItem.id, 1001);
    assertEqual(secondItem.id, 1001);
    assertEqual(calls.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchItems preserves input order and requests duplicate IDs once", async () => {
  resetRequestServices();

  const originalFetch = globalThis.fetch;
  const mockFetch = createMockFetch([
    {
      body: {
        id: 1002,
        type: "job",
      },
    },
    {
      body: {
        id: 1001,
        type: "story",
      },
    },
  ]);

  globalThis.fetch = mockFetch;

  try {
    const items = await fetchItems([1002, 1001, 1002]);

    assertEqual(mockFetch.calls.length, 2);
    assertEqual(items.length, 3);
    assertEqual(items[0].id, 1002);
    assertEqual(items[1].id, 1001);
    assertEqual(items[2].id, 1002);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
