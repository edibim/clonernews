# ClonerNews — Audit-Ready TDD Task Plan

## Project Goal

Build a responsive Hacker News reader with vanilla HTML, CSS, and JavaScript ES modules.

The application must:

- fetch data from the official Hacker News v0 API
- provide visible Stories, Jobs, and Polls feeds
- open every supported post type without errors
- display poll options
- display comments beneath the correct post
- sort posts and comment siblings from newest to oldest
- support nested replies through lazy loading
- load posts progressively instead of fetching every item at startup
- check for new or changed data every five seconds
- notify the user before merging live updates into the feed
- avoid unnecessary requests through caching, request deduplication, concurrency control, and throttling
- sanitize all HTML received from Hacker News
- remain usable during loading, empty, deleted-item, and network-error states

The mandatory source priority is:

1. `docs/exercise.md`
2. `docs/audit.md`
3. `docs/clonernews-plan.md`
4. `docs/tasks.md`
5. `README.md`

If a lower-priority document conflicts with the exercise or audit, the exercise and audit win.

---

## Technical Constraints

- Vanilla JavaScript only; no frontend framework.
- ES modules with native browser imports.
- No package manager, bundler, or build step.
- No runtime dependency on a CDN-hosted JavaScript library.
- Serve locally with a static HTTP server; do not open `index.html` through `file://`.
- Use the official API base URL:

```text
https://hacker-news.firebaseio.com/v0
```

- Use deterministic fixtures for automated tests. Live API behavior is checked manually.
- Support current Chrome and Firefox.

---

## Architecture Goal

Keep network access, request control, state changes, feature logic, and DOM rendering separate.

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
│   │   ├── endpoints.js
│   │   └── client.js
│   ├── services/
│   │   ├── itemCache.js
│   │   ├── requestQueue.js
│   │   └── requestDeduper.js
│   ├── features/
│   │   ├── feed.js
│   │   ├── polls.js
│   │   ├── comments.js
│   │   └── liveUpdates.js
│   ├── ui/
│   │   ├── shell.js
│   │   ├── feedView.js
│   │   ├── detailView.js
│   │   ├── commentsView.js
│   │   └── liveView.js
│   └── utils/
│       ├── html.js
│       ├── throttle.js
│       └── time.js
└── tests/
    ├── runner.js
    ├── fixtures.js
    ├── mockFetch.js
    ├── api.test.js
    ├── requests.test.js
    ├── feed.test.js
    ├── polls.test.js
    ├── comments.test.js
    ├── liveUpdates.test.js
    ├── html.test.js
    └── throttle.test.js
```

### Package Responsibilities

#### `app.js`

- Starts the application after `DOMContentLoaded`.
- Creates the shell, binds events, loads the initial Stories batch, and starts live checks.
- Stops observers, intervals, and active detail requests when appropriate.
- Contains orchestration only, not endpoint, cache, sanitizer, or sorting algorithms.

#### `config.js`

- Owns API and behavior constants.
- Exports supported categories and known fallback poll IDs.
- Does not hold mutable application state.

#### `state.js`

- Owns the single mutable application state object.
- Provides controlled state helpers and reset helpers for tests.
- Keeps separate feed state for Stories, Jobs, and Polls.

#### `api/`

- Builds official API URLs.
- Performs JSON requests and normalizes HTTP, JSON, abort, and null-response behavior.
- Does not render UI or decide how feeds are paginated.

#### `services/`

- Caches completed item requests.
- Shares in-flight requests for the same resource.
- Limits item fetches to six concurrent network requests.
- Removes failed or aborted requests from pending state.

#### `features/`

- Implements feed paging, poll discovery, comments, and live-update behavior.
- Returns data or feature state; it does not generate application markup.

#### `ui/`

- Creates semantic DOM nodes.
- Renders loading, success, empty, and retry states.
- Uses the sanitizer for Hacker News HTML.
- Delegates data work to feature modules.

#### `utils/`

- Contains pure or narrowly scoped reusable behavior.
- Implements safe HTML, newest-first sorting support, relative time, and throttling.

---

## Core Data Contracts

Use JSDoc typedefs so module contracts remain visible without TypeScript.

```js
/**
 * @typedef {"story" | "job" | "comment" | "poll" | "pollopt"} HnItemType
 *
 * @typedef {Object} HnItem
 * @property {number} id
 * @property {HnItemType=} type
 * @property {boolean=} deleted
 * @property {boolean=} dead
 * @property {string=} by
 * @property {number=} time
 * @property {string=} text
 * @property {number=} parent
 * @property {number=} poll
 * @property {number[]=} kids
 * @property {number[]=} parts
 * @property {string=} url
 * @property {number=} score
 * @property {string=} title
 * @property {number=} descendants
 */
