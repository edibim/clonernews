import {
  initializeFeed,
  loadNextPage,
} from "./features/feed.js";
import { state } from "./state.js";
import { renderFeedView } from "./ui/feedView.js";
import { renderShell } from "./ui/shell.js";

function initializeApp() {
  const app = document.querySelector("#app");

  if (!app) {
    throw new Error("Application root was not found");
  }

  renderShell(app, {
    onCategoryChange(category) {
      if (isProgressiveCategory(category)) {
        void runFeedOperation(app, category, initializeFeed);
      }
    },
    onCategorySelect(category) {
      renderFeedView(app, category);
    },
  });

  app
    .querySelector("#load-more")
    .addEventListener("click", () => {
      const category = state.activeCategory;

      if (!isProgressiveCategory(category)) {
        return;
      }

      const operation = state.feeds[category].initialized
        ? loadNextPage
        : initializeFeed;

      void runFeedOperation(app, category, operation);
    });
}

document.addEventListener("DOMContentLoaded", initializeApp);

async function runFeedOperation(root, category, operation) {
  const request = operation(category);

  renderFeedView(root, category);

  await request;

  if (state.activeCategory === category) {
    renderFeedView(root, category);
  }
}

function isProgressiveCategory(category) {
  return category === "stories" || category === "jobs";
}
