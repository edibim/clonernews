# PRD — ClonerNews

**Project:** ClonerNews — Hacker News API reader  
**Date:** 2026-07-24  
**Source exercise:** [exercise.md](exercise.md)   
**Implementation plan:** [tasks.md](tasks.md)

## Team

- **Member A — Platform:** API client, cache, request deduplication, concurrency queue, comments data
- **Member B — Features:** feeds, poll discovery, live updates, automatic loading
- **Member C — Interface:** application shell, rendering, sanitization, responsive CSS, accessibility

Replace `Member A`, `Member B`, and `Member C` with the three contributors' names at kickoff. The ownership boundaries remain the same.

---

## 1. Goal

Build a modern, responsive Hacker News reader with vanilla JavaScript.

Users can:

- browse Stories, Jobs, and Polls
- progressively load more posts
- open every supported post type
- read poll options
- read direct comments and nested replies
- see posts and comment siblings newest-first
- receive visible notifications about new or changed Hacker News data

Done well means the interface stays responsive and understandable while asynchronous work is happening, comments never appear beneath the wrong post, and network activity remains controlled.

---

## 2. Source Priority

When documents conflict, use this order:

1. `docs/exercise.md`
2. `docs/audit.md`
3. `docs/clonernews-plan.md`
4. this PRD
5. `docs/tasks.md`
6. `docs/milestones.md`
7. `README.md`

The exercise and audit define mandatory behavior. The other documents explain how the team will deliver it.

---

## 3. Constraints

- Vanilla JavaScript only; no React, Vue, Svelte, or similar framework.
- Native ES modules.
- No package manager, bundler, or build step.
- No runtime JavaScript dependency loaded from a CDN.
- Run through a static HTTP server; ES modules are not supported through `file://`.
- Use the official Hacker News v0 API.
- Automated tests use deterministic fixtures and mocked requests, not live API data.
- Support current Chrome and Firefox.
- Treat all Hacker News `title` and `text` values as untrusted HTML.
- Do not attempt login, voting, posting, or user-profile features.

---

## 4. Requirements

Requirement IDs are permanent. Tests, milestones, and audit notes cite them.

### 4.1 API and Request Control

- **R1** — Use `https://hacker-news.firebaseio.com/v0` as the API base.
- **R2** — Fetch Stories IDs from `/newstories.json`.
- **R3** — Fetch Jobs IDs from `/jobstories.json`.
- **R4** — Fetch items, comments, polls, and poll options from `/item/<id>.json`.
- **R5** — Handle successful `null` item responses without throwing.
- **R6** — Preserve compatibility with unknown additional API fields.
- **R7** — Cache completed item requests for the browser session.
- **R8** — Concurrent requests for the same item share one in-flight Promise.
- **R9** — Failed and aborted requests are removed from pending-request state.
- **R10** — Run no more than six item requests concurrently.
- **R11** — A force-refresh option bypasses completed cache data for live changes.
- **R12** — Loading guards prevent duplicate batches from repeated user or observer events.

### 4.2 Required Feeds

- **R13** — The primary navigation always exposes Stories, Jobs, and Polls.
- **R14** — Stories contain visible, non-dead items whose type is `story`.
- **R15** — Jobs contain visible, non-dead items whose type is `job`.
- **R16** — Polls contain visible, non-dead items whose type is `poll`.
- **R17** — Every displayed post collection is explicitly sorted by numeric `time`, newest-first.
- **R18** — Equal timestamps keep their existing relative order.
- **R19** — Null, dead, deleted, unsupported, and category-mismatched items do not produce broken cards.
- **R20** — Already loaded IDs do not create duplicate cards.
- **R21** — Returning to an initialized category reuses its state instead of restarting it.

### 4.3 Progressive Loading