```

```js
/**
 * @typedef {Object} FeedState
 * @property {number[]} ids
 * @property {HnItem[]} items
 * @property {number} cursor
 * @property {boolean} loading
 * @property {boolean} exhausted
 * @property {string|null} error
 * @property {boolean} initialized
 */
```

```js
export const state = {
  activeCategory: "stories",
  feeds: {
    stories: createFeedState(),
    jobs: createFeedState(),
    polls: createFeedState(),
  },
  selectedPostId: null,
  commentsByParent: new Map(),
  live: {
    lastSeenMaxItem: null,
    newestObservedMaxItem: null,
    changedItems: [],
    pendingNewCount: 0,
    checking: false,
    error: null,
  },
};
```

### Fixed Configuration

```js
export const API_BASE_URL = "https://hacker-news.firebaseio.com/v0";
export const POST_BATCH_SIZE = 15;
export const COMMENT_BATCH_SIZE = 20;
export const REPLY_BATCH_SIZE = 10;
export const MAX_CONCURRENT_REQUESTS = 6;
export const LIVE_INTERVAL_MS = 5000;
export const POLL_SCAN_BUDGET = 60;
export const POLL_TARGET_COUNT = 6;
export const LIVE_NEW_ITEM_FETCH_CAP = 20;
export const KNOWN_POLL_IDS = [160704, 126809];
```

The known poll IDs are only a fallback. Their item data must still be fetched from the official API.

---

## Main Data Flow

```text
DOMContentLoaded
→ render application shell
→ initialize max item snapshot
→ request Stories id list
→ slice the next 15 ids
→ fetch through dedupe + cache + six-request queue
→ remove unusable records
→ sort resolved items by time descending
→ render cards
→ start five-second live checks
```

```text
open post
→ fetch selected item from cache/API
→ render type-specific detail
→ fetch poll parts when type is poll
→ fetch the first direct-comment batch from kids
→ validate parent/root relationship
→ sort comment siblings by time descending
→ render comments
→ fetch replies only when their parent is expanded
```

```text
five-second tick
→ fetch /updates.json and /maxitem.json
→ intersect changed ids with ids known by this application
→ force-refresh only relevant changed items
→ calculate available new-id count without fetching every id
→ show live banner
→ fetch at most 20 new candidates only after user accepts
→ merge supported top-level items without duplicates
→ sort newest first
```

---

## Phase Overview

| Phase | Goal |
|---|---|
| 1 | Create the static application and test skeleton |
| 2 | Define configuration, state, and API contracts |
| 3 | Build endpoint and JSON client behavior |
| 4 | Add cache, in-flight deduplication, and request queue |
| 5 | Add shared sorting, time, HTML, and throttle utilities |
| 6 | Build the application shell and state-driven navigation |
| 7 | Load Stories and Jobs progressively |
| 8 | Render post cards and type-specific detail views |
| 9 | Discover and render Polls safely |
| 10 | Load direct comments under the correct post |
| 11 | Add lazy nested replies |
| 12 | Add five-second live data and user notifications |
| 13 | Add automatic loading and event protections |
| 14 | Complete responsive styling, accessibility, and resilience |
| 15 | Run integration tests, audit, cleanup, and documentation |

---

# Phase 1: Static Application and Test Skeleton

## Goal

Create a runnable static site and a dependency-free browser test runner.

## Work Location

- `index.html`
- `tests.html`
- `css/styles.css`
- `js/app.js`
- `tests/runner.js`
- `tests/fixtures.js`
- `tests/mockFetch.js`

## Tests First

- [ ] The test runner discovers registered tests.
- [ ] The runner reports passing and failing assertions separately.
- [ ] One failing test does not prevent later tests from running.
- [ ] Async tests are awaited.
- [ ] Mock fetch records URL and option data.
- [ ] Mock fetch can return JSON, null, an HTTP error, and a rejected request.

## Implementation Tasks

- [ ] Add semantic page landmarks: header, category navigation, live region, feed, sentinel, and detail dialog.
- [ ] Load `js/app.js` with `type="module"`.
- [ ] Add `tests.html` that loads the test runner and all test modules.
- [ ] Add deterministic fixtures for story, job, poll, poll option, direct comment, nested reply, deleted item, dead item, and null API response.
- [ ] Add basic CSS tokens and a readable no-JavaScript message.
- [ ] Confirm both pages load through `python3 -m http.server 8000`.

## Audit Note

Do not make live API requests from the automated test page.

## Commit

```text
chore: initialize static clonernews app and test runner
```

---

# Phase 2: Configuration, State, and Contracts

## Goal

Give all modules one agreed vocabulary before network and UI logic are added.

## Work Location

- `js/config.js`
- `js/state.js`

## Public Interfaces

```js
// config.js
export const API_BASE_URL;
export const POST_BATCH_SIZE;
export const COMMENT_BATCH_SIZE;
export const REPLY_BATCH_SIZE;
export const MAX_CONCURRENT_REQUESTS;
export const LIVE_INTERVAL_MS;
export const POLL_SCAN_BUDGET;
export const POLL_TARGET_COUNT;
export const LIVE_NEW_ITEM_FETCH_CAP;
export const KNOWN_POLL_IDS;
export const CATEGORIES;

