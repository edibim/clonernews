import { getCommentState } from "../features/comments.js";
import { setSanitizedHTML } from "../utils/html.js";
import { formatRelativeTime } from "../utils/time.js";

/**
 * Renders the comment area for a selected post.
 *
 * @param {HTMLElement} container
 * @param {number} rootPostId
 */
export function renderCommentsView(container, rootPostId) {
  if (!(container instanceof HTMLElement)) {
    throw new TypeError("A valid comments container is required");
  }

  const commentState = getCommentState(rootPostId);

  container.className = "comments";
  container.setAttribute("aria-label", "Comments");

  if (!commentState) {
    container.replaceChildren(
      createCommentsStatus("No comments yet.", "empty"),
    );
    return;
  }

  if (commentState.loading) {
    container.replaceChildren(
      createCommentsStatus("Loading comments...", "loading"),
    );
    return;
  }

  if (commentState.error) {
    container.replaceChildren(
      createCommentsStatus(commentState.error, "error"),
    );
    return;
  }

  if (commentState.items.length === 0) {
    container.replaceChildren(
      createCommentsStatus("No comments yet.", "empty"),
    );
    return;
  }

  const list = document.createElement("ol");

  list.className = "comment-list";

  for (const comment of commentState.items) {
    const listItem = document.createElement("li");
    const commentElement = createCommentElement(comment);

    if (commentElement) {
      listItem.append(commentElement);
      list.append(listItem);
    }
  }

  container.replaceChildren(list);
}

/**
 * Creates a single comment element.
 *
 * @param {object} comment
 * @param {number} depth
 * @returns {HTMLElement|null}
 */
export function createCommentElement(comment, depth = 0) {
  if (!comment || typeof comment !== "object") {
    return null;
  }

  const article = document.createElement("article");

  article.className = "comment";
  article.dataset.commentId = String(comment.id || "");
  article.dataset.depth = String(depth);

  if (comment.deleted) {
    const deleted = document.createElement("p");

    deleted.className = "comment-deleted";
    deleted.textContent = "[deleted]";
    article.append(deleted);

    return article;
  }

  article.append(createCommentMetadata(comment));

  if (comment.text) {
    const body = document.createElement("div");

    body.className = "comment-body";
    setSanitizedHTML(body, comment.text);
    article.append(body);
  }

  return article;
}

/**
 * Renders a loading, empty, or error status for comments.
 *
 * @param {string} message
 * @param {string} kind
 * @returns {HTMLElement|null}
 */
export function createCommentsStatus(message, kind = "info") {
  const status = document.createElement("p");

  status.className = "comments-status";
  status.dataset.kind = kind;
  status.setAttribute("role", "status");
  status.textContent =
    message === null || message === undefined
      ? ""
      : String(message);

  return status;
}

function createCommentMetadata(comment) {
  const metadata = document.createElement("p");

  metadata.className = "comment-metadata";
  metadata.append(createMetadataText(comment.by || "unknown user"));

  if (Number.isFinite(comment.time)) {
    metadata.append(document.createTextNode(" · "));
    metadata.append(createTimeElement(comment.time));
  }

  return metadata;
}

function createMetadataText(value) {
  const element = document.createElement("span");

  element.textContent = value;

  return element;
}

function createTimeElement(unixSeconds) {
  const element = document.createElement("time");
  const nowSeconds = Math.floor(Date.now() / 1000);

  element.textContent = formatRelativeTime(
    unixSeconds,
    nowSeconds,
  );
  element.dateTime = new Date(unixSeconds * 1000).toISOString();

  return element;
}
