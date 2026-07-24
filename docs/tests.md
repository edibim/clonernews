# Tests — ClonerNews

This document defines the automated test cases for [PRD.md](PRD.md) and [tasks.md](tasks.md).

Requirement IDs refer to PRD §4.

---

## Test Strategy

- Use the dependency-free browser runner loaded by `tests.html`.
- Test modules register synchronous or asynchronous test functions.
- Run tests through a local HTTP server, never through `file://`.
- Use deterministic fixtures and mocked `fetch` responses.
- Automated tests must never call the live Hacker News API.
- Run the complete suite after every milestone.
- Use manual browser checks for appearance, focus behavior, responsive layout, real network counts, and the official audit.

---

## Test Files

```text
tests/
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

---

## Required Fixtures

Fixtures represent the API records without changing their official field names.

### Story

```js
export const storyItem = {
  id: 100,
  type: "story",
  by: "alice",
  time: 1_700_000_000,
  title: "Example story",
  url: "https://example.com/article",
  score: 42,
  descendants: 2,
  kids: [201, 202],
};
```

### Job

```js
export const jobItem = {
  id: 101,
  type: "job",
  by: "company",
  time: 1_700_000_100,
  title: "Frontend Engineer",
  text: "Build useful interfaces.",
};
```

Add a second job fixture with optional fields omitted.

### Poll and Options

```js
export const pollItem = {
  id: 102,
  type: "poll",
  by: "bob",
  time: 1_700_000_200,
  title: "Which option?",
  parts: [301, 302],
  kids: [203],
  descendants: 1,
};

export const pollOptionA = {
  id: 301,
  type: "pollopt",
  poll: 102,
  score: 10,
  text: "Option A",
};

export const pollOptionB = {
  id: 302,
  type: "pollopt",
  poll: 102,
  score: 5,
  text: "Option B",
};
```

Add an invalid option whose `poll` points to a different ID.

### Direct and Nested Comments

```js
export const directComment = {
  id: 201,
  type: "comment",
  by: "carol",
  time: 1_700_000_300,
  parent: 100,
  text: "Direct comment",
  kids: [211],
};

