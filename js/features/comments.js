import { fetchItems } from "../api/client.js";
import { COMMENT_BATCH_SIZE, REPLY_BATCH_SIZE } from "../config.js";
import { state } from "../state.js";
import { sortNewestFirst } from "../utils/time.js";

/**
 * Initializes direct-comment state for a selected post.
 *
 * @param {object} post
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<object|null>}
 */
export async function initializeComments(post, { signal } = {}) {
  if (!isValidPost(post)) {
    return null;
  }

  const commentState = createCommentState(
    post.id,
    post.id,
    Array.isArray(post.kids) ? post.kids : [],
  );

  state.commentsByParent.set(post.id, commentState);

  return loadMoreComments(post.id, post.id, { signal });
}

/**
 * Loads the next direct-comment batch for a parent item.
 *
 * @param {number} parentId
 * @param {number} rootPostId
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<object|null>}
 */
export async function loadMoreComments(
  parentId,
  rootPostId,
  { signal } = {},
) {
  const commentState = getCommentState(parentId);

  if (
    !commentState ||
    commentState.loading ||
    commentState.exhausted
  ) {
    return commentState;
  }

  if (commentState.cursor >= commentState.ids.length) {
    commentState.exhausted = true;
    return commentState;
  }

  commentState.loading = true;
  commentState.error = null;

  const startCursor = commentState.cursor;
  const endCursor = Math.min(
    startCursor + COMMENT_BATCH_SIZE,
    commentState.ids.length,
  );
  const batchIds = commentState.ids.slice(startCursor, endCursor);

  try {
    const comments = await fetchItems(batchIds, { signal });

    if (!isCurrentCommentRequest(rootPostId)) {
      return commentState;
    }

    mergeComments(commentState, comments);

    commentState.cursor = endCursor;
    commentState.exhausted =
      commentState.cursor >= commentState.ids.length;
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw error;
    }

    commentState.error = "Unable to load comments. Try again.";
  } finally {
    commentState.loading = false;
  }

  return commentState;
}

/**
 * Toggles nested replies for a comment.
 *
 * @param {number} commentId
 * @param {number} rootPostId
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<object|null>}
 */
export async function toggleReplies(commentId, rootPostId, { signal } = {}) {
  const existingCommentState = getCommentState(commentId);
  const commentState = existingCommentState ?? createReplyState(commentId, rootPostId, []);

  if (!existingCommentState) {
    state.commentsByParent.set(commentId, commentState);
  }

  if (!commentState.parentId) {
    commentState.parentId = commentId;
  }

  if (commentState.expanded) {
    commentState.expanded = false;
    return commentState;
  }

  commentState.expanded = true;

  if (commentState.loaded) {
    return commentState;
  }

  if (commentState.cursor >= commentState.ids.length) {
    commentState.exhausted = true;
    return commentState;
  }

  commentState.loading = true;
  commentState.error = null;

  const startCursor = commentState.cursor;
  const endCursor = Math.min(
    startCursor + REPLY_BATCH_SIZE,
    commentState.ids.length,
  );
  const batchIds = commentState.ids.slice(startCursor, endCursor);

  try {
    const replies = await fetchItems(batchIds, { signal });

    if (!isCurrentCommentRequest(rootPostId)) {
      return commentState;
    }

    mergeComments(commentState, replies);

    commentState.cursor = endCursor;
    commentState.exhausted =
      commentState.cursor >= commentState.ids.length;
    commentState.loaded = true;
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw error;
    }

    commentState.error = "Unable to load replies. Try again.";
  } finally {
    commentState.loading = false;
  }

  return commentState;
}

/**
 * Loads the next reply batch for a comment thread.
 *
 * @param {number} commentId
 * @param {number} rootPostId
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<object|null>}
 */
export async function loadMoreReplies(commentId, rootPostId, { signal } = {}) {
  return toggleReplies(commentId, rootPostId, { signal });
}

/**
 * Checks whether a comment belongs to the provided root post.
 *
 * @param {number} parentId
 * @param {number} rootPostId
 * @returns {boolean}
 */
export function isInCommentRoot(parentId, rootPostId) {
  const commentState = getCommentState(parentId);

  if (!commentState) {
    return false;
  }

  return commentState.rootPostId === rootPostId;
}

/**
 * Checks whether a comment belongs directly under a parent item.
 *
 * @param {object|null} comment
 * @param {number} parentId
 * @returns {boolean}
 */
export function validateCommentParent(comment, parentId) {
  return Boolean(
    comment &&
      Number.isSafeInteger(comment.id) &&
      comment.id > 0 &&
      comment.type === "comment" &&
      comment.parent === parentId &&
      !comment.dead,
  );
}

/**
 * Returns stored comment state for a parent item.
 *
 * @param {number} parentId
 * @returns {object|null}
 */
export function getCommentState(parentId) {
  return state.commentsByParent.get(parentId) ?? null;
}

function createCommentState(parentId, rootPostId, ids) {
  return {
    parentId,
    rootPostId,
    ids: ids.filter((id) => Number.isSafeInteger(id) && id > 0),
    items: [],
    cursor: 0,
    loading: false,
    exhausted: ids.length === 0,
    error: null,
    expanded: true,
    loaded: false,
  };
}

function createReplyState(parentId, rootPostId, ids) {
  return {
    parentId,
    rootPostId,
    ids: ids.filter((id) => Number.isSafeInteger(id) && id > 0),
    items: [],
    cursor: 0,
    loading: false,
    exhausted: ids.length === 0,
    error: null,
    expanded: false,
    loaded: false,
  };
}

function mergeComments(commentState, incomingComments) {
  const commentsById = new Map();

  for (const comment of commentState.items) {
    commentsById.set(comment.id, comment);
  }

  for (const comment of incomingComments) {
    if (!isRenderableComment(comment, commentState.parentId)) {
      continue;
    }

    commentsById.set(comment.id, comment);

    if (!state.commentsByParent.has(comment.id)) {
      state.commentsByParent.set(
        comment.id,
        createReplyState(
          comment.id,
          commentState.rootPostId,
          Array.isArray(comment.kids) ? comment.kids : [],
        ),
      );
    }
  }

  commentState.items = sortNewestFirst([...commentsById.values()]);
}

function isRenderableComment(comment, parentId) {
  if (!validateCommentParent(comment, parentId)) {
    return false;
  }

  if (!comment.deleted) {
    return true;
  }

  return Array.isArray(comment.kids) && comment.kids.length > 0;
}

function isValidPost(post) {
  return Boolean(
    post &&
      typeof post === "object" &&
      Number.isSafeInteger(post.id) &&
      post.id > 0,
  );
}

function isCurrentCommentRequest(rootPostId) {
  return (
    !Number.isSafeInteger(state.selectedPostId) ||
    state.selectedPostId === rootPostId
  );
}
