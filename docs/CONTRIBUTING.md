# Contributing — Sortable

Conventions for everyone working on this repo. The what and why live in [docs/PRD.md](docs/PRD.md); the order of work in [docs/MILESTONES.md](docs/MILESTONES.md).

---

## Naming

**JavaScript**

- Constants `UPPER_SNAKE`: `COLUMNS`, `API_URL`
- Everything else `camelCase` — variables, functions, properties, `state` keys, column keys, DOM ids
- Functions start with a verb: `getColumn`, `renderHead`, `toNumber`
- Booleans read as a claim: `isMissing`, `sortable`. Never negative — `isNotMissing` forces a double negative at every call.

**Column keys** match §3 R5 of the PRD character for character: `fullName`, `placeOfBirth`. These are the riskiest names in the project — a typo raises no error, it just leaves cells empty.

**CSS classes** — `kebab-case`, prefixed by their block:

```
.hero-table    .hero-table__row    .hero-table__cell
.pager         .pager__button      .pager__button--active
.status        .status--error
```

Block, element (`__`), modifier (`--`). Whoever writes the markup announces its class names, since someone else writes the styles. A class nobody hears about is a rule nobody writes, and an element that renders unstyled.

**Files** — `camelCase.js` for modules, `<module>.test.js` for tests, `kebab-case` for everything else.

---

## Git

```
main          finished, tested code only. Never commit here directly.
 └── dev      where everyone's work meets
      ├── one branch per person
```

**Branch from `dev`** — the same place the work returns to.

1. `git switch dev && git pull` before starting anything new
2. `git switch -c <branch>`
3. Small commits, with a message that says what changed
4. Pull request into `dev`
5. One teammate reviews before merge
6. `dev` → `main` only when everything works

**Commit messages** use a prefix: `feat:`, `fix:`, `docs:`, `test:`, `chore:`.

## Before opening a PR

- Tests pass — open `tests.html`
- No changes to a file you do not own (see MILESTONES)
- Console is clean
- The milestone's "done when" list holds in full

## Shared files

`index.html`, `tests.html` and `js/config.js` are read by nearly everything. Treat them as fixed once written — see §5.4 of the PRD for why a change there breaks other files silently. If one genuinely has to change, announce it first and land it as its own commit.

**M7 in MILESTONES.md is the one sanctioned exception** — a single, planned reopening of `index.html` and `main.js` to add every Phase 2 hook at once, so M8–M10 never have to touch them again. It is not a precedent for casual edits.

---

## Running it

```bash
python3 -m http.server 8000
```

```
http://localhost:8000            → the app
http://localhost:8000/tests.html → the tests
```

If `localhost` doesn't resolve on your machine, `http://127.0.0.1:8000` is the same server and always works.

ES modules do not work when you open the file directly (`file://`). That is a browser security rule, not a bug.
