import { assertEqual, test } from "./runner.js";

import {
  getCommentState,
  initializeComments,
  loadMoreComments,
  validateCommentParent,
} from "../js/features/comments.js";
import { resetState, state } from "../js/state.js";
import { clearItemCache } from "../js/services/itemCache.js";
import { clearPendingRequests } from "../js/services/requestDeduper.js";
import { resetRequestQueue } from "../js/services/requestQueue.js";
import { createMockFetch, createMockResponse } from "./mockFetch.js";
import {
  deletedItemFixture,
  directCommentFixture,
  secondDirectCommentFixture,
  storyFixture,
} from "./fixtures.js";

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

function createComment(id, parent, time = id) {
  return {
    id,
    parent,
    text: `<p>Comment ${id}</p>`,
    time,
    type: "comment",
  };
}

function resetCommentTestState() {
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

test("initializeComments requests only IDs from the selected post kids", async () => {
  resetCommentTestState();

  await withMockFetch(
    [
      { body: directCommentFixture },
      { body: secondDirectCommentFixture },
    ],
    async (mockFetch) => {
      const commentState = await initializeComments(storyFixture);

      assertEqual(mockFetch.calls.length, 2);
      assertEqual(
        mockFetch.calls[0].url,
        "https://hacker-news.firebaseio.com/v0/item/3001.json",
      );
      assertEqual(
        mockFetch.calls[1].url,
        "https://hacker-news.firebaseio.com/v0/item/3002.json",
      );
      assertEqual(commentState.parentId, storyFixture.id);
      assertEqual(commentState.rootPostId, storyFixture.id);
      assertEqual(commentState.items.length, 2);
    },
  );
});

test("validateCommentParent rejects comments with the wrong parent", () => {
  const validComment = {
    ...directCommentFixture,
  };
  const wrongParentComment = {
    ...directCommentFixture,
    parent: 9999,
  };

  assertEqual(validateCommentParent(validComment, storyFixture.id), true);
  assertEqual(
    validateCommentParent(wrongParentComment, storyFixture.id),
    false,
  );
  assertEqual(validateCommentParent(null, storyFixture.id), false);
});

test("comments from two selected posts keep separate state", async () => {
  resetCommentTestState();

  const firstPost = {
    ...storyFixture,
    id: 7001,
    kids: [7101],
  };
  const secondPost = {
    ...storyFixture,
    id: 7002,
    kids: [7201],
  };

  await withMockFetch(
    [
      { body: createComment(7101, firstPost.id) },
      { body: createComment(7201, secondPost.id) },
    ],
    async () => {
      await initializeComments(firstPost);
      await initializeComments(secondPost);

      const firstState = getCommentState(firstPost.id);
      const secondState = getCommentState(secondPost.id);

      assertEqual(firstState.rootPostId, firstPost.id);
      assertEqual(secondState.rootPostId, secondPost.id);
      assertEqual(firstState.items[0].id, 7101);
      assertEqual(secondState.items[0].id, 7201);
    },
  );
});

test("direct comment siblings are sorted newest-first", async () => {
  resetCommentTestState();

  await withMockFetch(
    [
      { body: secondDirectCommentFixture },
      { body: directCommentFixture },
    ],
    async () => {
      const post = {
        ...storyFixture,
        kids: [3002, 3001],
      };

      const commentState = await initializeComments(post);

      assertEqual(commentState.items[0].id, directCommentFixture.id);
      assertEqual(commentState.items[1].id, secondDirectCommentFixture.id);
    },
  );
});

test("initial comment loading requests at most 20 direct-comment IDs", async () => {
  resetCommentTestState();

  const commentIds = Array.from(
    { length: 25 },
    (_, index) => 8001 + index,
  );
  const post = {
    ...storyFixture,
    id: 8000,
    kids: commentIds,
  };

  await withMockFetch(
    commentIds.slice(0, 20).map((id) => ({
      body: createComment(id, post.id),
    })),
    async (mockFetch) => {
      const commentState = await initializeComments(post);

      assertEqual(mockFetch.calls.length, 20);
      assertEqual(commentState.cursor, 20);
      assertEqual(commentState.exhausted, false);
    },
  );
});

test("deleted comments with children keep a placeholder", async () => {
  resetCommentTestState();

  const deletedWithoutReplies = {
    id: 5003,
    deleted: true,
    parent: storyFixture.id,
    type: "comment",
  };

  await withMockFetch(
    [
      { body: deletedItemFixture },
      { body: deletedWithoutReplies },
    ],
    async () => {
      const post = {
        ...storyFixture,
        kids: [deletedItemFixture.id, deletedWithoutReplies.id],
      };

      const commentState = await initializeComments(post);

      assertEqual(commentState.items.length, 1);
      assertEqual(commentState.items[0].id, deletedItemFixture.id);
      assertEqual(commentState.items[0].deleted, true);
    },
  );
});

test("a failed comment batch can be retried without duplicates", async () => {
  resetCommentTestState();

  const post = {
    ...storyFixture,
    kids: [directCommentFixture.id],
  };

  await withMockFetch(
    [{ reject: new Error("Network unavailable") }],
    async () => {
      await initializeComments(post);
    },
  );

  let commentState = getCommentState(post.id);

  assertEqual(commentState.cursor, 0);
  assertEqual(commentState.items.length, 0);
  assertEqual(typeof commentState.error, "string");

  await withMockFetch(
    [{ body: directCommentFixture }],
    async () => {
      commentState = await loadMoreComments(post.id, post.id);
    },
  );

  assertEqual(commentState.items.length, 1);
  assertEqual(commentState.items[0].id, directCommentFixture.id);
});

test("stale comment results cannot attach beneath a newly selected post", async () => {
  resetCommentTestState();

  const firstPost = {
    ...storyFixture,
    id: 9001,
    kids: [9101],
  };
  const secondPost = {
    ...storyFixture,
    id: 9002,
    kids: [9201],
  };
  const firstResponse = createDeferred();
  const secondResponse = createDeferred();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (url) => {
    if (url.includes("/item/9101.json")) {
      return firstResponse.promise;
    }

    return secondResponse.promise;
  };

  try {
    state.selectedPostId = firstPost.id;
    const firstRequest = initializeComments(firstPost);

    state.selectedPostId = secondPost.id;
    const secondRequest = initializeComments(secondPost);

    secondResponse.resolve(
      createMockResponse({
        body: createComment(9201, secondPost.id),
      }),
    );
    await secondRequest;

    firstResponse.resolve(
      createMockResponse({
        body: createComment(9101, firstPost.id),
      }),
    );
    await firstRequest;

    assertEqual(getCommentState(secondPost.id).items[0].id, 9201);
    assertEqual(getCommentState(firstPost.id).items.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
