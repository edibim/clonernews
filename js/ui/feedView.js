import { state } from "../state.js";
import { setSanitizedHTML } from "../utils/html.js";
import {
  appendMetadata,
  createExternalLink,
  createMetadataText,
  createTimeElement,
  formatCount,
  getPlainText,
  getSafeExternalUrl,
} from "./postContentHelpers.js";

const CATEGORY_LABELS = Object.freeze({
  stories: "stories",
  jobs: "jobs",
  polls: "polls",
});

/**
 * Renders loading, retry, empty, and exhausted feed controls.
 * Post markup is introduced separately in Phase 8.
 *
 * @param {HTMLElement} root
 * @param {"stories" | "jobs" | "polls"} category
 */
export function renderFeedView(root, category) {
  if (!(root instanceof HTMLElement)) {
    throw new TypeError("A valid application root is required");
  }

  const feed = state.feeds[category];
  const status = root.querySelector("#feed-status");
  const loadMoreButton = root.querySelector("#load-more");
  const feedList = root.querySelector("#feed-list");

  if (!feed || !status || !loadMoreButton || !feedList) {
    throw new Error("The feed view is not available");
  }

  feedList.dataset.category = category;
  feedList.setAttribute("aria-busy", String(feed.loading));
  renderFeedItems(feedList, feed.items);
  loadMoreButton.hidden =
    category === "polls" && !feed.error;

  if (feed.loading) {
    setStatus(
      status,
      `Loading ${CATEGORY_LABELS[category]}...`,
      "loading",
    );
    setLoadMoreButton(loadMoreButton, "Loading...", true);
    return;
  }

  if (feed.error) {
    setStatus(status, feed.error, "error");
    setLoadMoreButton(loadMoreButton, "Retry", false);
    return;
  }

  if (feed.exhausted) {
    if (feed.items.length === 0) {
      setStatus(
        status,
        `No ${CATEGORY_LABELS[category]} found.`,
        "empty",
      );
    } else {
      setStatus(status, "", "info");
    }

    setLoadMoreButton(
      loadMoreButton,
      "No more posts",
      true,
    );
    return;
  }

  setStatus(status, "", "info");
  setLoadMoreButton(loadMoreButton, "Load more", false);
}

/**
 * Replaces a feed list with semantic post-card list items.
 *
 * @param {HTMLElement} container
 * @param {Array<object>} items
 */
export function renderFeedItems(container, items) {
  if (!(container instanceof HTMLElement)) {
    throw new TypeError("A valid feed container is required");
  }

  const fragment = document.createDocumentFragment();

  for (const item of Array.isArray(items) ? items : []) {
    const listItem = document.createElement("li");

    listItem.append(createPostCard(item));
    fragment.append(listItem);
  }

  container.replaceChildren(fragment);
}

/**
 * Creates a safe card for a story, job, or poll.
 *
 * @param {object} item
 * @returns {HTMLElement}
 */
export function createPostCard(item) {
  const post = item && typeof item === "object" ? item : {};
  const title = getPlainText(post.title, "Untitled item");
  const article = document.createElement("article");
  const heading = document.createElement("h3");
  const detailButton = document.createElement("button");
  const metadata = document.createElement("p");

  article.className = "post-card";
  article.dataset.postId = String(post.id || "");
  article.dataset.postType = post.type || "unknown";

  detailButton.type = "button";
  detailButton.textContent = title;
  detailButton.dataset.action = "open-detail";
  detailButton.dataset.itemId = String(post.id || "");

  heading.append(detailButton);
  metadata.className = "post-metadata";

  appendMetadata(
    metadata,
    createMetadataText(
      "author",
      getPlainText(post.by, "unknown user"),
    ),
  );

  if (
    (post.type === "story" || post.type === "poll") &&
    Number.isFinite(post.score)
  ) {
    appendMetadata(
      metadata,
      createMetadataText(
        "score",
        formatCount(post.score, "point"),
      ),
    );
  }

  if (post.type === "story" || post.type === "poll") {
    const commentCount = Number.isFinite(post.descendants)
      ? post.descendants
      : 0;

    appendMetadata(
      metadata,
      createMetadataText(
        "comments",
        formatCount(commentCount, "comment"),
      ),
    );
  }

  appendMetadata(metadata, createTimeElement(post.time));

  if (post.type === "poll") {
    const optionCount = Array.isArray(post.parts)
      ? post.parts.length
      : 0;

    appendMetadata(
      metadata,
      createMetadataText(
        "options",
        formatCount(optionCount, "option"),
      ),
    );
  }

  const safeUrl = getSafeExternalUrl(post.url);

  if (safeUrl) {
    appendMetadata(
      metadata,
      createMetadataText("source", safeUrl.hostname),
    );
  }

  article.append(heading, metadata);

  if (
    (post.type === "job" || post.type === "poll") &&
    post.text
  ) {
    article.append(createSafePreview(post.text));
  }

  if (safeUrl) {
    article.append(createExternalLink(safeUrl, title));
  }

  return article;
}

function setStatus(element, message, kind) {
  element.textContent = message;
  element.dataset.kind = kind;
  element.hidden = message.length === 0;
}

function setLoadMoreButton(element, label, disabled) {
  element.textContent = label;
  element.disabled = disabled;
  element.setAttribute("aria-controls", "feed-list");
}

function createSafePreview(value) {
  const preview = document.createElement("div");

  preview.className = "post-preview";
  preview.dataset.field = "preview";
  setSanitizedHTML(preview, value);

  return preview;
}