- **R22** — Load 15 visible posts per batch.
- **R23** — Slice or budget IDs before resolving item records; never fetch an entire list of item records at startup.
- **R24** — Inspect no more than 45 candidate IDs for one user-triggered feed batch.
- **R25** — A visible **Load more** button remains available until the feed is exhausted.
- **R26** — `IntersectionObserver` may request another batch near the feed end.
- **R27** — Button and observer triggers share one throttled loading guard.
- **R28** — A later batch failure preserves previously loaded posts and exposes Retry.
- **R29** — Exhausted feeds stop observing and disable further loading.

### 4.4 Cards and Detail

- **R30** — Stories, Jobs, and Polls open in the detail dialog without errors.
- **R31** — Story cards show title, author, score, comment count, time, and safe outbound source when present.
- **R32** — Job cards tolerate missing author, score, URL, text, and comments.
- **R33** — Poll cards show title, metadata, body, and the availability of options.
- **R34** — Missing optional values use stable human-readable fallbacks.
- **R35** — Invalid or unsafe outbound URLs are not rendered as clickable links.
- **R36** — Opening a new post aborts or ignores stale work belonging to the previous selection.
- **R37** — The dialog closes through an explicit control and `Escape`, then returns focus to its opener.

### 4.5 Polls

- **R38** — Poll discovery starts only when the Polls tab is first opened.
- **R39** — Read `/maxitem.json` and inspect at most 60 descending item IDs.
- **R40** — Stop the bounded scan after finding six valid polls.
- **R41** — Add known real poll IDs `160704` and `126809` as API-fetched fallbacks when necessary.
- **R42** — Validate fallback records as `type === "poll"` before displaying them.
- **R43** — Fetch poll options only from the selected poll's `parts`.
- **R44** — Accept a poll option only when it has `type === "pollopt"` and its `poll` matches the selected poll.
- **R45** — Preserve the API's `parts` order when rendering options.
- **R46** — Invalid or unavailable options show a stable placeholder and do not break the poll.

### 4.6 Comments

- **R47** — Direct comment IDs come only from the selected post's `kids`.
- **R48** — A direct comment is accepted only when `comment.parent` equals the selected post ID.
- **R49** — Local comment state carries the selected `rootPostId`; API records remain unchanged.
- **R50** — Direct comments load in batches of 20.
- **R51** — Direct comment siblings are sorted newest-first.
- **R52** — Comments from different selected posts never share rendered state.
- **R53** — Deleted comments with replies retain a minimal `[deleted]` placeholder so the thread remains reachable.
- **R54** — A failed comment batch preserves loaded comments and exposes Retry.
- **R55** — Results from an old selection cannot render beneath a newly selected post.

### 4.7 Nested Replies

- **R56** — Replies load only when their parent comment is expanded.
- **R57** — Reply IDs come only from that parent comment's `kids`.
- **R58** — A reply is accepted only when its `parent` matches the expanded comment.
- **R59** — Replies inherit the selected post's local `rootPostId`.
- **R60** — Replies load in batches of 10.
- **R61** — Reply siblings are sorted newest-first at every depth.
- **R62** — Logical nesting depth is unrestricted; visual indentation stops increasing after five levels.
- **R63** — Collapsing hides replies without discarding their cached state.
- **R64** — Re-expanding a comment does not refetch already loaded replies.

### 4.8 Live Data

- **R65** — Capture an initial `/maxitem.json` snapshot during startup.
- **R66** — While the page is visible, check `/updates.json` and `/maxitem.json` every 5,000 ms.
- **R67** — Never overlap two live checks.
- **R68** — Intersect changed IDs with IDs already known by this application.
- **R69** — Force-refresh at most ten relevant changed items per tick.
- **R70** — Max-item growth updates a pending-new count without resolving every new ID in the background.
- **R71** — A visible live section and polite announcement notify the user of relevant changes.
- **R72** — Live data does not automatically shift the feed while the user is reading.
- **R73** — Accepting an update inspects at most the newest 20 IDs between max snapshots.
- **R74** — Accepted supported items merge without duplicates and sort newest-first.
- **R75** — A failed live check preserves the current UI and retries at the next interval.
- **R76** — Pause interval work while the document is hidden and run one throttled check when it becomes visible.