// state.js
export const state;
export function createFeedState();
export function resetState();
export function getActiveFeed();
export function getKnownItemIds();
```

## Tests First

- [ ] Default category is `stories`.
- [ ] Every category receives independent feed arrays and loading flags.
- [ ] Reset creates fresh Maps and arrays rather than reusing mutated values.
- [ ] Known item IDs include feed items, selected post, loaded comments, and poll options without duplicates.
- [ ] Fixed configuration matches the values documented above.

## Implementation Tasks

- [ ] Add JSDoc types for API items, feed state, comment state, and live state.
- [ ] Freeze configuration collections that must not be mutated.
- [ ] Keep API data out of DOM elements and DOM nodes out of state.
- [ ] Provide explicit state reset behavior for deterministic tests.

## Commit

```text
feat: define clonernews configuration and state contracts
```

---

# Phase 3: API Endpoints and JSON Client

## Goal

Build the only layer allowed to call `fetch` directly.

## Work Location

- `js/api/endpoints.js`
- `js/api/client.js`
- `tests/api.test.js`

## Public Interfaces

```js
// endpoints.js
export function getItemUrl(id);
export function getFeedUrl(category);
export function getMaxItemUrl();
export function getUpdatesUrl();

// client.js
export async function fetchJson(url, { signal } = {});
export async function requestItem(id, { signal } = {});
export async function requestFeedIds(category, { signal } = {});
export async function requestMaxItem({ signal } = {});
export async function requestUpdates({ signal } = {});
```

## Rules

- `stories` maps to `/newstories.json`.
- `jobs` maps to `/jobstories.json`.
- Polls do not map to a list endpoint.
- Every URL ends in `.json`.
- IDs must be positive safe integers.
- A successful item response containing `null` returns `null`.
- A non-2xx response throws an error with an audit-safe message.
- Abort errors remain distinguishable from network and HTTP errors.
- Unknown fields are preserved and ignored by consumers.

## Tests First

- [ ] Item URL is correct for a valid ID.
- [ ] Stories and Jobs use the correct list endpoints.
- [ ] Requesting a Polls list throws a clear unsupported-feed error.
- [ ] Max item and updates URLs are correct.
- [ ] Invalid item IDs fail before calling fetch.
- [ ] JSON success, null, HTTP error, malformed JSON, network rejection, and abort are handled.

## Commit

```text
feat: add hacker news api client
```

---

# Phase 4: Cache, Deduplication, and Request Queue

## Goal

Ensure repeated UI actions do not produce duplicate or uncontrolled item requests.

## Work Location

- `js/services/itemCache.js`
- `js/services/requestDeduper.js`
- `js/services/requestQueue.js`
- `tests/requests.test.js`

## Public Interfaces

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

// client.js addition
export async function fetchItem(
  id,
  { forceRefresh = false, signal } = {},
);
export async function fetchItems(ids, options = {});
```

## Rules

- Return cached item data unless `forceRefresh` is true.
- Concurrent requests for the same item share one Promise.
- Do not permanently cache rejected requests.
- Null item responses may be cached for the session.
- Never run more than six queued item requests simultaneously.
- Preserve input order in `fetchItems`, even when requests finish out of order.
- One aborted consumer must not corrupt cache or queue bookkeeping.

## Tests First

