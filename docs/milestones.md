# Milestones — ClonerNews

This document assigns the work in [PRD.md](PRD.md) and [tasks.md](tasks.md) to a team of three.

Milestones are mergeable units of work. Each milestone has one owner, a protected file set, a branch, a reviewer, and a clear merge gate.

Replace `Member A`, `Member B`, and `Member C` with contributor names at kickoff.

---

## Team Roles

| Member | Primary role | Main ownership |
|---|---|---|
| Member A | Platform | API, cache, dedupe, request queue, comment data |
| Member B | Features | feeds, poll discovery, live updates, automatic loading |
| Member C | Interface | shell, rendering, sanitizer, CSS, accessibility |

Roles establish file ownership, not hierarchy. Everyone reviews, tests, and participates in integration.

---

## The Shape of the Work

```text
M1  Contracts          everyone
 │
M2  Shared base        Member A; Members B and C review
 │
 ├── M3  API platform        Member A ─┐
 ├── M4  Feeds and polls     Member B  ├─ parallel wave 1
 └── M5  Interface base      Member C ─┘
                    │
M6  Core integration    everyone
                    │
 ├── M7  Comments       Member A ─┐
 ├── M8  Live/loading   Member B  ├─ parallel wave 2
 └── M9  Feature UI     Member C ─┘
                    │
M10 Full integration    everyone
                    │
M11 Audit and release   everyone
```

M3–M5 run in parallel after M2 merges. M7–M9 run in parallel after M6 merges.

During parallel work, milestone files belong to their assigned owner. If another member needs a change, they request it instead of editing the same file on another branch.

---

## Branch and Pull Request Rules

```text
main        audit-ready releases only
└── dev     team integration
    └── milestone/m<number>-<short-name>
```

For every milestone:

1. Update local `dev`.
2. Create the milestone branch from `dev`.
3. Add tests before implementation where the milestone has testable behavior.
4. Change only the assigned files.
5. Run the complete browser test suite.
6. Open a pull request into `dev`.
7. Receive one approval and one additional manual verification.
8. Resolve every review comment.
9. Squash merge with the milestone commit message.
10. Delete the merged branch and update remaining branches from `dev`.

Shared-file, contract, and final release PRs require both other members' approval.

---

## M1 — Agree the Contracts

**Owner:** Everyone  
**Branch:** `docs/m1-contracts`  
**Files:** `docs/PRD.md`, `docs/tasks.md`, `docs/milestones.md`

Read and agree:

- requirement IDs in PRD §4
- public function signatures in PRD §5
- fixed DOM hooks in PRD §6
- dependency direction in PRD §7
- file ownership and PR rules in PRD §9
- test and audit expectations

Assign real contributor names to Member A, B, and C.

Do not start application code until contract questions are resolved. Later signature or DOM-hook changes require a separate contract PR approved by all three members.

**Done when**

- [ ] All three members have read the contracts.
- [ ] Team names replace placeholders.
- [ ] Source priority is understood.
- [ ] Each member can describe their two parallel milestones.
- [ ] Documentation PR is approved by both other members.
- [ ] Merged into `dev`.

**Merge commit**

```text
docs: agree clonernews contracts and ownership
```

---

## M2 — Shared Base

**Owner:** Member A  
**Reviewers:** Members B and C  
**Branch:** `milestone/m2-base`  
**Starts:** after M1 merges  
**Blocks:** M3, M4, and M5

### Files

- `index.html`
- `tests.html`
- `js/app.js`
- `js/config.js`
- `js/state.js`
- `tests/runner.js`
- `tests/fixtures.js`
- `tests/mockFetch.js`
- empty module stubs for every file assigned in M3–M9

### Work

1. Create all fixed DOM hooks from PRD §6.
2. Add the final script and stylesheet references.
3. Add fixed configuration values and the state shape.
4. Build the dependency-free test runner.
5. Add fixtures for all Hacker News item types and failure states.
6. Add a programmable fetch mock.
7. Create every planned module with its final exports and inert stub behavior.
8. Wire `app.js` to the final interfaces so later owners replace stubs rather than reopening orchestration.
9. Add the final imports to `tests.html`.

The stubs are what make parallel development possible. M3–M5 must be able to replace only their own files.

### Done When

- [ ] App and test pages open through the static server.
- [ ] Every fixed DOM hook exists.
- [ ] Every contract export can be imported without an error.
- [ ] Runner handles synchronous and asynchronous tests.
- [ ] Fixtures never call the live API.
- [ ] Console is clean.
- [ ] Both reviewers approve the shared-file PR.
- [ ] Merged into `dev`.

**Merge commit**

```text
chore: scaffold shared clonernews contracts
```

After M2, its shared files are frozen until M6.

---

## Parallel Wave 1

