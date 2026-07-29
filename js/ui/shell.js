import { CATEGORIES } from "../config.js";
import { state } from "../state.js";

const CATEGORY_LABELS = Object.freeze({
  stories: "Stories",
  jobs: "Jobs",
  polls: "Polls",
});

let shellRoot = null;
let onCategoryChange = null;
let onCategorySelect = null;

/**
 * Renders the stable application landmarks.
 *
 * @param {HTMLElement} root
 * @param {{
 *   onCategoryChange?: (category: string) => void,
 *   onCategorySelect?: (category: string) => void
 * }} [options]
 */
export function renderShell(root, options = {}) {
  if (!(root instanceof HTMLElement)) {
    throw new TypeError("A valid application root is required");
  }

  shellRoot = root;
  onCategoryChange =
    typeof options.onCategoryChange === "function"
      ? options.onCategoryChange
      : null;
  onCategorySelect =
    typeof options.onCategorySelect === "function"
      ? options.onCategorySelect
      : null;

  root.replaceChildren(
    createHeader(),
    createMain(),
    createDetailDialog(),
  );

  bindCategoryNavigation();
  bindDetailDialog();
  notifyCategorySelection();
  initializeActiveCategory();
}

/**
 * Selects a category without replacing any category's stored feed state.
 *
 * @param {string} category
 */
export function setActiveCategory(category) {
  if (!CATEGORIES.includes(category)) {
    throw new Error(`Unsupported category: ${category}`);
  }

  state.activeCategory = category;

  renderActiveFeedState();
  notifyCategorySelection();
  initializeActiveCategory();
}

/**
 * Synchronizes the visible tabs and heading with application state.
 */
export function renderActiveFeedState() {
  if (!shellRoot) {
    throw new Error("The application shell has not been rendered");
  }

  for (const tab of shellRoot.querySelectorAll('[role="tab"]')) {
    const isActive = tab.dataset.category === state.activeCategory;

    tab.setAttribute("aria-selected", String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  }

  const heading = shellRoot.querySelector("#feed-heading");
  const feedPanel = shellRoot.querySelector("#feed-panel");

  heading.textContent = CATEGORY_LABELS[state.activeCategory];
  feedPanel.setAttribute(
    "aria-labelledby",
    `tab-${state.activeCategory}`,
  );
}

/**
 * Updates the feed's polite announcement region.
 *
 * @param {string} message
 * @param {string} [kind="info"]
 */
export function showStatus(message, kind = "info") {
  if (!shellRoot) {
    throw new Error("The application shell has not been rendered");
  }

  const status = shellRoot.querySelector("#feed-status");
  const statusMessage =
    message === null || message === undefined
      ? ""
      : String(message);

  status.textContent = statusMessage;
  status.dataset.kind = kind;
  status.hidden = statusMessage.length === 0;
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
  status.hidden = true;
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

function bindCategoryNavigation() {
  const tabList = shellRoot.querySelector('[role="tablist"]');

  tabList.addEventListener("click", (event) => {
    const tab = getCategoryTab(event.target);

    if (tab) {
      setActiveCategory(tab.dataset.category);
    }
  });

  tabList.addEventListener("keydown", (event) => {
    const currentTab = getCategoryTab(event.target);

    if (!currentTab) {
      return;
    }

    const tabs = [...tabList.querySelectorAll('[role="tab"]')];
    const currentIndex = tabs.indexOf(currentTab);
    const nextIndex = getNextTabIndex(
      event.key,
      currentIndex,
      tabs.length,
    );

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();

    const nextTab = tabs[nextIndex];

    nextTab.focus();
    setActiveCategory(nextTab.dataset.category);
  });
}

function bindDetailDialog() {
  const dialog = shellRoot.querySelector("#post-detail");
  const closeButton = shellRoot.querySelector("#close-detail");

  const closeDialog = () => {
    dialog.close();
  };

  closeButton.addEventListener("click", closeDialog);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog();
  });
}

function getCategoryTab(target) {
  if (!(target instanceof Element)) {
    return null;
  }

  const tab = target.closest('[role="tab"]');

  if (!tab || !shellRoot.contains(tab)) {
    return null;
  }

  return tab;
}

function getNextTabIndex(key, currentIndex, tabCount) {
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (currentIndex + 1) % tabCount;
    case "ArrowLeft":
    case "ArrowUp":
      return (currentIndex - 1 + tabCount) % tabCount;
    case "Home":
      return 0;
    case "End":
      return tabCount - 1;
    default:
      return null;
  }
}

function initializeActiveCategory() {
  const activeFeed = state.feeds[state.activeCategory];

  if (
    onCategoryChange &&
    !activeFeed.initialized &&
    !activeFeed.loading
  ) {
    onCategoryChange(state.activeCategory);
  }
}

function notifyCategorySelection() {
  if (onCategorySelect) {
    onCategorySelect(state.activeCategory);
  }
}