- [ ] Cached items avoid a second network call.
- [ ] Two simultaneous requests for one ID share one network call.
- [ ] Force refresh bypasses the completed cache.
- [ ] A failed pending request is removed and can be retried.
- [ ] Six requests run concurrently; the seventh waits.
- [ ] Queue counters return to zero after success, error, and abort.
- [ ] Duplicate IDs passed to `fetchItems` are requested once.

## Audit Note

The cache and queue are required even though the official API currently publishes no rate limit.

## Commit

```text
feat: control hacker news item requests
```

---

# Phase 5: Shared Utilities

## Goal

Implement deterministic behavior used by multiple features.

## Work Location

- `js/utils/html.js`
- `js/utils/throttle.js`
- `js/utils/time.js`
- corresponding test files

## Public Interfaces

```js
export function sortNewestFirst(items);
export function formatRelativeTime(unixSeconds, nowSeconds);
export function sanitizeHTML(value);
export function setSanitizedHTML(element, value);
export function throttle(fn, waitMs);
```

## HTML Allowlist

Allow:

```text
a p br pre code em i strong b blockquote ul ol li
```

Rules:

- Remove `script`, `style`, `iframe`, `object`, and their contents.
- Unwrap other unapproved elements while retaining safe text content.
- Remove every attribute except `href` on `<a>`.
- Permit only `http:`, `https:`, and `mailto:` links.
- Add `target="_blank"` and `rel="noopener noreferrer nofollow"` to external links.
- Treat missing HTML as an empty string.
- Never assign raw API HTML directly to `innerHTML`.

## Tests First

- [ ] Newest-first sorting uses numeric `time`.
- [ ] Missing times sort last and equal times remain stable.
- [ ] Input arrays are not mutated.
- [ ] Relative time covers seconds, minutes, hours, days, and invalid input.
- [ ] Allowed formatting survives sanitization.
- [ ] Scripts, event attributes, iframes, and `javascript:` links are removed.
- [ ] Plain text remains unchanged.
- [ ] Throttle invokes immediately, blocks calls inside the window, and uses the latest trailing arguments.
- [ ] Throttled functions preserve `this`.

## Commit

```text
feat: add safe shared rendering utilities
```

---

# Phase 6: Application Shell and Navigation

## Goal

Create a state-driven interface with the three required categories.

## Work Location

- `js/app.js`
- `js/ui/shell.js`
- `index.html`
- `css/styles.css`

## Public Interfaces

```js
export function renderShell(root);
export function setActiveCategory(category);
export function renderActiveFeedState();
export function showStatus(message, kind);
```

## Rules

- Stories, Jobs, and Polls are always visible as tabs.
- Tabs use correct `role`, `aria-selected`, and keyboard behavior.
- Changing tabs preserves already loaded feed state.
- A tab initializes its feed only on first activation.
- The feed exposes a polite status region for loading and update announcements.
- The detail view uses a native `<dialog>` with an explicit close control.

## Tests First

- [ ] Shell renders all required landmarks and tabs.
- [ ] Stories begins selected.
- [ ] Tab changes update state and accessibility attributes.
- [ ] Returning to a loaded tab does not refetch its first page.
- [ ] Escape and the close button close the detail dialog.

## Commit

```text
feat: add clonernews shell and category navigation
```

---

# Phase 7: Progressive Stories and Jobs Feeds

## Goal

Fetch only the item records needed for the visible batch.

## Work Location

- `js/features/feed.js`
- `js/ui/feedView.js`
- `tests/feed.test.js`

## Public Interfaces

```js
export async function initializeFeed(category, { signal } = {});
export async function loadNextPage(category, { signal } = {});
export function mergeFeedItems(category, incomingItems);
export function isVisibleTopLevelItem(item, category);
```

## Rules

- Fetch each category's ID list once per session.
- Slice IDs before fetching item records.
- Batch size is exactly 15.
- Filter null, dead, deleted, unsupported, and category-mismatched items.
- Continue through further IDs until 15 visible items are collected or the ID list is exhausted.
- Enforce an upper bound of 45 inspected IDs per user-triggered batch so a damaged API response cannot loop indefinitely.
- Sort all currently loaded visible items by `time` descending.
- Never duplicate an item already in that feed.
- Disable Load more during an active request.
- Preserve existing cards if a later batch fails.

## Tests First