### 4.9 Safety, UX, and Accessibility

- **R77** — Sanitize every Hacker News title and text before inserting it as HTML.
- **R78** — Allow only `a`, `p`, `br`, `pre`, `code`, `em`, `i`, `strong`, `b`, `blockquote`, `ul`, `ol`, and `li`.
- **R79** — Remove active content, event attributes, unsafe elements, and unsafe URL protocols.
- **R80** — External links use `target="_blank"` and `rel="noopener noreferrer nofollow"`.
- **R81** — Loading, incremental loading, empty, deleted, unavailable, error, retry, and offline states are visible.
- **R82** — Tabs, cards, dialog controls, Load more, comment controls, and live controls are keyboard accessible.
- **R83** — Focus is visible, status changes are announced, and errors are not communicated by color alone.
- **R84** — Layout works on desktop, tablet, and narrow mobile screens.
- **R85** — Respect `prefers-reduced-motion`.
- **R86** — Normal, retry, empty, and abort flows leave the browser console clean.

---

## 5. Contracts

Contracts are agreed in M1 and scaffolded in M2. After M2 merges, signature changes require a separate contract PR approved by all three members.

### 5.1 Configuration

```js
// js/config.js
export const API_BASE_URL;
export const POST_BATCH_SIZE;          // 15
export const COMMENT_BATCH_SIZE;       // 20
export const REPLY_BATCH_SIZE;         // 10
export const MAX_CONCURRENT_REQUESTS;  // 6
export const LIVE_INTERVAL_MS;         // 5000
export const POLL_SCAN_BUDGET;         // 60
export const POLL_TARGET_COUNT;        // 6
export const LIVE_NEW_ITEM_FETCH_CAP;  // 20
export const KNOWN_POLL_IDS;           // [160704, 126809]
export const CATEGORIES;
```

### 5.2 State

```js
// js/state.js
export const state;
export function createFeedState();
export function resetState();
export function getActiveFeed();
export function getKnownItemIds();
```

Mutable data lives in `state`; fixed behavior lives in `config.js`. API records are never mutated to add UI state.

### 5.3 API

```js
// js/api/endpoints.js
export function getItemUrl(id);
export function getFeedUrl(category);
export function getMaxItemUrl();
export function getUpdatesUrl();

// js/api/client.js
export async function fetchJson(url, { signal } = {});
export async function requestItem(id, { signal } = {});
export async function requestFeedIds(category, { signal } = {});
export async function requestMaxItem({ signal } = {});
export async function requestUpdates({ signal } = {});
export async function fetchItem(
  id,
  { forceRefresh = false, signal } = {},
);
export async function fetchItems(ids, options = {});
```

Only `api/client.js` calls `fetch` directly.

### 5.4 Request Services

```js
// itemCache.js
export function getCachedItem(id);
export function setCachedItem(id, item);
export function deleteCachedItem(id);
export function clearItemCache();

// requestDeduper.js
export function dedupeRequest(key, loader);
export function clearPendingRequests();

// requestQueue.js
export function enqueueRequest(loader, { signal } = {});
export function getQueueStats();
export function resetRequestQueue();
```

### 5.5 Features

```js
// feed.js
export async function initializeFeed(category, { signal } = {});
export async function loadNextPage(category, { signal } = {});
export function mergeFeedItems(category, incomingItems);
export function isVisibleTopLevelItem(item, category);

// polls.js
export async function discoverPolls({ signal } = {});
export async function loadPollOptions(poll, { signal } = {});
export function validatePollOption(option, pollId);

// comments.js
export async function initializeComments(post, { signal } = {});
export async function loadMoreComments(parentId, rootPostId, options = {});
export async function toggleReplies(commentId, rootPostId, options = {});
export async function loadMoreReplies(commentId, rootPostId, options = {});
export function validateCommentParent(comment, parentId);

// liveUpdates.js
export async function initializeLiveSnapshot({ signal } = {});
export function startLiveUpdates(onUpdate);
export function stopLiveUpdates();
export async function checkLiveUpdates({ signal } = {});
export async function acceptLiveUpdates(category, { signal } = {});
```

