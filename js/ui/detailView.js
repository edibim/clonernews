import { fetchItem } from "../api/client.js";
import { state } from "../state.js";
import { setSanitizedHTML } from "../utils/html.js";
import { formatRelativeTime } from "../utils/time.js";

const SUPPORTED_POST_TYPES = new Set([
  "story",
  "job",
  "poll",
]);

let activeDetailController = null;
let detailRequestVersion = 0;
let returnFocusElement = null;

/**
 * Opens the detail dialog and renders the selected item when it resolves.
 *
 * @param {number} itemId
 * @returns {Promise<object|null>}
 */
export async function openPostDetail(itemId) {
  const { content, dialog } = getDetailElements();

  if (!Number.isSafeInteger(itemId) || itemId <= 0) {
    content.replaceChildren(renderPostDetail(null));
    openDialog(dialog);
    return null;
  }

  if (activeDetailController) {
    activeDetailController.abort();
  }

  activeDetailController = new AbortController();
  detailRequestVersion += 1;

  const requestVersion = detailRequestVersion;
  const signal = activeDetailController.signal;

  state.selectedPostId = itemId;
  returnFocusElement =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

  content.setAttribute("aria-busy", "true");
  content.replaceChildren(
    createDetailStatus("Loading post...", "loading"),
  );
  openDialog(dialog);

  try {
    const item = await fetchItem(itemId, { signal });

    if (!isCurrentDetailRequest(itemId, requestVersion)) {
      return null;
    }

    content.removeAttribute("aria-busy");
    content.replaceChildren(renderPostDetail(item));

    return item;
  } catch (error) {
    if (!isCurrentDetailRequest(itemId, requestVersion)) {
      return null;
    }

    content.removeAttribute("aria-busy");

    if (error && error.name === "AbortError") {
      return null;
    }

    content.replaceChildren(
      createDetailStatus(
        "Unable to load this post. Try again.",
        "error",
      ),
    );

    return null;
  } finally {
    if (requestVersion === detailRequestVersion) {
      activeDetailController = null;
    }
  }
}

/**
 * Cancels active detail work and closes the dialog.
 */
export function closePostDetail() {
  if (activeDetailController) {
    activeDetailController.abort();
    activeDetailController = null;
  }

  detailRequestVersion += 1;
  state.selectedPostId = null;

  const dialog = document.querySelector("#post-detail");

  if (dialog && dialog.open) {
    dialog.close();
  }

  if (
    returnFocusElement &&
    returnFocusElement.isConnected
  ) {
    returnFocusElement.focus();
  }

  returnFocusElement = null;
}

/**
 * Creates sanitized detail content for a supported top-level item.
 *
 * @param {object|null} item
 * @returns {HTMLElement}
 */
export function renderPostDetail(item) {
  if (!isAvailablePost(item)) {
    return createUnavailableDetail();
  }

  const title = getPlainText(item.title, "Untitled item");
  const article = document.createElement("article");
  const heading = document.createElement("h3");
  const metadata = document.createElement("p");

  article.className = "post-detail";
  article.dataset.postId = String(item.id);
  article.dataset.postType = item.type;

  heading.textContent = title;
  metadata.className = "post-detail-metadata";

  appendMetadata(
    metadata,
    createMetadataText(
      "author",
      getPlainText(item.by, "unknown user"),
    ),
  );

  if (
    (item.type === "story" || item.type === "poll") &&
    Number.isFinite(item.score)
  ) {
    appendMetadata(
      metadata,
      createMetadataText(
        "score",
        formatCount(item.score, "point"),
      ),
    );
  }

  if (item.type === "story" || item.type === "poll") {
    const commentCount = Number.isFinite(item.descendants)
      ? item.descendants
      : 0;

    appendMetadata(
      metadata,
      createMetadataText(
        "comments",
        formatCount(commentCount, "comment"),
      ),
    );
  }

  appendMetadata(metadata, createTimeElement(item.time));

  if (item.type === "poll") {
    const optionCount = Array.isArray(item.parts)
      ? item.parts.length
      : 0;

    appendMetadata(
      metadata,
      createMetadataText(
        "options",
        formatCount(optionCount, "option"),
      ),
    );
  }

  article.append(heading, metadata);

  if (item.text) {
    const body = document.createElement("div");

    body.className = "post-detail-body";
    body.dataset.field = "body";
    setSanitizedHTML(body, item.text);
    article.append(body);
  }

  const safeUrl = getSafeExternalUrl(item.url);

  if (safeUrl) {
    article.append(createExternalLink(safeUrl, title));
  }

  return article;
}

export function renderPollOptions() {
  throw new Error("renderPollOptions is not implemented");
}

function isAvailablePost(item) {
  return Boolean(
    item &&
      typeof item === "object" &&
      !item.deleted &&
      !item.dead &&
      SUPPORTED_POST_TYPES.has(item.type),
  );
}

function createUnavailableDetail() {
  const unavailable = document.createElement("section");
  const heading = document.createElement("h3");
  const message = document.createElement("p");

  unavailable.className = "detail-unavailable";
  heading.textContent = "Post unavailable";
  message.textContent =
    "This post is unavailable or has been removed.";
  unavailable.append(heading, message);

  return unavailable;
}

function createMetadataText(field, value) {
  const element = document.createElement("span");

  element.dataset.field = field;
  element.textContent = value;

  return element;
}

function createTimeElement(unixSeconds) {
  const element = document.createElement("time");
  const nowSeconds = Math.floor(Date.now() / 1000);

  element.dataset.field = "time";
  element.textContent = formatRelativeTime(
    unixSeconds,
    nowSeconds,
  );

  if (Number.isFinite(unixSeconds)) {
    element.dateTime = new Date(
      unixSeconds * 1000,
    ).toISOString();
  }

  return element;
}

function appendMetadata(container, element) {
  if (container.childNodes.length > 0) {
    container.append(document.createTextNode(" · "));
  }

  container.append(element);
}

function createExternalLink(url, title) {
  const link = document.createElement("a");

  link.href = url.href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.dataset.action = "external";
  link.textContent = `Visit ${url.hostname}`;
  link.setAttribute(
    "aria-label",
    `Open ${title} on ${url.hostname} in a new tab`,
  );

  return link;
}

function getSafeExternalUrl(value) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function getPlainText(value, fallback) {
  if (value === null || value === undefined) {
    return fallback;
  }

  const holder = document.createElement("div");

  setSanitizedHTML(holder, String(value));

  const plainText = holder.textContent.trim();

  return plainText || fallback;
}

function formatCount(value, singularLabel) {
  const normalizedValue = Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
  const label =
    normalizedValue === 1
      ? singularLabel
      : `${singularLabel}s`;

  return `${normalizedValue} ${label}`;
}

function getDetailElements() {
  const dialog = document.querySelector("#post-detail");
  const content = document.querySelector("#detail-content");

  if (!dialog || !content) {
    throw new Error("The post detail dialog is not available");
  }

  return {
    content,
    dialog,
  };
}

function openDialog(dialog) {
  if (!dialog.open) {
    dialog.showModal();
  }
}

function isCurrentDetailRequest(itemId, requestVersion) {
  return (
    state.selectedPostId === itemId &&
    detailRequestVersion === requestVersion
  );
}

function createDetailStatus(message, kind) {
  const status = document.createElement("p");

  status.className = "detail-status";
  status.dataset.kind = kind;
  status.setAttribute("role", "status");
  status.textContent = message;

  return status;
}