- [ ] Initial load requests one list and only enough item IDs for one batch.
- [ ] Second load begins at the saved cursor.
- [ ] Results are newest-first regardless of source order.
- [ ] Null, dead, deleted, and wrong-type records are excluded.
- [ ] Duplicate IDs do not create duplicate cards.
- [ ] Concurrent Load more calls result in one batch.
- [ ] Failed loading exposes retry and does not advance the cursor past unprocessed IDs.
- [ ] Exhausted feeds disable Load more.

## Audit Note

Receiving up to 500 IDs is permitted; fetching all 500 item records at startup is not.

## Commit

```text
feat: load stories and jobs progressively
```

---

# Phase 8: Cards and Post Detail

## Goal

Render every required top-level item type without assuming optional fields exist.

## Work Location

- `js/ui/feedView.js`
- `js/ui/detailView.js`
- `tests/feed.test.js`

## Display Rules

Story cards show:

- title
- author when present
- score when present
- comment count when present
- relative time
- source hostname when a valid URL exists

Job cards show:

- title
- author and time when present
- safe text preview
- outbound URL when present

Poll cards show:

- title
- author, score, comment count, and time when present
- safe body text
- number of available options

## Public Interfaces

```js
export function renderFeedItems(container, items);
export function createPostCard(item);
export async function openPostDetail(itemId);
export function closePostDetail();
export function renderPostDetail(item);
```

## Rules

- Use fallbacks such as `Untitled item`, `unknown user`, and `0 comments`.
- Missing URLs open the internal detail rather than a blank external page.
- External links use safe protocols and `rel="noopener noreferrer"`.
- Card controls must distinguish opening the detail from opening the external URL.
- Opening a new post aborts pending detail/comment rendering for the previous selection.
- Ignore stale async results if the selected post changed while requests were running.

## Tests First

- [ ] Story, job, and poll fixtures produce their required metadata.
- [ ] Missing optional fields do not throw.
- [ ] Unsafe titles and text are sanitized.
- [ ] Invalid external URLs are not rendered as clickable links.
- [ ] Deleted/null selected items show a stable unavailable state.
- [ ] Stale detail responses cannot replace the currently selected post.

## Commit

```text
feat: render hacker news cards and post details
```

---

# Phase 9: Poll Discovery and Poll Options

## Goal

Guarantee an auditable Polls feed without an unbounded API scan.

## Work Location

- `js/features/polls.js`
- `js/ui/detailView.js`
- `tests/polls.test.js`

## Public Interfaces

```js
export async function discoverPolls({ signal } = {});
export async function loadPollOptions(poll, { signal } = {});
export function validatePollOption(option, pollId);
```

## Discovery Rules

- Start discovery only when the Polls tab is opened.
- Read `/maxitem.json` once.
- Walk backward through at most 60 item IDs.
- Use the shared six-request queue.
- Retain only non-dead, non-deleted items with `type === "poll"`.
- Stop early after finding six polls.
- Add fallback IDs `160704` and `126809` when they are not already present.
- Fetch fallback records from the API and validate that they are polls.
- Deduplicate and sort the resulting polls newest-first.
- Cache the completed Polls feed for the session.

## Poll Option Rules

- Fetch option IDs only from the poll's `parts`.
- Retain only options with `type === "pollopt"` and `poll === selectedPoll.id`.
- Preserve the API's `parts` order; do not sort poll options by time.
- Show option text and score.
- A missing or invalid option produces a small unavailable placeholder rather than breaking the poll.

## Tests First

- [ ] Discovery never inspects more than 60 recent IDs.
- [ ] Discovery stops at six valid polls.
- [ ] Fallback IDs are added without duplicates.
- [ ] Invalid fallback data is ignored safely.
- [ ] Poll results are newest-first.
- [ ] Options are fetched from `parts` only.
- [ ] An option with the wrong `poll` parent is rejected.
- [ ] Options preserve `parts` order.

## Audit Note

There is no official `/pollstories.json` endpoint. Do not invent one and do not scan without a fixed request budget.

## Commit

```text
feat: add bounded poll discovery and poll options
```

---

# Phase 10: Direct Comments Under the Correct Post

## Goal

Load direct comments from the selected post and prove their parent relationship.

## Work Location

- `js/features/comments.js`
- `js/ui/commentsView.js`
- `tests/comments.test.js`

## Comment State

```js
{
  parentId,
  rootPostId,
  ids,
  items,
  cursor,
  loading,
  exhausted,
  error,
  expanded,
}
```

## Public Interfaces

