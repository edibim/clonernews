export function createFeedState() {
  return {
    ids: [],
    items: [],
    cursor: 0,
    loading: false,
    exhausted: false,
    error: null,
    initialized: false,
  };
}

function createLiveState() {
  return {
    lastSeenMaxItem: null,
    newestObservedMaxItem: null,
    changedItems: [],
    pendingNewCount: 0,
    checking: false,
    error: null,
  };
}

function createInitialState() {
  return {
    activeCategory: "stories",

    feeds: {
      stories: createFeedState(),
      jobs: createFeedState(),
      polls: createFeedState(),
    },

    selectedPostId: null,

    commentsByParent: new Map(),

    pollOptionsByPoll: new Map(),

    live: createLiveState(),
  };
}

export const state = createInitialState();

export function getActiveFeed() {
  return state.feeds[state.activeCategory];
}

export function getKnownItemIds() {
  const knownIds = new Set();

  for (const feed of Object.values(state.feeds)) {
    for (const item of feed.items) {
      if (Number.isSafeInteger(item?.id)) {
        knownIds.add(item.id);
      }
    }
  }

  if (Number.isSafeInteger(state.selectedPostId)) {
    knownIds.add(state.selectedPostId);
  }

  for (const commentState of state.commentsByParent.values()) {
    const comments = commentState?.items ?? [];

    for (const comment of comments) {
      if (Number.isSafeInteger(comment?.id)) {
        knownIds.add(comment.id);
      }
    }
  }

  for (const options of state.pollOptionsByPoll.values()) {
    for (const option of options) {
      if (Number.isSafeInteger(option?.id)) {
        knownIds.add(option.id);
      }
    }
  }

  return knownIds;
}

export function resetState() {
  const freshState = createInitialState();

  state.activeCategory = freshState.activeCategory;
  state.feeds = freshState.feeds;
  state.selectedPostId = freshState.selectedPostId;
  state.commentsByParent = freshState.commentsByParent;
  state.pollOptionsByPoll = freshState.pollOptionsByPoll;
  state.live = freshState.live;
}