### 5.6 Shared Utilities

```js
export function sortNewestFirst(items);
export function formatRelativeTime(unixSeconds, nowSeconds);
export function sanitizeHTML(value);
export function setSanitizedHTML(element, value);
export function throttle(fn, waitMs);
```

### 5.7 UI

```js
// shell.js
export function renderShell(root);
export function setActiveCategory(category);
export function showStatus(message, kind);

// feedView.js
export function renderFeedItems(container, items);
export function createPostCard(item);

// detailView.js
export async function openPostDetail(itemId);
export function closePostDetail();
export function renderPostDetail(item);

// commentsView.js
export function renderComments(parentId, rootPostId);
export function createCommentNode(comment, rootPostId, depth);

// liveView.js
export function renderLiveStatus(liveState);
```

UI modules write only to their assigned containers. Feature and service modules never write to the DOM.

---

## 6. Fixed DOM Hooks

M2 creates these hooks. Later feature milestones consume them without renaming them.

- `#app` — application root
- `#category-tabs` — category navigation
- `#live-region` — polite announcements
- `#live-panel` — visible live update information
- `#feed-status` — feed loading, empty, and error state
- `#feed-list` — post cards
- `#load-more` — explicit progressive-loading control
- `#feed-sentinel` — automatic-loading observer target
- `#post-dialog` — selected post and comments
- `#dialog-content` — detail writer
- `#dialog-close` — explicit close control

Generated elements use stable `data-*` hooks:

- `data-category`
- `data-item-id`
- `data-comment-id`
- `data-action`

Tests and event delegation rely on these names. Change them only in a contract PR.

---

## 7. Architecture

### 7.1 File Structure

```text
clonernews/
├── index.html
├── tests.html
├── README.md
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── config.js
│   ├── state.js
│   ├── api/
│   ├── services/
│   ├── features/
│   ├── ui/
│   └── utils/
├── tests/
└── docs/
```

The detailed tree is fixed in [tasks.md](tasks.md).

### 7.2 Dependency Direction

```text
app.js
├── ui/*
├── features/*
└── state.js

ui/*
├── features/*
├── utils/*
└── state.js

features/*
├── api/client.js
├── services/*
├── utils/*
├── config.js
└── state.js

api/client.js
├── api/endpoints.js
├── services/*
└── config.js

services/* and utils/*
└── config.js where required
```

Dependencies point downward. Do not import UI modules from features, services, API, or utilities.

### 7.3 Event Discipline

- Bind long-lived listeners once, on stable containers.
- Use event delegation for generated cards and comment controls.
- A UI event validates its target, updates state or calls one feature action, then requests rendering.
- Async actions guard against stale selection and duplicate loading.
- Intervals and observers have explicit start/stop behavior.

### 7.4 Shared Files

These files are shared and frozen after M2:

- `index.html`
- `tests.html`
- `js/app.js`
- `js/config.js`
- `js/state.js`

M6 and M10 are planned integration milestones that may reopen shared files. During those milestones, one named integrator owns each shared file; the other members review rather than editing it simultaneously.

Any unplanned shared-file change:

1. is announced to the team
2. lands as a small standalone PR
3. receives approval from both other members
4. merges before dependent branches update from `dev`

---

## 8. Testing

### 8.1 Automated Tests

- Use `tests.html` and a dependency-free browser runner.
- Test modules register synchronous or asynchronous cases.
- Use fixtures for every supported item type and failure state.
- Mock `fetch`; do not depend on live Hacker News data.
- Run the whole suite before every PR.

Required coverage:

