import { state } from "../state.js";

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
  loadMoreButton.hidden = category === "polls";

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

function setStatus(element, message, kind) {
  element.textContent = message;
  element.dataset.kind = kind;
  element.hidden = message.length === 0;
}

function setLoadMoreButton(element, label, disabled) {
  element.textContent = label;
  element.disabled = disabled;
}
