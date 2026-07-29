import { assert, assertEqual, test } from "./runner.js";

import { resetState, state } from "../js/state.js";
import {
  renderShell,
  setActiveCategory,
  showStatus,
} from "../js/ui/shell.js";

function createShell(options) {
  resetState();

  const root = document.createElement("div");
  document.body.append(root);

  renderShell(root, options);

  return root;
}

function removeShell(root) {
  root.remove();
}

test("renderShell creates the required application landmarks and tabs", () => {
  const root = createShell();

  try {
    assert(root.querySelector("header"));
    assert(root.querySelector("main"));
    assert(root.querySelector('[role="tablist"]'));
    assertEqual(root.querySelectorAll('[role="tab"]').length, 3);
    assert(root.querySelector('[aria-live="polite"]'));
    assert(root.querySelector("#feed-list"));
    assert(root.querySelector("#feed-sentinel"));
    assert(root.querySelector("dialog"));
    assert(root.querySelector("#close-detail"));
  } finally {
    removeShell(root);
  }
});

test("Stories begins as the selected category", () => {
  const root = createShell();

  try {
    const storiesTab = root.querySelector('[data-category="stories"]');

    assertEqual(state.activeCategory, "stories");
    assertEqual(storiesTab.getAttribute("aria-selected"), "true");
    assertEqual(storiesTab.tabIndex, 0);
    assertEqual(root.querySelector("#feed-heading").textContent, "Stories");
  } finally {
    removeShell(root);
  }
});

test("clicking a category updates state and tab accessibility", () => {
  const root = createShell();

  try {
    const storiesTab = root.querySelector('[data-category="stories"]');
    const jobsTab = root.querySelector('[data-category="jobs"]');

    jobsTab.click();

    assertEqual(state.activeCategory, "jobs");
    assertEqual(jobsTab.getAttribute("aria-selected"), "true");
    assertEqual(jobsTab.tabIndex, 0);
    assertEqual(storiesTab.getAttribute("aria-selected"), "false");
    assertEqual(storiesTab.tabIndex, -1);
    assertEqual(root.querySelector("#feed-heading").textContent, "Jobs");
  } finally {
    removeShell(root);
  }
});

test("arrow keys move focus and activate the next category tab", () => {
  const root = createShell();

  try {
    const storiesTab = root.querySelector('[data-category="stories"]');
    const jobsTab = root.querySelector('[data-category="jobs"]');

    storiesTab.focus();
    storiesTab.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        key: "ArrowRight",
      }),
    );

    assertEqual(document.activeElement, jobsTab);
    assertEqual(state.activeCategory, "jobs");
  } finally {
    removeShell(root);
  }
});

test("returning to an initialized category does not initialize it again", () => {
  const initializedCategories = [];
  const root = createShell({
    onCategoryChange(category) {
      initializedCategories.push(category);
      state.feeds[category].initialized = true;
    },
  });

  try {
    setActiveCategory("jobs");
    setActiveCategory("stories");
    setActiveCategory("jobs");

    assertEqual(
      initializedCategories.filter((category) => category === "stories").length,
      1,
    );
    assertEqual(
      initializedCategories.filter((category) => category === "jobs").length,
      1,
    );
  } finally {
    removeShell(root);
  }
});

test("showStatus announces a message and its kind politely", () => {
  const root = createShell();

  try {
    showStatus("Loading stories", "loading");

    const status = root.querySelector("#feed-status");

    assertEqual(status.textContent, "Loading stories");
    assertEqual(status.dataset.kind, "loading");
    assertEqual(status.getAttribute("aria-live"), "polite");
  } finally {
    removeShell(root);
  }
});

test("the close button and cancel event close the detail dialog", () => {
  const root = createShell();

  try {
    const dialog = root.querySelector("#post-detail");
    let closeCount = 0;

    dialog.close = () => {
      closeCount += 1;
    };

    root.querySelector("#close-detail").click();
    dialog.dispatchEvent(
      new Event("cancel", {
        cancelable: true,
      }),
    );

    assertEqual(closeCount, 2);
  } finally {
    removeShell(root);
  }
});