M3, M4, and M5 start from the same merged M2 base. Each member owns a disjoint file set.

### Cross-Team Rule

M4 and M5 test against the M2 contracts and mocks; they do not wait for M3's real network implementation. Integration happens in M6.

---

## M3 — API and Request Platform

**Owner:** Member A  
**Primary reviewer:** Member B  
**Manual verifier:** Member C  
**Branch:** `milestone/m3-api-platform`  
**Runs alongside:** M4 and M5

### Files

- `js/api/endpoints.js`
- `js/api/client.js`
- `js/services/itemCache.js`
- `js/services/requestDeduper.js`
- `js/services/requestQueue.js`
- `tests/api.test.js`
- `tests/requests.test.js`

### Work

- Implement official endpoint builders.
- Implement JSON, HTTP, null, network, malformed-response, and abort behavior.
- Implement completed-item caching.
- Share in-flight requests by key.
- Remove rejected requests from pending state.
- Cap concurrent item requests at six.
- Add force refresh for live updates.
- Preserve requested ID order in multi-item results.

### Done When

- [ ] R1–R12 tests pass.
- [ ] The seventh simultaneous item request waits.
- [ ] Duplicate concurrent IDs make one network call.
- [ ] Failure and abort leave clean queue state.
- [ ] No UI or feature module is imported.
- [ ] Complete suite passes.
- [ ] PR approved and merged into `dev`.

**Merge commit**

```text
feat: add hacker news api request platform
```

---

## M4 — Feed and Poll Features

**Owner:** Member B  
**Primary reviewer:** Member C  
**Manual verifier:** Member A  
**Branch:** `milestone/m4-feeds-polls`  
**Runs alongside:** M3 and M5

### Files

- `js/features/feed.js`
- `js/features/polls.js`
- `tests/feed.test.js`
- `tests/polls.test.js`

### Work

- Initialize independent Stories and Jobs ID lists.
- Load 15 visible posts per batch.
- Enforce the 45-candidate batch inspection cap.
- Filter unusable and category-mismatched records.
- Merge without duplicates and sort newest-first.
- Preserve feed cursor and error state.
- Discover Polls only when requested.
- Enforce the 60-ID scan budget and six-poll target.
- Add and validate the two API-fetched fallback polls.
- Load and validate poll options in `parts` order.

Use mocked `fetchItem`, `fetchItems`, and endpoint functions from the agreed contracts. Do not edit API files.

### Done When

- [ ] R13–R29 and R38–R46 feature tests pass.
- [ ] Feed arguments and source arrays are not mutated.
- [ ] Poll scanning cannot exceed its budget.
- [ ] Wrong-parent poll options are rejected.
- [ ] Complete suite passes.
- [ ] PR approved and merged into `dev`.

**Merge commit**

```text
feat: add progressive feeds and poll discovery
```

---

## M5 — Interface Foundation

**Owner:** Member C  
**Primary reviewer:** Member A  
**Manual verifier:** Member B  
**Branch:** `milestone/m5-interface-base`  
**Runs alongside:** M3 and M4

### Files

- `js/utils/html.js`
- `js/utils/time.js`
- `js/utils/throttle.js`
- `js/ui/shell.js`
- `js/ui/feedView.js`
- `css/styles.css`
- `tests/html.test.js`
- `tests/throttle.test.js`

### Work

- Implement safe HTML allowlist and URL rules.
- Implement newest-first sorting helper and relative time.
- Implement leading/trailing throttling.
- Render accessible category tabs and page landmarks.
- Render Story, Job, and Poll cards from fixtures.
- Render loading, empty, incremental, exhausted, error, and retry states.
- Establish final component class names and design tokens.
- Add the first responsive editorial layout.

Use feature contracts and fixture data. Do not edit feature, API, or shared base files.

### Done When

- [ ] R17–R20, R27, R31–R35, and R77–R83 tests applicable to this milestone pass.
- [ ] Unsafe scripts, attributes, elements, and URLs are removed.
- [ ] All three categories are keyboard reachable.
- [ ] Cards tolerate every missing optional fixture field.
- [ ] Console is clean.
- [ ] PR includes screenshots.
- [ ] PR approved and merged into `dev`.

**Merge commit**

```text
feat: add safe accessible feed interface
```

---

## M6 — Core Integration

**Owner:** Everyone  
**Integrator:** Member B  
**Reviewers:** Members A and C  
**Branch:** `integration/m6-core`  
**Starts:** after M3, M4, and M5 merge

Only Member B edits shared integration files during this milestone.

### Files

- `js/app.js`
- shared files only when required to connect already agreed hooks
- focused fixes in M3–M5 modules, made by their original owners

### Work