export const nestedReply = {
  id: 211,
  type: "comment",
  by: "dave",
  time: 1_700_000_400,
  parent: 201,
  text: "Nested reply",
};
```

Add:

- direct comments with older, newer, and equal timestamps
- a comment with the wrong post parent
- a reply with the wrong comment parent
- a deleted comment with children
- a dead comment
- a comment containing allowed and unsafe HTML

### Failure Fixtures

Provide reusable responses for:

- `null`
- HTTP 404
- HTTP 500
- malformed JSON
- rejected network request
- aborted request
- unknown additional fields
- unsafe title and text markup
- invalid external URL

Never edit a fixture merely to make a test pass. Add a distinct fixture when a new behavior needs different input.

---

## Test Runner

Required behavior:

- [ ] Discovers registered test cases.
- [ ] Reports passing and failing cases separately.
- [ ] One failed case does not stop later cases.
- [ ] Awaits Promise-returning tests.
- [ ] Shows the final passed, failed, and total counts.
- [ ] Escapes test names and failure messages before rendering them.

---

## Mock Fetch

Required behavior:

- [ ] Registers one or more responses by exact URL.
- [ ] Records URL and request options for every call.
- [ ] Supports JSON values, `null`, HTTP errors, rejection, delay, and abort.
- [ ] Exposes request counts by URL.
- [ ] Can be reset between tests.
- [ ] Throws a clear test error for an unexpected URL.

---

## API Tests

File: `tests/api.test.js`

### Endpoint Builders

- [ ] `getItemUrl(8863)` returns the official item URL — R1, R4.
- [ ] Stories map to `/newstories.json` — R2.
- [ ] Jobs map to `/jobstories.json` — R3.
- [ ] Polls do not invent a list endpoint.
- [ ] Max item maps to `/maxitem.json` — R39, R65.
- [ ] Updates map to `/updates.json` — R66.
- [ ] Zero, negative, fractional, string, `NaN`, and unsafe integer item IDs fail before fetch.

### JSON Client

- [ ] Successful JSON is returned unchanged.
- [ ] Successful `null` item response returns `null` — R5.
- [ ] Unknown fields remain available without breaking consumers — R6.
- [ ] Non-2xx responses throw a clear HTTP error.
- [ ] Malformed JSON throws a clear response error.
- [ ] Network rejection remains retryable.
- [ ] Abort remains distinguishable from other failures.

---

## Request-Control Tests

File: `tests/requests.test.js`

### Cache

- [ ] The first item request calls fetch and stores the result — R7.
- [ ] The second request for the same ID uses cache — R7.
- [ ] Cached `null` avoids repeated requests during the session.
- [ ] `forceRefresh: true` bypasses completed cache data — R11.
- [ ] Clearing cache makes the next request call fetch again.

### In-Flight Deduplication

- [ ] Two simultaneous requests for one item share one network request — R8.
- [ ] Both callers receive the same successful result.
- [ ] A rejected request is removed from pending state — R9.
- [ ] Retrying after rejection starts a new request.
- [ ] Aborted work leaves no stuck pending entry — R9.

### Request Queue

- [ ] The first six item requests may run concurrently — R10.
- [ ] A seventh request waits until one active request settles — R10.
- [ ] Queue statistics return to zero after success.
- [ ] Queue statistics return to zero after failure and abort.
- [ ] `fetchItems` preserves requested order even when responses finish out of order.
- [ ] Duplicate IDs passed to `fetchItems` are resolved once.

---

## Feed Tests

File: `tests/feed.test.js`

### Categories

- [ ] Stories accept visible `story` items — R13, R14.
- [ ] Jobs accept visible `job` items — R13, R15.
- [ ] Polls accept visible `poll` items — R13, R16.
- [ ] Category-mismatched items are rejected — R19.
- [ ] Null, dead, deleted, and unsupported items are excluded safely — R19.

### Ordering

- [ ] Mixed items sort by numeric `time`, newest-first — R17.
- [ ] Equal timestamps keep their source order — R18.
- [ ] Missing timestamps sort last.
- [ ] Source arrays are not mutated.

### Progressive Loading

- [ ] Initialization requests one ID-list endpoint — R2, R3.
- [ ] One feed batch returns at most 15 visible posts — R22.
- [ ] IDs are sliced or budgeted before item resolution — R23.
- [ ] One batch inspects no more than 45 candidates — R24.
- [ ] A second batch resumes from the saved cursor.
- [ ] Duplicate IDs do not create duplicate posts — R20.
- [ ] Repeated simultaneous loading triggers start one batch — R12, R27.
- [ ] Failure preserves existing posts and exposes retry state — R28.
- [ ] Retry does not skip unprocessed IDs.
- [ ] Exhaustion disables further loading — R29.
- [ ] Returning to an initialized category reuses its loaded state — R21.

### Card Data

- [ ] Story card data includes available title, author, score, comments, time, and safe hostname — R31.
- [ ] Job card data tolerates omitted optional fields — R32, R34.
- [ ] Poll card data includes available title, metadata, body, and option count — R33.
- [ ] Invalid or unsafe external URLs are not exposed as links — R35.

---

## Poll Tests

File: `tests/polls.test.js`

### Discovery

- [ ] Discovery does not begin before the Polls feed is opened — R38.
- [ ] Discovery starts from the current max item — R39.
- [ ] No more than 60 recent IDs are inspected — R39.
- [ ] Discovery stops after six valid polls — R40.
- [ ] Fallback IDs are added when needed — R41.
- [ ] Fallback records are fetched from the API.
- [ ] A fallback record with the wrong type is ignored — R42.
- [ ] Recent and fallback polls are deduplicated.
- [ ] Final Polls feed is newest-first — R17.

### Options

- [ ] Only IDs from the selected poll's `parts` are requested — R43.
- [ ] `pollopt` with the correct poll parent is accepted — R44.
- [ ] Wrong type or wrong parent is rejected — R44.
- [ ] Options preserve `parts` order — R45.
- [ ] Missing or invalid option data produces an unavailable result — R46.

---

## Comment Tests

File: `tests/comments.test.js`

### Direct Comments

- [ ] Only selected-post `kids` IDs are requested — R47.
- [ ] A direct comment must point to the selected post — R48.
- [ ] Local state records the selected `rootPostId` without mutating the comment — R49.
- [ ] No more than 20 direct comments load in one batch — R50.
- [ ] Direct siblings are newest-first — R51.
- [ ] Equal timestamps remain stable.
- [ ] Two selected posts maintain separate comment state — R52.
- [ ] Deleted comments with children keep a placeholder — R53.
- [ ] Failed loading preserves prior comments and can retry — R54.
- [ ] A stale response cannot render under a newer selection — R55.

### Nested Replies

- [ ] Collapsed comments do not fetch replies — R56.
- [ ] Expanding requests only the parent comment's `kids` — R57.
- [ ] A reply must point to the expanded parent comment — R58.
- [ ] A reply inherits the correct root post in local state — R59.
- [ ] No more than 10 replies load in one batch — R60.
- [ ] Reply siblings are newest-first — R61.
- [ ] Arbitrary logical depth does not trigger eager recursion — R62.
- [ ] Collapse preserves loaded reply state — R63.
- [ ] Re-expansion does not refetch loaded replies — R64.
- [ ] Closing or changing the selected post blocks stale nested rendering.

---

## Live-Update Tests

File: `tests/liveUpdates.test.js`

Use controllable fake time supplied by the test runner or an injected scheduler.

### Scheduling

- [ ] Initial snapshot requests max item once — R65.
- [ ] Checks run at exactly 5,000 ms — R66.
- [ ] Each check requests updates and max item — R66.
- [ ] Starting twice creates only one active interval.
- [ ] An active check causes the next tick to be skipped — R67.
- [ ] Stopping clears the interval.
- [ ] Hidden-document state pauses scheduled work — R76.
- [ ] Returning visible triggers one throttled check — R76.

### Changed Items

- [ ] Changed IDs are intersected with application-known IDs — R68.
- [ ] Unknown changed IDs are not refreshed.
- [ ] Known changed IDs use force refresh — R69.
- [ ] No more than ten changed items refresh in one tick — R69.

### New Items and Merge

- [ ] Max growth updates the pending-new count without resolving the range — R70.
- [ ] Background checks do not shift existing feeds — R72.
- [ ] Acceptance inspects no more than 20 new candidate IDs — R73.
- [ ] Unsupported, dead, deleted, and null candidates are excluded.
- [ ] Accepted supported items merge without duplicates — R74.
- [ ] The merged feed is newest-first — R74.
- [ ] Snapshot advances only after successful acceptance.
- [ ] A failed check preserves state and allows the next tick to retry — R75.

---

## HTML and Time Tests

File: `tests/html.test.js`

### Sanitization

- [ ] Plain text remains readable.
- [ ] Allowed paragraphs, lists, emphasis, quotes, links, and code survive — R77, R78.
- [ ] `script`, `style`, `iframe`, and `object` elements and active content are removed — R79.
- [ ] Event attributes such as `onclick` are removed — R79.
- [ ] Attributes other than safe anchor `href` are removed.
- [ ] `javascript:`, `data:`, and malformed links are not clickable — R79.
- [ ] HTTP, HTTPS, and mail links remain allowed.
- [ ] External formatted links receive the required target and relation attributes — R80.
- [ ] Missing and null content produce an empty safe result.
- [ ] Raw API HTML is never passed directly to a rendering sink.

### Relative Time

- [ ] Valid timestamps format seconds, minutes, hours, and days.
- [ ] Exact boundary values use the correct unit.
- [ ] Invalid or missing timestamps return a stable fallback.
- [ ] Tests inject the current time rather than depending on the real clock.

---

## Throttle and Loading-Guard Tests

File: `tests/throttle.test.js`

- [ ] The first throttled call runs immediately.
- [ ] Calls inside the interval do not execute immediately.
- [ ] A trailing call uses the latest arguments.
- [ ] The function preserves its `this` value.
- [ ] Rapid button and observer triggers share one active feed request — R12, R27.
- [ ] Observer does nothing while loading.
- [ ] Observer does nothing after exhaustion.
- [ ] Load more remains usable when `IntersectionObserver` is unavailable — R25.

---

## UI Integration Tests

Use fixture-backed feature stubs and a reset DOM.

- [ ] Shell renders the three required category tabs — R13.
- [ ] Stories starts selected.
- [ ] Category selection updates `aria-selected`.
- [ ] Loading, empty, error, retry, and exhausted states render — R81.
- [ ] Story, Job, and Poll cards open the detail dialog — R30.
- [ ] Missing optional post fields do not break the detail — R32, R34.
- [ ] Explicit close and Escape close the dialog — R37.
- [ ] Direct comments render only for the selected post — R52, R55.
- [ ] Nested controls render beneath the correct comment — R58, R59.
- [ ] Live state renders a visible notification and polite announcement — R71.
- [ ] Accepting live updates calls the feature action without immediate automatic merging — R72.

---

## Manual Browser Checklist

These checks are required before M6, M10, and M11 integration merges.

### Network

- [ ] Initial feed resolves one progressive batch.
- [ ] No more than six item requests are active simultaneously.
- [ ] Reopening cached content does not repeat its item request.
- [ ] Load more creates one controlled batch.
- [ ] Poll discovery stays within its request budget.
- [ ] Live checks occur no more than once per five-second interval.

### Required Audit Actions

- [ ] Open a Story without errors.
- [ ] Open a Job without errors.
- [ ] Open a Poll without errors.
- [ ] Load more without duplicates or request spam.
- [ ] Open comments and confirm newest-first sibling order.
- [ ] Confirm every direct comment belongs to the selected post.
- [ ] Expand nested replies and confirm their parent relationships.
- [ ] Confirm visible live-update notifications.

### Accessibility and Responsive Behavior

- [ ] Complete the main flow with a keyboard.
- [ ] Focus enters the dialog and returns to its opener.
- [ ] Visible focus is never removed.
- [ ] Status and live changes are announced politely.
- [ ] Desktop, tablet, and narrow mobile layouts remain usable.
- [ ] Reduced-motion preference is respected.

### Browsers and Console

- [ ] Current Chrome passes the full flow.
- [ ] Current Firefox passes the full flow.
- [ ] Console stays clean during success, empty, retry, abort, and offline flows — R86.

---

## Definition of Test Complete

- [ ] Every automated case in this document passes.
- [ ] Every applicable PRD requirement has automated or manual coverage.
- [ ] No automated test depends on live Hacker News data.
- [ ] Manual network observations confirm request budgets.
- [ ] Every line of `audit.md` can be answered yes.
- [ ] Chrome and Firefox console output is clean.

