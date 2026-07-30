import { acceptLiveUpdates } from "../features/liveUpdates.js";
import { state } from "../state.js";

/**
 * Renders the live-update banner for the current shell.
 *
 * @param {HTMLElement} container
 */
export function renderLiveView(container) {
  if (!(container instanceof HTMLElement)) {
    throw new TypeError("A valid live container is required");
  }

  const liveState = state.live;

  container.replaceChildren();
  container.hidden = true;
  container.dataset.kind = "idle";

  if (liveState.pendingNewCount <= 0 && liveState.changedItems.length === 0) {
    return;
  }

  const heading = document.createElement("h3");
  const message = document.createElement("p");
  const button = document.createElement("button");

  heading.textContent = "Live updates available";
  message.textContent = createSummary(liveState);
  button.type = "button";
  button.textContent = "Accept updates";
  button.addEventListener("click", async () => {
    await acceptLiveUpdates(state.activeCategory);
    renderLiveView(container);
  });

  container.hidden = false;
  container.dataset.kind = "available";
  container.append(heading, message, button);
}

function createSummary(liveState) {
  const parts = [];

  if (liveState.changedItems.length > 0) {
    parts.push(`${liveState.changedItems.length} changed item${liveState.changedItems.length === 1 ? "" : "s"}`);
  }

  if (liveState.pendingNewCount > 0) {
    parts.push(`${liveState.pendingNewCount} new item${liveState.pendingNewCount === 1 ? "" : "s"}`);
  }

  return parts.join(" and ");
}