1. Connect the real API platform to feed features.
2. Connect feed features to category navigation and cards.
3. Load Stories on startup.
4. Initialize Jobs and Polls only when their tabs are opened.
5. Connect the Load more button.
6. Confirm state survives category switches.
7. Inspect real network behavior.
8. Walk all PRD requirements through R46 that are applicable before comments/live work.

### Done When

- [ ] Stories, Jobs, and Polls render from the live API.
- [ ] A maximum of six item requests run at once.
- [ ] First feed load resolves one progressive batch.
- [ ] Poll scan and fallback behavior are visible.
- [ ] Load more does not duplicate cards.
- [ ] Cache reuse is visible in the network panel.
- [ ] Chrome and Firefox console are clean.
- [ ] Both reviewers approve.
- [ ] Merged into `dev`.

**Merge commit**

```text
feat: integrate core clonernews feeds
```

After M6, shared files close again until M10.

---

## Parallel Wave 2

M7, M8, and M9 begin after M6 merges. Their contracts and UI hooks already exist.

---

## M7 — Direct and Nested Comments

**Owner:** Member A  
**Primary reviewer:** Member B  
**Manual verifier:** Member C  
**Branch:** `milestone/m7-comments`  
**Runs alongside:** M8 and M9

### Files

- `js/features/comments.js`
- `tests/comments.test.js`

### Work

- Load direct comments only from the selected post's `kids`.
- Validate every direct parent.
- Keep a local `rootPostId`.
- Batch direct comments by 20.
- Preserve useful deleted placeholders.
- Protect against stale selections.
- Load replies only on expansion.
- Validate nested parents and root identity.
- Batch replies by 10.
- Cache collapsed reply state.
- Sort siblings newest-first at every level.

### Done When

- [ ] R47–R64 tests pass.
- [ ] Two post selections cannot mix comments.
- [ ] Wrong-parent comments and replies are rejected.
- [ ] No eager recursive tree fetch occurs.
- [ ] Re-expanding loaded replies causes no request.
- [ ] Complete suite passes.
- [ ] PR approved and merged into `dev`.

**Merge commit**

```text
feat: add parent-safe nested comments
```

---

## M8 — Live Updates and Automatic Loading

**Owner:** Member B  
**Primary reviewer:** Member C  
**Manual verifier:** Member A  
**Branch:** `milestone/m8-live-loading`  
**Runs alongside:** M7 and M9

### Files

- `js/features/liveUpdates.js`
- `tests/liveUpdates.test.js`
- automatic-loading behavior owned by the feature layer

### Work

- Capture the initial max-item snapshot.
- Check updates and max item every 5,000 ms.
- Prevent overlapping ticks.
- Force-refresh relevant known changes only.
- Calculate pending-new count without background range fetching.
- Accept and inspect at most 20 new candidates.
- Merge accepted items without duplicates.
- Pause while the page is hidden.
- Add guarded `IntersectionObserver` behavior through the agreed callback contract.

### Done When

- [ ] R65–R76 tests pass with fake time.
- [ ] There is one interval and no overlapping check.
- [ ] Background checks do not resolve the entire new-ID range.
- [ ] Failed checks preserve current state.
- [ ] Observer and button triggers cannot overlap.
- [ ] Complete suite passes.
- [ ] PR approved and merged into `dev`.

**Merge commit**

```text
feat: add controlled live and automatic loading
```

---

## M9 — Detail, Comments, and Live Interface

**Owner:** Member C  
**Primary reviewer:** Member A  
**Manual verifier:** Member B  
**Branch:** `milestone/m9-feature-interface`  
**Runs alongside:** M7 and M8

### Files

- `js/ui/detailView.js`
- `js/ui/commentsView.js`
- `js/ui/liveView.js`
- additions to `css/styles.css`
- UI-focused tests using fixtures and stub feature contracts

### Work

- Render Story, Job, and Poll detail safely.
- Render poll options and unavailable placeholders.
- Manage dialog focus, close control, and Escape.
- Render direct comments and arbitrary nested levels.
- Cap visual indentation after five levels.
- Render Load replies, Load more replies, collapse, Retry, and deleted states.
- Render live previews, counts, accept, and dismiss controls.
- Add polite announcements and responsive detail layout.
- Respect reduced motion.

### Done When

- [ ] R30–R37 and UI portions of R43–R46, R47–R64, R71–R72, and R77–R85 hold with fixtures.
- [ ] Dialog returns focus to its opener.
- [ ] Deep comments remain readable on narrow screens.
- [ ] API HTML is never inserted unsanitized.
- [ ] PR includes desktop and mobile screenshots.
- [ ] Complete suite passes.
- [ ] PR approved and merged into `dev`.

**Merge commit**

```text
feat: add post comments and live update views
```

---

## M10 — Full Integration

**Owner:** Everyone  
**Integrator:** Member C  
**Reviewers:** Members A and B  
**Branch:** `integration/m10-full-app`  
**Starts:** after M7, M8, and M9 merge

