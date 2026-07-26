/**
 * @typedef {"story" | "job" | "comment" | "poll" | "pollopt"} HnItemType
 */

/**
 * @typedef {Object} HnItem
 * @property {number} id
 * @property {HnItemType=} type
 * @property {boolean=} deleted
 * @property {boolean=} dead
 * @property {string=} by
 * @property {number=} time
 * @property {string=} text
 * @property {number=} parent
 * @property {number=} poll
 * @property {number[]=} kids
 * @property {number[]=} parts
 * @property {string=} url
 * @property {number=} score
 * @property {string=} title
 * @property {number=} descendants
 */

/**
 * @typedef {Object} FeedState
 * @property {number[]} ids
 * @property {HnItem[]} items
 * @property {number} cursor
 * @property {boolean} loading
 * @property {boolean} exhausted
 * @property {string|null} error
 * @property {boolean} initialized
 */

/**
 * @typedef {Object} CommentState
 * @property {number} parentId
 * @property {number} rootPostId
 * @property {number[]} ids
 * @property {HnItem[]} items
 * @property {number} cursor
 * @property {boolean} loading
 * @property {boolean} exhausted
 * @property {string|null} error
 * @property {boolean} expanded
 */

/**
 * @typedef {Object} LiveState
 * @property {number|null} lastSeenMaxItem
 * @property {number|null} newestObservedMaxItem
 * @property {HnItem[]} changedItems
 * @property {number} pendingNewCount
 * @property {boolean} checking
 * @property {string|null} error
 */



/**
 * Creates a fresh feed state.
 *
 * @returns {FeedState}
 */
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

/**
 * Creates a fresh live-update state.
 *
 * @returns {LiveState}
 */
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

/**
 * Single mutable application state.
 */
export const state = createInitialState();
/**
 * Returns the feed state for the active category.
 *
 * @returns {FeedState}
 */
export function getActiveFeed() {
  return state.feeds[state.activeCategory];
}

/**
 * Collects every item ID already known by the application.
 *
 * @returns {Set<number>}
 */
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