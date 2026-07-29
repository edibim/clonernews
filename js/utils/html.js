const ALLOWED_ELEMENTS = new Set([
  "A",
  "P",
  "BR",
  "PRE",
  "CODE",
  "EM",
  "I",
  "STRONG",
  "B",
  "BLOCKQUOTE",
  "UL",
  "OL",
  "LI",
]);

const CONTENT_REMOVAL_ELEMENTS = new Set([
  "SCRIPT",
  "STYLE",
  "IFRAME",
  "OBJECT",
]);

const SAFE_LINK_PROTOCOLS = new Set([
  "http:",
  "https:",
  "mailto:",
]);

/**
 * Sanitizes untrusted HTML.
 *
 * @param {string} value
 * @returns {string}
 */
export function sanitizeHTML(value = "") {
  if (value === null || value === undefined) {
    return "";
  }

  const template = document.createElement("template");

  template.innerHTML = String(value);

  sanitizeChildren(template.content);

  return template.innerHTML;
}

/**
 * Sets sanitized HTML content on an element.
 *
 * @param {Element} element
 * @param {string} value
 */
export function setSanitizedHTML(element, value) {
  element.innerHTML = sanitizeHTML(value);
}

function sanitizeChildren(parent) {
  for (const child of [...parent.childNodes]) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      sanitizeElement(child);
    }
  }
}

function sanitizeElement(element) {
  if (CONTENT_REMOVAL_ELEMENTS.has(element.tagName)) {
    element.remove();
    return;
  }

  sanitizeChildren(element);

  if (!ALLOWED_ELEMENTS.has(element.tagName)) {
    element.replaceWith(...element.childNodes);
    return;
  }

  sanitizeAttributes(element);
}

function sanitizeAttributes(element) {
  if (element.tagName !== "A") {
    removeAllAttributes(element);
    return;
  }

  const href = element.getAttribute("href");

  removeAllAttributes(element);

  if (!isSafeHref(href)) {
    return;
  }

  element.setAttribute("href", href);
  element.setAttribute("target", "_blank");
  element.setAttribute("rel", "noopener noreferrer nofollow");
}

function removeAllAttributes(element) {
  for (const attribute of [...element.attributes]) {
    element.removeAttribute(attribute.name);
  }
}

function isSafeHref(href) {
  if (!href) {
    return false;
  }

  try {
    const url = new URL(href, document.baseURI);

    return SAFE_LINK_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}
