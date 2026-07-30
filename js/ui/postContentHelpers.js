import { setSanitizedHTML } from "../utils/html.js";

export function appendMetadata(container, element) {
  if (container.childNodes.length > 0) {
    container.append(document.createTextNode(" · "));
  }

  container.append(element);
}

export function createExternalLink(url, title) {
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

export function getSafeExternalUrl(value) {
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

export function getPlainText(value, fallback) {
  if (value === null || value === undefined) {
    return fallback;
  }

  const holder = document.createElement("div");

  setSanitizedHTML(holder, String(value));

  const plainText = holder.textContent.trim();

  return plainText || fallback;
}

export function formatCount(value, singularLabel) {
  const normalizedValue = Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
  const label =
    normalizedValue === 1
      ? singularLabel
      : `${singularLabel}s`;

  return `${normalizedValue} ${label}`;
}

export function createMetadataText(field, value) {
  const element = document.createElement("span");

  if (arguments.length === 1) {
    element.textContent = String(field);
    return element;
  }

  element.dataset.field = field;
  element.textContent = value;

  return element;
}

export function createTimeElement(unixSeconds) {
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

function formatRelativeTime(unixSeconds, nowSeconds) {
  if (!Number.isFinite(unixSeconds) || !Number.isFinite(nowSeconds)) {
    return "unknown time";
  }

  const elapsedSeconds = Math.max(0, Math.floor(nowSeconds - unixSeconds));

  if (elapsedSeconds < 60) {
    return formatUnit(elapsedSeconds, "second");
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  if (elapsedMinutes < 60) {
    return formatUnit(elapsedMinutes, "minute");
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return formatUnit(elapsedHours, "hour");
  }

  return formatUnit(Math.floor(elapsedHours / 24), "day");
}

function formatUnit(value, unit) {
  const suffix = value === 1 ? unit : `${unit}s`;

  return `${value} ${suffix} ago`;
}