- endpoint building and HTTP behavior
- null and malformed responses
- cache and in-flight request deduplication
- six-request concurrency limit
- newest-first stable sorting
- sanitizer allowlist and unsafe URL removal
- progressive feed cursor and duplicate control
- bounded poll discovery and option-parent validation
- direct-comment and nested-reply parent validation
- stale-selection protection
- exact five-second live timing
- live merge deduplication
- throttled automatic loading

### 8.2 Manual Checks

Automated tests do not replace the audit. Before integration PRs merge:

- inspect live network request counts
- open a story, job, and poll
- load more multiple times
- open comments from multiple posts
- expand multiple reply levels
- wait through at least three live intervals
- test keyboard and dialog focus
- test narrow mobile width
- test Chrome and Firefox
- confirm a clean console

---

## 9. Team Workflow

### 9.1 Branches

```text
main
└── dev
    ├── milestone/m2-base
    ├── milestone/m3-api
    ├── milestone/m4-feeds
    ├── milestone/m5-interface
    └── ...
```

- `main` contains audit-ready releases only.
- `dev` is the integration branch.
- Every milestone uses one branch created from current `dev`.
- Never commit feature work directly to `main` or `dev`.
- Do not mix unrelated cleanup into a milestone branch.

### 9.2 Ownership

- One owner writes the files assigned to an open milestone.
- Other members may review, test, and comment, but do not edit those files on competing branches.
- If another milestone needs an owner-controlled change, request it from the owner.
- Shared integration files have one temporary integrator.

### 9.3 Pull Requests

Every milestone ends with a pull request into `dev`.

The PR description contains:

- milestone and requirement IDs
- files owned by the PR
- tests added first
- commands and manual checks run
- network-request observations when applicable
- screenshots for visible UI work
- known limitations or follow-up work

Merge requirements:

- branch updated from current `dev`
- all browser tests pass
- console is clean for the milestone flow
- one teammate approves
- a second teammate runs or witnesses the relevant manual check
- no unresolved review comments
- squash merge using the milestone's agreed commit message

Contract PRs, shared-file PRs, and final `dev → main` PRs require approval from both other members.

### 9.4 Integration

- M3, M4, and M5 run in parallel after M2.
- M6 integrates the first parallel wave.
- M7, M8, and M9 run in parallel after M6.
- M10 integrates the second parallel wave.
- M11 is the final audit and release PR.

See [milestones.md](milestones.md) for exact ownership and dependencies.

---

## 10. Running

```bash
python3 -m http.server 8000
```

- App: `http://127.0.0.1:8000/`
- Tests: `http://127.0.0.1:8000/tests.html`

There is no install or build command.

---

## 11. Product Acceptance Checklist

### Required Categories

- [ ] Stories, Jobs, and Polls are visible and usable — R13–R16
- [ ] Every category is newest-first — R17
- [ ] Story, Job, and Poll details open without errors — R30
- [ ] Poll options belong to the selected poll — R43–R46

### Loading

- [ ] Initial load resolves one small batch, not every list item — R22–R24
- [ ] Load more appends without duplicate cards or request bursts — R20, R25–R29
- [ ] Cache, dedupe, and six-request concurrency are observable in tests — R7–R12

### Comments

- [ ] Direct comments belong to the selected post — R47–R55
- [ ] Comment siblings are newest-first — R51
- [ ] Nested replies remain under the correct parent — R56–R64
- [ ] Expanding cached replies does not refetch them — R63–R64

### Live Data

- [ ] Checks use both live endpoints every five seconds — R65–R67
- [ ] Known changed items refresh without a full-feed reload — R68–R69
- [ ] Users receive a visible notification — R70–R72
- [ ] Accepted updates merge without duplicates — R73–R75

### Safety and Quality

- [ ] Unsafe API HTML and URLs are removed — R77–R80
- [ ] Loading, empty, error, and retry states are visible — R81
- [ ] Keyboard, focus, responsive, and reduced-motion behavior work — R82–R85
- [ ] Console is clean in Chrome and Firefox — R86
- [ ] Every line of `docs/audit.md` passes

