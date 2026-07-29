import { CATEGORIES } from "../config.js";
import { state } from "../state.js";

const CATEGORY_LABELS = Object.freeze({
  stories: "Stories",
  jobs: "Jobs",
  polls: "Polls",
});

/**
 * Renders the stable application landmarks.
 *
 * @param {HTMLElement} root
 * @param {{ onCategoryChange?: (category: string) => void }} [options]
 */
export function renderShell(root, options = {}) {
  if (!(root instanceof HTMLElement)) {
    throw new TypeError("A valid application root is required");
  }

  root.replaceChildren(
    createHeader(),
    createMain(),
    createDetailDialog(),
  );
}

export function setActiveCategory() {
  throw new Error("setActiveCategory is not implemented");
}

export function renderActiveFeedState() {
  throw new Error("renderActiveFeedState is not implemented");
}

export function showStatus() {
  throw new Error("showStatus is not implemented");
}

function createHeader() {
  const header = document.createElement("header");
  const heading = document.createElement("h1");
  const navigation = document.createElement("nav");
  const tabList = document.createElement("div");

  heading.textContent = "ClonerNews";
  navigation.setAttribute("aria-label", "Post categories");
  tabList.setAttribute("role", "tablist");
  tabList.setAttribute("aria-label", "News feeds");

  for (const category of CATEGORIES) {
    tabList.append(createCategoryTab(category));
  }

  navigation.append(tabList);
  header.append(heading, navigation);

  return header;
}

function createCategoryTab(category) {
  const tab = document.createElement("button");
  const isActive = category === state.activeCategory;

  tab.id = `tab-${category}`;
  tab.type = "button";
  tab.textContent = CATEGORY_LABELS[category];
  tab.dataset.category = category;
  tab.setAttribute("role", "tab");
  tab.setAttribute("aria-controls", "feed-panel");
  tab.setAttribute("aria-selected", String(isActive));
  tab.tabIndex = isActive ? 0 : -1;

  return tab;
}

function createMain() {
  const main = document.createElement("main");
  const liveUpdates = document.createElement("section");
  const feed = document.createElement("section");
  const heading = document.createElement("h2");
  const status = document.createElement("p");
  const feedList = document.createElement("ul");
  const loadMore = document.createElement("button");
  const sentinel = document.createElement("div");

  main.id = "main-content";

  liveUpdates.id = "live-updates";
  liveUpdates.setAttribute("aria-label", "Live updates");
  liveUpdates.setAttribute("aria-live", "polite");
  liveUpdates.setAttribute("aria-atomic", "true");

  feed.id = "feed-panel";
  feed.setAttribute("role", "tabpanel");
  feed.setAttribute("aria-labelledby", `tab-${state.activeCategory}`);

  heading.id = "feed-heading";
  heading.textContent = CATEGORY_LABELS[state.activeCategory];

  status.id = "feed-status";
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");

  feedList.id = "feed-list";

  loadMore.id = "load-more";
  loadMore.type = "button";
  loadMore.textContent = "Load more";

  sentinel.id = "feed-sentinel";
  sentinel.setAttribute("aria-hidden", "true");

  feed.append(heading, status, feedList, loadMore, sentinel);
  main.append(liveUpdates, feed);

  return main;
}

function createDetailDialog() {
  const dialog = document.createElement("dialog");
  const heading = document.createElement("h2");
  const closeButton = document.createElement("button");
  const content = document.createElement("div");

  dialog.id = "post-detail";
  dialog.setAttribute("aria-labelledby", "detail-heading");

  heading.id = "detail-heading";
  heading.textContent = "Post details";

  closeButton.id = "close-detail";
  closeButton.type = "button";
  closeButton.textContent = "Close";
  closeButton.setAttribute("aria-label", "Close post details");

  content.id = "detail-content";

  dialog.append(heading, closeButton, content);

  return dialog;
}
