# Tests — Sortable

Companion to [PRD.md](PRD.md). Requirement numbers (`R1`–`R53`) refer to §3 there.

Phase 2's DOM-heavy features — the detail view and URL state — are not pure functions and are not unit tested here. They are checked by eye, via the Phase 2 sections of the PRD's §8 checklist. `filterHeroes`'s Phase 2 query syntax stays a pure function, so it is tested below like everything else.

---

## What gets tested

Only the **pure functions** — input in, output out, no DOM. Appearance is checked by eye.

No framework. `tests/runner.js` is about 20 lines and prints ✅/❌. Open `tests.html` to run it.

## Where the data comes from

**`tests/fixtures.js`, never the network.** It holds real records copied straight out of `all.json`:

Each one earns its place:

- `A-Bomb` — an ordinary complete record, 203 cm and 441 kg
- `Dagger` — `height` of length 1, holding a place name (R10)
- `Ymir` — `"304.8 meters"`, the tallest once normalised (R29)
- `Godzilla` — `"108.0 meters"` and `"90,000 tons"`, the comma trap (R29)
- `King Kong` — `"30.5 meters"` and `"9,000 tons"` (R29)
- `Utgard-Loki` — `"15.2 meters"` and `"58 tons"` (R29)
- `Fin Fang Foom` — `"18 tons"`, and `975 cm`, so tall but still in centimetres
- `Franklin Storm` — a genuine `power: 0` (R32)
- `Ra's Al Ghul` — apostrophe in the name (R9)
- `Aquaman`, `Man-Bat` — search targets (R17)
- `Batman` — **both records**, Bruce Wayne and Terry McGinnis, for the duplicate-name case (R33)
- `Abraxas`, `DL Hawkins` — `"0 kg"` and `"0 cm"` (R31); `DL Hawkins` also drives the `localeCompare` case (R27)
- `Ronin` — no portrait, shares the `no-portrait.jpg` placeholder icon (R40)

Weights in kilograms, for the ascending-sort case: `Dagger` 52, `Batman` 77, `Batman` 95, `Ra's Al Ghul` 97, `Aquaman` 146, `A-Bomb` 441.

Fetching the real file would make the runner async and dependent on the CDN — a test that fails for unrelated reasons is worse than no test. Making up data would lose the point, which is that these oddities are real. Copying real records keeps both.

**Never edit a fixture to make a test pass.** If a case needs a hero that is not there yet, copy the record in unchanged.

---

## Required cases

### `toNumber`

- `38` → `38` — a plain powerstat, no unit
- `"441 kg"` → `441`
- `"203 cm"` → `203`
- `"304.8 meters"` → `30480`, not `304.8` — Ymir (R29)
- `"18 tons"` → `18000` — Fin Fang Foom
- `"90,000 tons"` → `90000000`, not `90` — Godzilla, the comma trap
- `"-"`, `""`, `null` → `null`
- `"0 kg"` → `null` (R31)
- `0` → `0` (R32)

### `isMissing`

- `null`, `undefined`, `""`, `"-"` → `true`
- `"0 kg"`, `"0 cm"` → `true` (R31)
- `0` → **`false`** (R32) — guards against Franklin Storm sorting last

### `getValue`

- `appearance.weight[1]` → `"441 kg"`
- missing path → `null`, no throw
- `null` mid-path → `null`, no throw
- index past a short array → `null`, no throw — Dagger (R10)

### `getColumn`

- `"weight"` → object with `type === "number"`
- unknown key → `undefined`, no throw

### `escapeHTML`

- `"Ra's Al Ghul"` → the apostrophe does not break `title='...'`
- ordinary text → unchanged

### `filterHeroes`

**Phase 1 — substring, on `name`**
- `"man"`, field `"name"` → includes `Aquaman` and `Batman`
- `"MAN"` → same result (R18)
- `""` → the whole list

**Phase 2 — field targeting (R41, R42)**
- `"human"`, field `"race"` → includes `A-Bomb`, both `Batman` records, `Man-Bat`, `Ra's Al Ghul`, `Ronin`
- `"human"`, field `"name"` → empty list — same query, different field, different result

**Phase 2 — exclude, `!` prefix (R43)**
- `"!man"`, field `"name"` → excludes `Aquaman`, both `Batman`, `Man-Bat`; the other 12 fixture heroes remain

**Phase 2 — fuzzy, `~` prefix (R44)**
- `"~aqmn"`, field `"name"` → matches `Aquaman` (`a`, `q`, `m`, `n` appear in that order in "Aquaman")
- `"~xyz"`, field `"name"` → matches nothing

**Phase 2 — numeric comparisons on a `number` column (R45)**
- `"=95"`, field `"weight"` → matches exactly one `Batman` record (95 kg), not the other (77 kg)
- `"!=95"` → the inverse — every fixture hero except that one `Batman`
- `">100"`, field `"weight"` → includes `Fin Fang Foom` (`18 tons` → 18,000 kg); proves the comparison runs on the normalised number (R28), not the raw string
- `"<100"`, field `"weight"` → excludes every hero whose weight is missing (`Abraxas`, `DL Hawkins`, `Man-Bat`, `Ymir` — all `"0 kg"`, R31); a missing value satisfies no comparison

**Phase 2 — fallback (R46)**
- `">100"`, field `"name"` (a `text` column) → treated as a plain substring search, not a crash — matches nothing, since no name literally contains `">100"`

### `sortHeroes`

- weight ascending → `Dagger` (52) · `Batman` (77) · `Batman` (95) · `Ra's Al Ghul` (97) · `Aquaman` (146) · `A-Bomb` (441)
  *Two-digit weights must come before three-digit ones. Compared as text, `"146 kg"` would precede `"52 kg"` (R28).*
- missing values last, **both** directions (R30)
- height descending → `Ymir` first (R29)
- weight descending → `Godzilla` first (R29)
- power ascending → `Franklin Storm` first, not last (R32)
- name ascending → `Dagger` before `DL Hawkins` (R27)
- height, either direction → `Dagger` last, no throw (R10)
- ties keep their previous order (R33)
- unknown `sortBy` → list unchanged, no throw (R34)
- the input list is untouched
- icon ascending and descending → `Ronin` (`no-portrait.jpg` placeholder) last both ways (R40)

### `pageSlice`

- page 2, size 20 → items 20–39
- `"all"` → the whole list
- page out of range → empty array, no throw

### `totalPages`

- 563 items, size 20 → `29`
- 40 items, size 20 → `2`, not 3
- any count, `"all"` → `1`
- 0 items → `1`, not 0

---

## Files

```
tests/
├── runner.js
├── fixtures.js        real hero records, copied as-is
├── data.test.js       toNumber, isMissing, getValue, getColumn
├── filter.test.js     filterHeroes, incl. Phase 2 field/operator cases
├── sort.test.js       sortHeroes
├── paginate.test.js   pageSlice, totalPages
└── render.test.js     escapeHTML
```

`detail.js` and `urlState.js` have no `.test.js` file — neither exports a pure function (§4.4, §4.3). They are covered by the Phase 2 checklist in the PRD instead.
