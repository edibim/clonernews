import {
  initializeFeed,
  loadNextPage,
} from "./features/feed.js";
import { discoverPolls } from "./features/polls.js";
import {
  initializeLiveSnapshot,
  startLiveUpdates,
} from "./features/liveUpdates.js";
import { state } from "./state.js";
import {
  closePostDetail,
  openPostDetail,
} from "./ui/detailView.js";
import { renderFeedView } from "./ui/feedView.js";
import { renderShell } from "./ui/shell.js";
import { throttle } from "./utils/throttle.js";

function initializeApp() {
  const app = document.querySelector("#app");

  if (!app) {
    throw new Error("Application root was not found");
  }

  renderShell(app, {
    onCategoryChange(category) {
      if (isProgressiveCategory(category)) {
        void runFeedOperation(app, category, initializeFeed);
      } else if (category === "polls") {
        void runPollDiscovery(app);
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

      if (category === "polls") {
        if (
          !state.feeds.polls.initialized &&
          !state.feeds.polls.loading
        ) {
          void runPollDiscovery(app);
        }

        return;
      }

      void runProgressiveFeedLoad(app, category);
    });

  app
    .querySelector("#feed-list")
    .addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const detailButton = event.target.closest(
        '[data-action="open-detail"]',
      );

      if (!detailButton) {
        return;
      }

      const itemId = Number(detailButton.dataset.itemId);

      if (Number.isSafeInteger(itemId) && itemId > 0) {
        void openPostDetail(itemId);
      }
    });

  app
    .querySelector("#post-detail")
    .addEventListener("close", closePostDetail);

  bindAutoFeedLoader(app, () => {
    void runProgressiveFeedLoad(app, state.activeCategory);
  });

  void initializeLiveSnapshot();
  startLiveUpdates();
}

document.addEventListener("DOMContentLoaded", initializeApp);

export function bindAutoFeedLoader(root, loadHandler) {
  if (!(root instanceof HTMLElement)) {
    throw new TypeError("A valid application root is required");
  }

  if (typeof IntersectionObserver !== "function") {
    return null;
  }

  const sentinel = root.querySelector("#feed-sentinel");

  if (!sentinel) {
    return null;
  }

  const throttledLoad = throttle(() => {
    const category = state.activeCategory;
    const feed = state.feeds[category];

    if (
      document.visibilityState === "hidden" ||
      !feed ||
      feed.loading ||
      feed.exhausted ||
      Boolean(feed.error)
    ) {
      return;
    }

    void loadHandler();
  }, 150);

  const observer = new IntersectionObserver((entries) => {
    if (
      document.visibilityState === "hidden" ||
      !entries.some((entry) => entry.isIntersecting)
    ) {
      return;
    }

    throttledLoad();
  });

  observer.observe(sentinel);
  return observer;
}

async function runFeedOperation(root, category, operation) {
  const request = operation(category);

  renderFeedView(root, category);

  await request;

  if (state.activeCategory === category) {
    renderFeedView(root, category);
  }
}

async function runProgressiveFeedLoad(root, category) {
  if (category === "polls") {
    return;
  }

  if (!isProgressiveCategory(category)) {
    return;
  }

  const operation = state.feeds[category].initialized
    ? loadNextPage
    : initializeFeed;

  await runFeedOperation(root, category, operation);
}

function isProgressiveCategory(category) {
  return category === "stories" || category === "jobs";
}

async function runPollDiscovery(root) {
  const request = discoverPolls();

  renderFeedView(root, "polls");

  await request;

  if (state.activeCategory === "polls") {
    renderFeedView(root, "polls");
  }
}