```js
export async function initializeComments(post, { signal } = {});
export async function loadMoreComments(parentId, rootPostId, options = {});
export function validateCommentParent(comment, parentId);
export function getCommentState(parentId);
```

## Rules

- Direct comment IDs come only from the selected post's `kids`.
- Accept a direct comment only when `comment.parent === selectedPost.id`.
- Attach `rootPostId` in local comment state; do not mutate API records.
- Load direct comments in batches of 20.
- Sort each resolved sibling batch and the merged sibling list newest-first.
- Preserve deleted comment placeholders when they have replies; otherwise omit unusable comments.
- A deleted placeholder may show `[deleted]` but must not invent an author.
- Changing selected posts aborts the previous post's comment request.
- Retry only the failed comment batch.

## Tests First

- [ ] Only IDs from the selected post's `kids` are requested.
- [ ] Comments with a wrong parent are rejected.
- [ ] Comments from two selected posts never share rendered state.
- [ ] Direct siblings are newest-first.
- [ ] Initial loading requests at most 20 direct-comment IDs.
- [ ] Deleted comments with children retain a placeholder.
- [ ] A failed batch can be retried without duplicates.
- [ ] Stale results cannot render beneath a newly selected post.

## Commit

```text
feat: attach direct comments to their posts
```

---

# Phase 11: Lazy Nested Replies

## Goal

Implement the nested-comments bonus without recursively loading the full comment tree.

## Work Location

- `js/features/comments.js`
- `js/ui/commentsView.js`
- `tests/comments.test.js`

## Public Interfaces

```js
export async function toggleReplies(commentId, rootPostId, options = {});
export async function loadMoreReplies(commentId, rootPostId, options = {});
export function isInCommentRoot(parentId, rootPostId);
```

## Rules

- Fetch replies only after the user expands a comment.
- Reply IDs come only from that comment's `kids`.
- Accept a reply only when `reply.parent === parentComment.id`.
- Inherit the selected `rootPostId` through local state.
- Load replies in batches of 10.
- Sort siblings newest-first at every nesting level.
- Allow arbitrary logical depth; cap visual indentation after five levels.
- Collapsing hides loaded descendants but keeps them cached.
- Re-expanding does not refetch cached replies.
- A nested request completing after the root detail closes must not render.

## Tests First

- [ ] Collapsed comments do not fetch replies.
- [ ] Expanding requests only the selected comment's kids.
- [ ] Wrong-parent replies are rejected.
- [ ] Root post identity survives multiple nesting levels.
- [ ] Reply siblings are newest-first.
- [ ] Only ten replies load per nested batch.
- [ ] Collapse and re-expand reuse cached results.
- [ ] Deep nesting does not overflow through eager recursion.

## Commit

```text
feat: add lazy nested comment threads
```

---

# Phase 12: Five-Second Live Data

## Goal

Notify users about relevant new and changed information without refreshing entire feeds.

## Work Location

- `js/features/liveUpdates.js`
- `js/ui/liveView.js`
- `tests/liveUpdates.test.js`

## Public Interfaces

```js
export async function initializeLiveSnapshot({ signal } = {});
export function startLiveUpdates(onUpdate);
export function stopLiveUpdates();
export async function checkLiveUpdates({ signal } = {});
export async function acceptLiveUpdates(category, { signal } = {});
```

## Polling Rules

- Initialize `lastSeenMaxItem` once during startup.
- Run checks every 5,000 ms while the page is visible.
- Each check fetches `/updates.json` and `/maxitem.json`.
- Do not overlap checks; skip a tick when the prior check is still running.
- Intersect `updates.items` with IDs already known by this application.
- Force-refresh relevant changed items, capped at ten per tick.
- Compare max item values to calculate a pending-new count.
- Do not fetch the entire new ID range in the background.
- Poll failure leaves existing content untouched and retries next tick.
- Pause interval work when the document becomes hidden; run one throttled check when visible again.

## Acceptance Rules

- Show a visible banner when changed known items or new IDs exist.
- Announce the update count through an `aria-live="polite"` region.
- Do not shift the feed automatically.
- When accepted, inspect at most the newest 20 IDs between the two max snapshots.
- Retain supported non-dead top-level items relevant to Stories, Jobs, or Polls.
- Merge without duplicates and sort newest-first.
- Update `lastSeenMaxItem` only after successful acceptance.
- Keep changed-item previews in a dedicated live section until dismissed or merged.

## Tests First

