import { assert, assertEqual, test } from "./runner.js";

import {
  createFeedState,
  getActiveFeed,
  resetState,
  state,
  getKnownItemIds,
} from "../js/state.js";

test("default active category is stories", () => {
  resetState();

  assertEqual(state.activeCategory, "stories");
});

test("createFeedState returns the expected defaults", () => {
  const feed = createFeedState();

  assert(Array.isArray(feed.ids));
  assert(Array.isArray(feed.items));

  assertEqual(feed.ids.length, 0);
  assertEqual(feed.items.length, 0);
  assertEqual(feed.cursor, 0);
  assertEqual(feed.loading, false);
  assertEqual(feed.exhausted, false);
  assertEqual(feed.error, null);
  assertEqual(feed.initialized, false);
});

test("every category has independent feed state", () => {
  resetState();

  state.feeds.stories.ids.push(1001);

  assertEqual(state.feeds.stories.ids.length, 1);
  assertEqual(state.feeds.jobs.ids.length, 0);
  assertEqual(state.feeds.polls.ids.length, 0);
});

test("getActiveFeed returns the selected category feed", () => {
  resetState();

  state.activeCategory = "jobs";

  assertEqual(getActiveFeed(), state.feeds.jobs);
});

test("resetState restores the default application state", () => {
  state.activeCategory = "polls";
  state.feeds.stories.ids.push(1001);
  state.feeds.jobs.loading = true;

  resetState();

  assertEqual(state.activeCategory, "stories");
  assertEqual(state.feeds.stories.ids.length, 0);
  assertEqual(state.feeds.jobs.loading, false);
});

test("initial state contains detail, comments, and live data", () => {
  resetState();

  assertEqual(state.selectedPostId, null);
  assert(state.commentsByParent instanceof Map);

  assertEqual(state.commentsByParent.size, 0);

  assertEqual(state.live.lastSeenMaxItem, null);
  assertEqual(state.live.newestObservedMaxItem, null);
  assert(Array.isArray(state.live.changedItems));
  assertEqual(state.live.changedItems.length, 0);
  assertEqual(state.live.pendingNewCount, 0);
  assertEqual(state.live.checking, false);
  assertEqual(state.live.error, null);
});

test("resetState creates fresh arrays and maps", () => {
  resetState();

  const oldStoryIds = state.feeds.stories.ids;
  const oldStoryItems = state.feeds.stories.items;
  const oldCommentsMap = state.commentsByParent;
  const oldChangedItems = state.live.changedItems;

  resetState();

  assert(state.feeds.stories.ids !== oldStoryIds);
  assert(state.feeds.stories.items !== oldStoryItems);
  assert(state.commentsByParent !== oldCommentsMap);
  assert(state.live.changedItems !== oldChangedItems);
});

test("getKnownItemIds includes loaded feed item IDs", () => {
  resetState();

  state.feeds.stories.items.push({
    id: 1001,
    type: "story",
  });

  state.feeds.jobs.items.push({
    id: 1002,
    type: "job",
  });

  const knownIds = getKnownItemIds();

  assertEqual(knownIds.has(1001), true);
  assertEqual(knownIds.has(1002), true);
});

test("getKnownItemIds includes the selected post", () => {
  resetState();

  state.selectedPostId = 2001;

  const knownIds = getKnownItemIds();

  assertEqual(knownIds.has(2001), true);
});

test("getKnownItemIds includes comments and poll options", () => {
  resetState();

  state.commentsByParent.set(1001, {
    items: [
      {
        id: 3001,
        type: "comment",
      },
    ],
  });

  state.pollOptionsByPoll.set(1003, [
    {
      id: 4001,
      type: "pollopt",
    },
  ]);

  const knownIds = getKnownItemIds();

  assertEqual(knownIds.has(3001), true);
  assertEqual(knownIds.has(4001), true);
});

test("getKnownItemIds removes duplicate IDs", () => {
  resetState();

  state.selectedPostId = 1001;

  state.feeds.stories.items.push({
    id: 1001,
    type: "story",
  });

  const knownIds = getKnownItemIds();

  assertEqual(knownIds.size, 1);
});

test("resetState clears selected post, comments, poll options, and live data", () => {
  state.selectedPostId = 1001;

  state.commentsByParent.set(1001, {
    items: [{ id: 3001 }],
  });

  state.pollOptionsByPoll.set(1003, [
    {
      id: 2001,
    },
  ]);

  state.live.lastSeenMaxItem = 5000;
  state.live.changedItems.push({
    id: 1001,
  });
  state.live.pendingNewCount = 3;
  state.live.checking = true;
  state.live.error = "Network error";

  resetState();

  assertEqual(state.selectedPostId, null);
  assertEqual(state.commentsByParent.size, 0);
  assertEqual(state.pollOptionsByPoll.size, 0);

  assertEqual(state.live.lastSeenMaxItem, null);
  assertEqual(state.live.changedItems.length, 0);
  assertEqual(state.live.pendingNewCount, 0);
  assertEqual(state.live.checking, false);
  assertEqual(state.live.error, null);
});