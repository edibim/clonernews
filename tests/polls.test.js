import { assert, assertEqual, test } from "./runner.js";

import {
  discoverPolls,
  loadPollOptions,
  validatePollOption,
} from "../js/features/polls.js";
import {
  closePostDetail,
  openPostDetail,
  renderPollOptions,
} from "../js/ui/detailView.js";
import { renderShell } from "../js/ui/shell.js";
import { resetState, state } from "../js/state.js";
import { clearItemCache } from "../js/services/itemCache.js";
import { clearPendingRequests } from "../js/services/requestDeduper.js";
import { resetRequestQueue } from "../js/services/requestQueue.js";
import { createMockFetch } from "./mockFetch.js";

function createRecentIds(maxItem, count = 60) {
  return Array.from(
    { length: count },
    (_, index) => maxItem - index,
  );
}

function createPoll(id, time = id, parts = []) {
  return {
    id,
    type: "poll",
    title: `Poll ${id}`,
    time,
    parts,
  };
}

function createStory(id) {
  return {
    id,
    type: "story",
    title: `Story ${id}`,
    time: id,
  };
}

function createOption(id, poll, text = `Option ${id}`, score = 1) {
  return {
    id,
    type: "pollopt",
    poll,
    score,
    text,
  };
}

function resetPollTestState() {
  resetState();
  clearItemCache();
  clearPendingRequests();
  resetRequestQueue();
}