Only Member C edits shared integration files during this milestone. Feature defects return to the original owner as focused commits or follow-up branches.

### Work

1. Connect post selection to detail and comments.
2. Connect Poll detail to option loading.
3. Connect nested comment controls to feature actions.
4. Start and stop live checks correctly.
5. Connect live notifications and acceptance.
6. Connect `IntersectionObserver` to the shared feed loading guard.
7. Add stale-request and dialog-close cleanup.
8. Complete responsive and accessibility integration.
9. Walk the full PRD acceptance checklist.

### Done When

- [ ] Story, Job, and Poll open without errors.
- [ ] Comments stay beneath the correct post.
- [ ] Nested replies stay beneath the correct comment.
- [ ] Posts and sibling comments are newest-first.
- [ ] Live checks occur once per five seconds.
- [ ] Live notifications are visible and do not shift the feed automatically.
- [ ] Load more and automatic loading do not overlap.
- [ ] Error and retry paths preserve loaded content.
- [ ] Both reviewers approve.
- [ ] Merged into `dev`.

**Merge commit**

```text
feat: integrate complete clonernews experience
```

---

## M11 — Audit, Documentation, and Release

**Owner:** Everyone  
**Release integrator:** Member A  
**Branch:** `release/m11-audit`  
**Starts:** after M10 merges

### Responsibility Split

- **Member A:** network behavior, API failures, cache/dedupe/queue evidence
- **Member B:** feed ordering, progressive loading, polls, live interval evidence
- **Member C:** post opening, comments, responsive UI, keyboard and accessibility

Each member records evidence for their area. All three repeat the official audit together once individual checks pass.

### Work

- Run every automated test.
- Walk every line of `docs/audit.md`.
- Inspect initial and incremental network counts.
- Test story, job, poll, poll options, comments, and nested replies.
- Wait through at least three live intervals.
- Test offline and retry behavior.
- Test Chrome and Firefox.
- Test narrow mobile layout and keyboard-only operation.
- Confirm a clean console.
- Update README run, test, architecture, poll, live, and limitation sections.
- Update stale ClonerNews-adjacent documentation without changing the exercise or audit.

### Release Gate

- [ ] Every automated test passes.
- [ ] Every audit answer is yes.
- [ ] All PRD acceptance items hold.
- [ ] No uncontrolled request burst appears.
- [ ] No unsafe HTML test succeeds in executing content.
- [ ] No known console error remains.
- [ ] README is complete.
- [ ] All three members approve the `dev → main` pull request.

### Pull Requests

1. Open `release/m11-audit` into `dev` for final fixes and documentation.
2. After it merges, open `dev` into `main`.
3. Require both non-integrator approvals.
4. Merge only after the three-person audit walkthrough.

**Release commit**

```text
release: complete clonernews audit
```

---

## Ownership Matrix

| Area | Writer | First reviewer | Manual verifier |
|---|---|---|---|
| Shared base | Member A | Member B | Member C |
| API and requests | Member A | Member B | Member C |
| Feeds and polls | Member B | Member C | Member A |
| Interface foundation | Member C | Member A | Member B |
| Comments | Member A | Member B | Member C |
| Live and auto-loading | Member B | Member C | Member A |
| Feature views | Member C | Member A | Member B |
| M6 integration | Member B | Members A and C | Everyone |
| M10 integration | Member C | Members A and B | Everyone |
| Release | Member A | Members B and C | Everyone |

The rotating integration owner prevents one person from controlling every shared merge.

---

## Status

Update this table as work is assigned and merged.

| Milestone | Owner | Branch | Status | PR |
|---|---|---|---|---|
| M1 Contracts | Everyone | `docs/m1-contracts` | Ready | — |
| M2 Shared base | Member A | `milestone/m2-base` | Blocked by M1 | — |
| M3 API platform | Member A | `milestone/m3-api-platform` | Blocked by M2 | — |
| M4 Feeds and polls | Member B | `milestone/m4-feeds-polls` | Blocked by M2 | — |
| M5 Interface base | Member C | `milestone/m5-interface-base` | Blocked by M2 | — |
| M6 Core integration | Everyone / Member B integrates | `integration/m6-core` | Blocked by M3–M5 | — |
| M7 Comments | Member A | `milestone/m7-comments` | Blocked by M6 | — |
| M8 Live and loading | Member B | `milestone/m8-live-loading` | Blocked by M6 | — |
| M9 Feature interface | Member C | `milestone/m9-feature-interface` | Blocked by M6 | — |
| M10 Full integration | Everyone / Member C integrates | `integration/m10-full-app` | Blocked by M7–M9 | — |
| M11 Audit and release | Everyone / Member A integrates | `release/m11-audit` | Blocked by M10 | — |

