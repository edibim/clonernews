# ClonerNews

## Description
ClonerNews is a lightweight Hacker News reader implemented as a static browser app. It loads top-level stories, jobs, and polls, renders detail views with comments, and supports live update notifications without a build step.

## Features
- Progressive feed loading for Stories and Jobs
- Safe post cards and post detail rendering
- Direct and nested comment threads with lazy reply expansion
- Poll discovery and poll option rendering
- Live update banner with accept flow for changed and new items
- Accessible shell, keyboard navigation, and responsive layout

## Architecture
- State lives in js/state.js and is shared across modules.
- API access is isolated in js/api/.
- Feature modules handle request orchestration in js/features/.
- UI modules render the DOM in js/ui/.
- Shared helpers live in js/utils/.

## Hacker News API Endpoints
- /newstories.json for Stories IDs
- /jobstories.json for Jobs IDs
- /polls.json for Poll IDs
- /item/{id}.json for item details
- /updates.json and /maxitem.json for live updates

## Poll Discovery Decision
Poll discovery is bounded to a small set of known poll IDs with defensive validation so the app stays responsive and predictable.

## Live Update Behavior
The app polls the Hacker News updates endpoint every five seconds, refreshes changed known items, and lets the user accept pending new items without auto-jumping the feed.

## Running Locally
Serve the project from the workspace root:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/ for the app and http://localhost:8000/tests.html for the test runner.

## Running Tests
Open the browser test runner at http://localhost:8000/tests.html.

## Audit Notes
The app keeps sanitized HTML rendering, retries on failed loads, and avoids duplicate request bursts through shared request controls and loading guards.

## Known Limitations
- The project intentionally uses the static-file environment without a package manager or build pipeline.
- Live API data can change between requests, so tests use fixtures and mocked responses.