async function withMockFetch(responses, callback) {
  const originalFetch = globalThis.fetch;
  const mockFetch = createMockFetch(responses);

  globalThis.fetch = mockFetch;

  try {
    await callback(mockFetch);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("poll discovery inspects no more than 60 recent IDs", async () => {
  resetPollTestState();

  const maxItem = 90_000;
  const recentIds = createRecentIds(maxItem);

  await withMockFetch(
    [
      { body: maxItem },
      ...recentIds.map((id) => ({ body: createStory(id) })),
      { body: null },
      { body: null },
    ],
    async (mockFetch) => {
      await discoverPolls();

      const recentItemCalls = mockFetch.calls.filter((call) => {
        const match = call.url.match(/\/item\/(\d+)\.json$/);

        if (!match) {
          return false;
        }

        const id = Number(match[1]);

        return id <= maxItem && id > maxItem - 60;
      });

      assertEqual(recentItemCalls.length, 60);
    },
  );
});

test("poll discovery stops after six valid polls and caches results", async () => {
  resetPollTestState();

  const maxItem = 91_000;
  const recentIds = createRecentIds(maxItem, 6);

  await withMockFetch(
    [
      { body: maxItem },
      ...recentIds.map((id) => ({ body: createPoll(id) })),
    ],
    async (mockFetch) => {
      const firstResult = await discoverPolls();
      const secondResult = await discoverPolls();

      assertEqual(firstResult.length, 6);
      assertEqual(secondResult, firstResult);
      assertEqual(mockFetch.calls.length, 7);
      assertEqual(state.feeds.polls.initialized, true);
    },
  );
});

test("fallback poll IDs are added without duplicates", async () => {
  resetPollTestState();

  const maxItem = 160_704;
  const recentIds = createRecentIds(maxItem);

  await withMockFetch(
    [
      { body: maxItem },
      { body: createPoll(160_704) },
      ...recentIds
        .slice(1)
        .map((id) => ({ body: createStory(id) })),
      { body: createPoll(126_809) },
    ],
    async () => {
      const polls = await discoverPolls();

      assertEqual(
        polls.filter((poll) => poll.id === 160_704).length,
        1,
      );
      assertEqual(
        polls.filter((poll) => poll.id === 126_809).length,
        1,
      );
    },
  );
});

test("invalid fallback poll data is ignored safely", async () => {
  resetPollTestState();

  const maxItem = 92_000;
  const recentIds = createRecentIds(maxItem);

  await withMockFetch(
    [
      { body: maxItem },
      ...recentIds.map((id) => ({ body: createStory(id) })),
      { body: null },
      { body: createStory(126_809) },
    ],
    async () => {
      const polls = await discoverPolls();

      assertEqual(polls.length, 0);
    },
  );
});

test("discovered polls are sorted newest-first", async () => {
  resetPollTestState();

  const maxItem = 93_000;
  const recentIds = createRecentIds(maxItem, 6);
  const times = [100, 600, 200, 500, 300, 400];

  await withMockFetch(
    [
      { body: maxItem },
      ...recentIds.map((id, index) => ({
        body: createPoll(id, times[index]),
      })),
    ],
    async () => {
      const polls = await discoverPolls();

      assertEqual(polls[0].time, 600);
      assertEqual(polls[5].time, 100);
    },
  );
});

test("poll options are requested only from parts", async () => {
  resetPollTestState();

  const poll = createPoll(94_000, 100, [94_001, 94_002]);

  await withMockFetch(
    [
      { body: createOption(94_001, poll.id) },
      { body: createOption(94_002, poll.id) },
    ],
    async (mockFetch) => {
      const options = await loadPollOptions(poll);
      const cachedOptions = await loadPollOptions(poll);

      assertEqual(options.length, 2);
      assertEqual(cachedOptions, options);
      assertEqual(mockFetch.calls.length, 2);
      assert(
        mockFetch.calls[0].url.endsWith("/item/94001.json"),
      );
      assert(
        mockFetch.calls[1].url.endsWith("/item/94002.json"),
      );
    },
  );
});

test("poll options with the wrong parent are rejected", async () => {
  resetPollTestState();

  const poll = createPoll(95_000, 100, [95_001]);
  const wrongParentOption = createOption(95_001, 123);

  assertEqual(
    validatePollOption(wrongParentOption, poll.id),
    false,
  );

  await withMockFetch(
    [{ body: wrongParentOption }],
    async () => {
      const options = await loadPollOptions(poll);

      assertEqual(options.length, 1);
      assertEqual(options[0].unavailable, true);
    },
  );
});

test("poll options preserve parts order", async () => {
  resetPollTestState();

  const poll = createPoll(
    96_000,
    100,
    [96_003, 96_001, 96_002],
  );

  await withMockFetch(
    [
      { body: createOption(96_003, poll.id) },
      { body: createOption(96_001, poll.id) },
      { body: createOption(96_002, poll.id) },
    ],
    async () => {
      const options = await loadPollOptions(poll);

      assertEqual(options[0].id, 96_003);
      assertEqual(options[1].id, 96_001);
      assertEqual(options[2].id, 96_002);
    },
  );
});

test("poll option rendering shows scores and unavailable placeholders", () => {
  const poll = createPoll(
    97_000,
    100,
    [97_001, 97_002],
  );
  const view = renderPollOptions(poll, [
    createOption(
      97_001,
      poll.id,
      "<strong>First choice</strong>",
      12,
    ),
    {
      id: 97_002,
      poll: poll.id,
      type: "pollopt",
      unavailable: true,
    },
  ]);

  assertEqual(view.children.length, 2);
  assert(view.textContent.includes("First choice"));
  assert(view.textContent.includes("12 points"));
  assert(view.textContent.includes("Option unavailable"));
  assert(view.querySelector("strong"));
});

test("opening a poll detail renders its validated options", async () => {
  resetPollTestState();

  const poll = createPoll(98_000, 100, [98_001]);
  const root = document.createElement("div");

  document.body.append(root);
  renderShell(root);

  const dialog = root.querySelector("#post-detail");

  dialog.showModal = () => {
    dialog.setAttribute("open", "");
  };
  dialog.close = () => {
    dialog.removeAttribute("open");
  };

  try {
    await withMockFetch(
      [
        { body: poll },
        {
          body: createOption(
            98_001,
            poll.id,
            "Visible option",
            7,
          ),
        },
      ],
      async () => {
        await openPostDetail(poll.id);
      },
    );

    assert(
      root
        .querySelector("#detail-content")
        .textContent.includes("Visible option"),
    );
    assert(
      root
        .querySelector("#detail-content")
        .textContent.includes("7 points"),
    );
  } finally {
    closePostDetail();
    root.remove();
  }
});
