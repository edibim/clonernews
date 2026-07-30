import {
  getCommentState,
  toggleReplies,
} from "../features/comments.js";
import { setSanitizedHTML } from "../utils/html.js";
import {
  createMetadataText,
  createTimeElement,
} from "./postContentHelpers.js";

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
  container.dataset.rootPostId = String(rootPostId);

  container.oncommentrerender = () => {
    renderCommentsView(container, rootPostId);
  };

  container.removeEventListener("comment:rerender", container.oncommentrerender);
  container.addEventListener("comment:rerender", container.oncommentrerender);

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
    const commentElement = createCommentElement(comment, 0, rootPostId);

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
export function createCommentElement(comment, depth = 0, rootPostId = null) {
  if (!comment || typeof comment !== "object") {
    return null;
  }

  const article = document.createElement("article");
  const replyState = getCommentState(comment.id);

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

  if (Array.isArray(comment.kids) && comment.kids.length > 0) {
    const toggle = document.createElement("button");
    const replyCount = comment.kids.length;
    const replyListId = `comment-replies-${comment.id}`;

    toggle.type = "button";
    toggle.className = "comment-replies-toggle";
    toggle.dataset.action = "toggle-replies";
    toggle.setAttribute("aria-expanded", String(Boolean(replyState?.expanded)));
    toggle.setAttribute("aria-controls", replyListId);
    toggle.textContent = replyState?.expanded
      ? `Hide replies (${replyCount})`
      : `Show replies (${replyCount})`;
    toggle.addEventListener("click", async () => {
      const nextState = await toggleReplies(comment.id, rootPostId ?? comment.id);
      const root = article.closest(".comments");

      if (root) {
        const currentView = root.closest("[data-root-post-id]") ?? root;
        currentView.dispatchEvent(
          new CustomEvent("comment:rerender", { bubbles: true }),
        );
      }

      if (nextState) {
        toggle.setAttribute("aria-expanded", String(nextState.expanded));
        toggle.textContent = nextState.expanded
         ? `Hide replies (${replyCount})`
         : `Show replies (${replyCount})`;
      }
    });
    article.append(toggle);
  }

  if (replyState?.expanded && Array.isArray(replyState.items) && replyState.items.length > 0) {
    const nestedList = document.createElement("ol");

    nestedList.className = "comment-list comment-list-nested";
    nestedList.id = `comment-replies-${comment.id}`;

    for (const reply of replyState.items) {
      const replyItem = document.createElement("li");
      const replyElement = createCommentElement(reply, depth + 1, rootPostId);

      if (replyElement) {
        replyItem.append(replyElement);
        nestedList.append(replyItem);
      }
    }

    article.append(nestedList);
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

