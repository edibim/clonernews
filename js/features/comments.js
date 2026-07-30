/**
 * Initializes direct-comment state for a selected post.
 *
 * @param {object} post
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<object|null>}
 */
export async function initializeComments(post, { signal } = {}) {
  return null;
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
  return null;
}

/**
 * Checks whether a comment belongs directly under a parent item.
 *
 * @param {object|null} comment
 * @param {number} parentId
 * @returns {boolean}
 */
export function validateCommentParent(comment, parentId) {
  return false;
}

/**
 * Returns stored comment state for a parent item.
 *
 * @param {number} parentId
 * @returns {object|null}
 */
export function getCommentState(parentId) {
  return null;
}
