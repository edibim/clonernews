# Contributing — ClonerNews

This guide defines how the three-person team writes, reviews, tests, and merges ClonerNews.

Read these first:

1. [exercise.md](exercise.md) — mandatory behavior
2. [audit.md](audit.md) — evaluator actions
3. [PRD.md](PRD.md) — requirements and contracts
4. [tasks.md](tasks.md) — implementation phases
5. [milestones.md](milestones.md) — ownership, branches, and merge order

If documents conflict, the exercise and audit win.

---

## Team Ownership

The milestone plan uses three stable roles:

| Member | Primary ownership |
|---|---|
| Member A | API, cache, request control, comments data |
| Member B | feeds, polls, live updates, automatic loading |
| Member C | rendering, sanitizer, CSS, accessibility |

Replace the placeholders with contributor names during M1.

Ownership prevents conflicting edits; it does not prevent collaboration. Anyone may review, test, investigate, or suggest a change. Only the active milestone owner edits that milestone's protected files.

If your work needs a change in another member's file:

1. describe the required change to its owner
2. agree whether it belongs in the owner's branch or a separate integration PR
3. wait for that change to merge
4. update your branch from `dev`

Do not quietly edit the same file on two parallel branches.

---

## JavaScript Conventions

### Naming

- Constants use `UPPER_SNAKE_CASE`:

```js
const POST_BATCH_SIZE = 15;
const LIVE_INTERVAL_MS = 5000;
```

- Variables, functions, object properties, state keys, and DOM IDs use `camelCase` in JavaScript:

```js
const selectedPostId = 8863;
function loadNextPage() {}
```

- Functions begin with a verb that describes their effect:

```js
getItemUrl
fetchItem
loadMoreComments
renderPostDetail
validateCommentParent
```

- Boolean names read as claims:

```js
isLoading
isExpanded
hasCachedItem
```

- Event handlers begin with `handle`:

```js
handleCategoryClick
handleDialogClose
```

- Private module variables do not need underscore prefixes. Keep them unexported.

### Hacker News Field Names

Keep official API field names unchanged:

```text
id type by time text parent poll kids parts url score title descendants
```

Do not rename API fields inside fetched records. UI-specific values such as `rootPostId`, `loading`, and `expanded` belong in local state rather than on API objects.

### Files

- JavaScript modules: `camelCase.js`
- Tests: `<module>.test.js`
- HTML and CSS: lowercase names
- Markdown documents: retain the repository's existing names

Examples:

```text
requestQueue.js
liveUpdates.js
comments.test.js
styles.css
```

### Modules

- Use named exports.
- Keep one responsibility per module.
- Do not import UI modules from features, services, API, or utilities.
- Only `js/api/client.js` calls `fetch` directly.
- Do not create circular imports.
- Add JSDoc to exported functions when their arguments, return values, or failure behavior are not obvious.
- Pass dependencies as arguments in tests rather than hiding test-only globals inside production modules.

### Async Code

- Prefer `async`/`await` for multi-step asynchronous flows.
- Pass `AbortSignal` through every layer that supports cancellation.
- Use `try`/`catch` only where the module can add useful behavior or context.
- Never swallow errors silently.
- Ignore stale results when the selected post or active request has changed.
- Use `finally` to restore loading and request bookkeeping.

### State

- Fixed values live in `config.js`.
- Mutable application data lives in `state.js`.
- Do not store DOM nodes inside application state.
- Do not mutate Hacker News API records.
- Keep Stories, Jobs, and Polls feed state independent.
- Every async state transition must leave success, failure, and abort paths consistent.

---

## DOM and CSS Conventions

### DOM Hooks

Fixed IDs and `data-*` attributes are contracts listed in PRD §6. Do not rename them in a feature PR.

Use IDs for stable application containers:

```text
#category-tabs
#feed-list
#post-dialog
```

Use `data-*` attributes for generated elements and delegated events:

```text
data-category
data-item-id
data-comment-id
data-action
```

Bind long-lived listeners once on stable containers. Do not attach a new listener to every card or comment after each render.

### Rendering

- Prefer `document.createElement`, `textContent`, and `replaceChildren`.
- Never assign raw Hacker News content to `innerHTML`.
- Use `setSanitizedHTML()` only for API fields that intentionally contain formatting.
- Give each container one clear writer.
- Render loading, empty, error, retry, and exhausted states explicitly.

### CSS

Use `kebab-case` with block, element, and modifier structure:

```css
.post-card {}
.post-card__meta {}
.post-card--job {}

.comment-thread {}
.comment-thread__reply {}
.comment-thread--collapsed {}
```

Rules:

- Reuse design tokens from `:root`.
- Do not style behavior through generated element IDs.
- Keep selectors shallow.
- Do not use `!important` to resolve ownership conflicts.
- Respect responsive layouts and `prefers-reduced-motion`.
- Announce new class names in the PR description when another milestone consumes them.

---

## Security and API Discipline

