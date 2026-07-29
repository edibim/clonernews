import { setSanitizedHTML } from "../utils/html.js";
import { formatRelativeTime } from "../utils/time.js";

const SUPPORTED_POST_TYPES = new Set([
  "story",
  "job",
  "poll",
]);

export async function openPostDetail() {
  throw new Error("openPostDetail is not implemented");
}

export function closePostDetail() {
  throw new Error("closePostDetail is not implemented");
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