- [ ] Interval is exactly 5,000 ms.
- [ ] Start does not create duplicate intervals.
- [ ] Stop clears the interval.
- [ ] Overlapping ticks are prevented.
- [ ] Changed IDs are intersected with known IDs.
- [ ] Force refresh is used for changed known items.
- [ ] Max-item growth updates the banner without fetching the whole range.
- [ ] Acceptance inspects no more than 20 new candidates.
- [ ] Merge removes duplicates and sorts newest-first.
- [ ] Failures preserve current feed and allow the next scheduled retry.

## Audit Note

The live section must be visible in the UI. A silent `setInterval` is not sufficient.

## Commit

```text
feat: add throttled live data notifications
```

---

# Phase 13: Automatic Loading and Event Protection

## Goal

Combine a reliable Load more button with optional automatic loading near the feed end.

## Work Location

- `js/app.js`
- `js/ui/feedView.js`
- `js/utils/throttle.js`
- `tests/throttle.test.js`

## Rules

- Keep the visible Load more button as the primary auditable control.
- Observe a sentinel below the feed with `IntersectionObserver`.
- Pass observer triggers through a throttled load function.
- Do not load automatically when the tab is hidden.
- Do not load when the feed is loading, exhausted, or in an unresolved error state.
- Disconnect the observer when its feed is exhausted.
- Rapid button clicks and observer events must share the same loading guard.

## Tests First

- [ ] Multiple rapid triggers start one batch.
- [ ] Observer does nothing while loading.
- [ ] Observer does nothing after exhaustion.
- [ ] Button remains usable if `IntersectionObserver` is unavailable.
- [ ] A failed automatic load exposes the same retry state as a button load.

## Commit

```text
feat: add guarded automatic feed loading
```

---

# Phase 14: Styling, Accessibility, and Resilience

## Goal

Finish the modern editorial design and make every state understandable and keyboard accessible.

## Work Location

- `css/styles.css`
- UI modules
- `index.html`

## Visual Direction

- Warm neutral background with restrained accent color.
- Strong editorial typography and generous reading width.
- Compact metadata, clear item-type labels, and calm card separation.
- Sticky category navigation where space permits.
- Detail dialog optimized for long articles and comment threads.
- Nested comments use borders and spacing; visual indentation stops increasing after level five.
- Responsive behavior for desktop, tablet, and narrow mobile screens.
- Respect `prefers-reduced-motion`.

## Required UI States

- initial loading
- incremental loading
- empty feed
- API error with retry
- unavailable/deleted post
- comments loading and comments error
- no comments
- poll options unavailable
- live updates available
- offline or repeated live-check failure

## Accessibility Checklist

- [ ] One logical page heading.
- [ ] Semantic navigation, lists, articles, buttons, time elements, and dialog.
- [ ] Complete keyboard operation.
- [ ] Visible focus indicators.
- [ ] Dialog focus enters on open and returns to the opening control on close.
- [ ] Icon-only controls have accessible names.
- [ ] Loading and live updates use polite announcements.
- [ ] Error text is not communicated by color alone.
- [ ] Text and controls meet usable contrast.
- [ ] External links are identified.

## Resilience Checklist

- [ ] Missing title, author, score, time, URL, text, kids, parts, and descendants never throw.
- [ ] Network errors preserve previously loaded data.
- [ ] Every failed user action has a retry path.
- [ ] No raw API value is inserted as unsanitized HTML.
- [ ] Console remains clean during normal, empty, retry, and abort flows.

## Commit

```text
feat: complete responsive and accessible interface
```

---

# Phase 15: Integration, Audit, Cleanup, and README

## Goal

Verify the complete application against the exercise and every audit action.

## Work Location

- `tests/`
- `README.md`
- `docs/`
- all application modules for audit fixes only

## Automated Integration Scenarios

- [ ] Fresh startup renders the first Stories batch.
- [ ] Opening and switching feeds does not duplicate list or item requests.
- [ ] A story opens with its correct direct and nested comments.
- [ ] A job with missing optional fields opens safely.
- [ ] A fallback poll opens with validated poll options.
- [ ] Load more appends posts and maintains newest-first order.
- [ ] A comment response from a previously selected post is ignored.
- [ ] Five-second updates refresh known changed posts.
- [ ] Accepting new live items merges them without duplicates.
- [ ] Sanitization prevents script execution and unsafe links.
- [ ] Offline and failed-batch retries preserve existing state.

## Manual Audit Checklist