- Treat API `title` and `text` as untrusted HTML.
- Use the sanitizer allowlist defined in PRD R77–R80.
- Reject unsafe link protocols.
- Add `noopener`, `noreferrer`, and `nofollow` to external formatted links.
- Do not use `eval`, `new Function`, inline event attributes, or string-built executable code.
- Do not fetch all item records returned by a list endpoint.
- Use the completed cache, in-flight deduper, and six-request queue.
- Keep Poll discovery and live-item inspection within their documented budgets.
- Do not add a new polling loop outside `liveUpdates.js`.

---

## Git Workflow

```text
main          audit-ready releases only
└── dev       team integration
    ├── milestone/m3-api-platform
    ├── milestone/m4-feeds-polls
    └── milestone/m5-interface-base
```

Never commit feature work directly to `main` or `dev`.

### Start a Milestone

```bash
git switch dev
git pull
git switch -c milestone/m<number>-<short-name>
```

Use the exact branch name listed in [milestones.md](milestones.md) whenever one is provided.

Before opening a PR, update the branch from the current `dev` using the team's agreed non-destructive workflow. Resolve conflicts only in files owned by your milestone. Ask the relevant owner to resolve conflicts in their files.

### Commit Messages

Use one of:

```text
feat:
fix:
test:
docs:
chore:
refactor:
release:
```

Messages describe the outcome:

```text
feat: add bounded poll discovery
test: cover stale comment responses
fix: prevent overlapping live checks
```

Avoid messages such as `changes`, `work`, `fix stuff`, or a filename alone.

Keep commits small enough to review. Do not mix formatting, unrelated cleanup, and feature behavior in one commit.

---

## Test-Driven Workflow

For testable milestone behavior:

1. Add the smallest deterministic failing test.
2. Open `tests.html` and confirm the intended failure.
3. Implement the contract.
4. Run the complete suite.
5. Inspect the browser console.
6. Perform the milestone's manual check.
7. Commit passing work.

Automated tests use fixtures and mocked requests. They must not call the live Hacker News API.

Do not change a fixture merely to make a test pass. Add a new fixture when a genuinely different case is needed.

---

## Pull Requests

Every milestone ends in a PR targeting `dev`.

### PR Title

Use the milestone and outcome:

```text
M4: add progressive feeds and poll discovery
```

### PR Description

Include:

```md
## Milestone

- M4
- Requirements: R13–R29, R38–R46

## What Changed

- 

## Files Owned

- 

## Tests Added First

- 

## Verification

- [ ] Full browser test suite
- [ ] Clean console
- [ ] Milestone manual checks

## Network Notes

- Requests observed:
- Cache/deduplication behavior:

## Screenshots

- Include for visible UI changes

## Follow-ups

- 
```

### Before Opening

- [ ] Branch started from or has been updated with current `dev`.
- [ ] Only milestone-owned files changed.
- [ ] Public contracts remain unchanged unless this is an approved contract PR.
- [ ] Complete browser test suite passes.
- [ ] Console is clean.
- [ ] No live API request runs from automated tests.
- [ ] The milestone's **Done When** checklist is complete.
- [ ] Visible UI changes include desktop and narrow-screen screenshots.

### Review

The assigned primary reviewer checks:

- contract compatibility
- correctness and edge cases
- test quality
- ownership boundaries
- API request behavior
- security and accessibility where relevant

The assigned manual verifier runs or witnesses the milestone's main browser flow.

A normal milestone PR requires:

- one teammate approval
- one additional manual verification
- all review comments resolved

A contract, shared-file, integration, or release PR requires approval from both other members.

### Merge

- Target `dev`, never `main`, for milestone PRs.
- Squash merge using the agreed milestone message.
- Delete the merged branch.
- Update open dependent branches from the new `dev`.
- Record the PR link and status in `milestones.md`.

Only the final audited `dev → main` PR creates a release.

---

## Shared Files

These files are frozen after M2:

```text
index.html
tests.html
js/app.js
js/config.js
js/state.js
```

M6 and M10 intentionally reopen shared integration files with one named integrator.

For an unplanned shared-file change:

1. announce the exact change and reason
2. open a small standalone PR
3. obtain both other members' approval
4. merge it before dependent work continues

Do not include a shared-file change as a convenient extra in an unrelated feature PR.

---

## Running the Project

```bash
python3 -m http.server 8000
```

Open:

```text
http://127.0.0.1:8000/
http://127.0.0.1:8000/tests.html
```

If `localhost` does not resolve, use `127.0.0.1`.

Do not open the application with `file://`; native ES module imports require an HTTP server.

There is intentionally no dependency installation or build command.

---

## Definition of a Reviewable Contribution

A contribution is ready when:

- its requirement and milestone are identifiable
- it respects file ownership
- contracts remain stable
- tests demonstrate the behavior
- failure and abort paths are handled
- network requests stay inside documented budgets
- API HTML is sanitized
- keyboard behavior is preserved
- the console is clean
- the PR explains how another team member can verify it
