# ClonerNews — Audit-Ready Vanilla JavaScript App

## Summary

Build a static Hacker News reader using HTML, CSS, and JavaScript ES modules. It will support stories, jobs, polls, progressively loaded nested comments, five-second live updates, caching, request deduplication, and a modern editorial interface.

The authoritative requirements are `docs/exercise.md` and `docs/audit.md`. Unrelated legacy project documents will be replaced or clearly marked obsolete.

## Key Changes

- Create three main feeds:
  - Stories from `/newstories.json`.
  - Jobs from `/jobstories.json`.
  - Polls through a bounded scan from `/maxitem.json`, with genuine documented poll IDs as a fallback.
- Resolve item IDs through `/item/<id>.json`, cache results, deduplicate concurrent requests, and limit fetch concurrency.
- Load posts in batches of 15 using both a visible **Load more** button and `IntersectionObserver`.
- Sort every displayed post by its `time`, newest first.
- Open stories, jobs, and polls in a detail view with loading, empty, deleted, and error states.
- Fetch poll options from `parts` and render their text and scores.
- Fetch direct comments from the selected post's `kids`, sorting siblings newest first.
- Support nested comments progressively: replies load when expanded instead of recursively fetching the entire tree.
- Preserve `parent` and `rootPostId` relationships so comments cannot appear beneath the wrong post.
- Sanitize Hacker News HTML using a local allowlist for safe links, paragraphs, lists, emphasis, quotes, and code blocks.
- Poll `/updates.json` and `/maxitem.json` every five seconds:
  - Refresh changed items already known to the app.
  - Inspect a bounded number of new IDs.
  - Present changes in a live-update banner and dedicated preview.
  - Merge them into the active feed only when the user accepts the update.
- Prevent request spam through a five-second polling throttle, action guards, cache reuse, pending-request deduplication, abort handling, and a small concurrency queue.
- Use a responsive modern editorial design with accessible category tabs, semantic buttons, visible focus states, skeletons, status messages, and mobile layouts.

## Interfaces and Data Flow

- Define normalized item types for `story`, `job`, `poll`, `pollopt`, and `comment`, while gracefully ignoring unknown future fields.
- API layer:
  - `fetchItem(id, { forceRefresh, signal })`
  - `fetchItems(ids, options)`
  - `fetchFeedIds(feed)`
  - `fetchMaxItem()`
  - `fetchUpdates()`
- Feed layer:
  - `loadNextPage(category)`
  - `discoverPolls()`
  - `sortNewestFirst(items)`
- Comment layer:
  - `loadTopLevelComments(postId)`
  - `loadReplies(commentId)`
  - Each comment node carries its API `parent` and selected `rootPostId`.
- Live layer:
  - `startLiveUpdates(5000, onUpdate)`
  - `checkLiveUpdates(previousSnapshot)`
  - `mergeAcceptedUpdates(category)`
- Shared request cache stores completed items and in-flight promises separately; live refreshes bypass stale cached values.
- Keep category cursors, loaded IDs, selected post, comment state, and pending live updates in one explicit application state object.

## Test Plan

- Unit-test URL construction, newest-first sorting, throttling, caching, request deduplication, sanitization, and comment-parent validation.
- Mock API responses for stories, jobs, polls, poll options, deleted items, dead items, missing fields, errors, and nested comments.
- Verify:
  - All three required categories render and open safely.
  - Loading more appends one batch without duplicates or request storms.
  - Posts and each comment sibling group are newest-first.
  - Comments and nested replies remain under the correct root post.
  - Poll options render correctly.
  - Live checks run no more frequently than every five seconds.
  - Changed posts produce a visible notification and merge only on user action.
  - Repeated item requests share one in-flight request.
  - Failed batches can be retried without corrupting the feed.
  - Unsafe HTML and unsafe link protocols are removed.
- Manually walk every line of `docs/audit.md` in Chrome and Firefox and confirm a clean console.

## Assumptions and Defaults

- No framework, package manager, or build step; serve locally with `python3 -m http.server`.
- Batch size is 15 posts and 20 top-level comments.
- Nested replies are loaded on expansion.
- API concurrency is capped at six item requests.
- Poll discovery scans a bounded recent window and falls back to known real poll IDs `126809` and `160704`; their data is still fetched from the official API.
- Live updates use the official `/updates` and `/maxitem` endpoints described in the [Hacker News API documentation](https://github.com/HackerNews/API).
- The app is read-only: no login, voting, posting, or user-profile features.