### Required Post Types

- [ ] Open a story without errors.
- [ ] Open a job without errors.
- [ ] Open a poll without errors.
- [ ] Confirm poll options are visible.

### Progressive Loading

- [ ] Inspect the initial network log and confirm item records are loaded in a small batch.
- [ ] Trigger Load more repeatedly and confirm one batch per action.
- [ ] Confirm no duplicate cards and no burst of overlapping requests.
- [ ] Confirm the button works when automatic observation is disabled.

### Comments

- [ ] Open posts with comments and verify newest-to-oldest sibling order.
- [ ] Open two posts in succession and confirm comments never mix.
- [ ] Expand multiple reply levels and verify every reply remains under its parent.
- [ ] Confirm cached replies do not refetch on re-expansion.

### Live Data

- [ ] Keep the page visible for at least 15 seconds.
- [ ] Confirm no more than one live check occurs per five-second interval.
- [ ] Confirm `/updates.json` and `/maxitem.json` are used.
- [ ] Confirm the user sees a visible notification when relevant data changes.
- [ ] Confirm the feed does not jump before the update is accepted.

### General

- [ ] Stories, Jobs, and Polls are always reachable.
- [ ] Posts are newest-first by `time`.
- [ ] Loading, empty, deleted, offline, and retry states are readable.
- [ ] Keyboard navigation works through tabs, cards, dialog, comments, and Load more.
- [ ] Test in current Chrome and Firefox.
- [ ] Confirm a clean console.

## README Sections

```text
# ClonerNews
## Description
## Features
## Architecture
## Hacker News API Endpoints
## Poll Discovery Decision
## Live Update Behavior
## Running Locally
## Running Tests
## Audit Notes
## Known Limitations
```

## Documentation Cleanup

- [ ] Keep `docs/exercise.md` and `docs/audit.md` unchanged.
- [ ] Ensure other unrelated legacy project documents are clearly marked obsolete or removed only with explicit project-owner approval.
- [ ] Keep `docs/clonernews-plan.md` as the architecture decision summary.
- [ ] Keep this file as the implementation checklist.

## Commit

```text
test: complete clonernews audit and documentation
```

---

# TDD Workflow Per Phase

For every phase:

1. Read the applicable exercise and audit lines.
2. Add the smallest deterministic failing test.
3. Run the browser test page and confirm the intended failure.
4. Implement only enough behavior to satisfy the phase contract.
5. Run all tests, not only the new module.
6. Inspect browser console and relevant network requests.
7. Complete the phase's manual checks.
8. Commit only coherent, passing work.

Do not use the live Hacker News API as automated test data. Live data changes independently and makes failures nondeterministic.

---

# Suggested Commit Sequence

```text
chore: initialize static clonernews app and test runner
feat: define clonernews configuration and state contracts
feat: add hacker news api client
feat: control hacker news item requests
feat: add safe shared rendering utilities
feat: add clonernews shell and category navigation
feat: load stories and jobs progressively
feat: render hacker news cards and post details
feat: add bounded poll discovery and poll options
feat: attach direct comments to their posts
feat: add lazy nested comment threads
feat: add throttled live data notifications
feat: add guarded automatic feed loading
feat: complete responsive and accessible interface
test: complete clonernews audit and documentation
```

---

# Session Log Template

```md
## Session: YYYY-MM-DD

### Goal

- 

### Tests Added First

- 

### Completed

- 

### API and Request Notes

- Endpoints:
- Request counts:
- Cache/deduplication:

### Manual Checks

- 

### Issues

- 

### Next

- 
```

---

# Quick Commands

```bash
# Run app and tests
python3 -m http.server 8000

# Application
http://localhost:8000/

# Browser test runner
http://localhost:8000/tests.html
```

There is intentionally no install, build, or dependency-download command.

---

# Implementation Order Warning

Build phases in order through Phase 7 because later behavior depends on the shared contracts, client, and request controls.

After Phase 7:

- Phase 8 must land before comments or poll detail rendering.
- Phase 9 and Phase 10 may be developed independently after Phase 8.
- Phase 11 depends on Phase 10.
- Phase 12 depends on feed merge behavior from Phase 7.
- Phase 13 depends on the loading guards from Phase 7.
- Phase 14 follows functional integration.
- Phase 15 is the final audit gate.

Do not begin live polling before cache bypass, request deduplication, and the loading guards are tested. A five-second timer amplifies request-control bugs quickly.
