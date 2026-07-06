# [DRAFT] Content Editor — Side Events & Meetings (Actions JSON Viewer v2)

*Drafted July 6, 2026. Status: READY — all four §6 forks decided by Nes on July 6, 2026 (A3 changelog, B1 read-only knobs, C2 dominance hard-block, D1 full event CRUD); decisions folded into §2/§3 below.*

**Goal (Nes):** an updated Actions JSON Viewer that lets a game designer / copywriter edit **side events and meetings without code**.

**Merge authority this session:** all work stays local (PR OK), no merge until finalized + playtested.

---

## 1. As-is findings (code-verified July 6, 2026)

### The existing tool
`client/src/admin/ActionsViewer.tsx` (route `/admin/actions-viewer`, `withAdmin`-gated) is already a full view+edit surface for `data/actions.json` weekly meetings: name / description / prompts / target_scope / role / icon / category / meeting_id, choice CRUD, per-choice effect CRUD, client-side `ActionsConfigSchema` validation, then `POST /api/admin/actions-config` (`server/routes/admin.ts:31`) which re-validates, writes a `.backup`, and overwrites the file.

### Gaps that block the session goal
1. **No side-events support at all.** `data/events.json` (12 authored events, `category` per event) has no admin endpoints, no editor, and no contracts-level config schema (only the per-event `SideEventSchema` inside `shared/utils/dataLoader.ts:460`).
2. **The two newest meeting fields are invisible.** `requires` (Tier 0 relevance tags) and `reactive_trigger` (Tier 2) are preserved on edit (object spread + `.passthrough()`) but cannot be seen or edited, and the "Add New Action" template omits them — a new meeting authored in the tool is always-eligible and never reactive, silently.
3. **The effect whitelist is stale.** `CONNECTED_EFFECTS` (ActionsViewer.tsx:96) hardcodes 6 keys; the canonical `LIVE_EFFECT_KEYS` (`shared/engine/processors/ActionProcessor.ts:62`) has 13 (+ `executive_mood`). Seven live channels (`press_story_flag`, `press_momentum`, `quality_bonus`, `awareness_boost`, `variance_up`, `rep_swing`, `award_chances`) are wrongly badged "Not implemented ○" — actively misleading for a copywriter.
4. **The effect-name picker is data-derived, not canonical.** It offers the union of names found in the file (plus a `'new_effect'` fallback in `addEffect`) instead of the canonical whitelist — an author can produce a file that `data-lint-effect-keys` rejects and, for events.json, that the server's Zod load would 500 on.
5. **Prod/data staleness, two flavors:**
   - The viewer reads actions.json via **static bundle import** (line 30), not the existing `GET /api/admin/actions-config` — in production the tool shows build-time data even after a successful save.
   - `dataLoader.loadAllData()` **caches** (`dataCache`/`isLoaded`; `clearCache()` at dataLoader.ts:556). Meetings dodge this (`loadActionsData` re-reads the file per call — gameData.ts:111), but **events go through the cache** (gameData.ts:901): a saved events.json edit is invisible to a running server until restart. Same failure class as the July 5 "17 weeks, zero side events" stale-server mystery.
6. **Guard-rail drift risk.** Content edits must satisfy: effect keys ∈ `LIVE_EFFECT_KEYS` ∪ `executive_mood` (data-lint-effect-keys, covers actions/events/dialogue); `requires` ⊆ `RELEVANCE_TAGS`; `reactive_trigger` ∈ `HAPPENING_TYPES`; event `category` ∈ `SIDE_EVENT_CATEGORIES` **and** present in `event_weights` (hard lint); no weakly-dominant choice within a meeting (`meeting-dominance.test.ts`, meetings only). The tool currently enforces none of these beyond base Zod shape.
7. **Process conflict.** `data/CLAUDE.md` + root CLAUDE.md require the `[REFERENCE]` exec-meetings doc to be updated when actions.json content changes — a no-code copywriter can't do that. Needs a process decision (§6 fork A).

---

## 2. Design

One admin page, two tabs: **Meetings** (modernized existing editor) and **Side Events** (new). Working title: **Content Editor** (route stays `/admin/actions-viewer`; AdminLayout label updated). Everything is copywriter-first: canonical pickers with plain-language descriptions (reusing `EFFECT_CHANNEL_DESCRIPTIONS` tooltips), inline lint feedback *before* save, and zero free-text where an enum exists.

### 2.1 Shared editor infrastructure
- **Data source:** both tabs fetch via admin GET endpoints (no static imports). Save → POST → refetch (no `window.location.reload()`).
- **Canonical pickers:** effect keys from `LIVE_EFFECT_KEYS` ∪ `executive_mood` with channel descriptions; relevance tags from `RELEVANCE_TAGS`; triggers from `HAPPENING_TYPES`; categories from `SIDE_EVENT_CATEGORIES`. Each with a one-line "what this does" blurb (authored once, in the tool).
- **Lint mirror, client-side, pre-save:**
  - **Hard block** (would break the game/suite): non-canonical effect key, non-canonical tag/trigger/category, category with no `event_weights` entry, empty choice list, duplicate ids, Zod shape failure, **and weakly-dominant choices** (fork C decided: hard block — mirrors `meeting-dominance.test.ts`'s exact value model incl. the variance-axis exclusion; the block banner names the dominating/dominated pair so the author can fix it). Tool output can never turn the suite red.
- **Effects legibility:** replace `CONNECTED_EFFECTS` with the canonical set; "orphaned ○" styling only for keys genuinely outside it.

### 2.2 Meetings tab (delta on the existing editor)
- `requires` editor: checkbox group over the 6 relevance tags, AND-semantics note ("meeting only offered when ALL are true; none checked = always eligible").
- `reactive_trigger` selector: none | one of the 4 happening types, with a "why-now" explainer and the note that reactive meetings jump the weighted draw when their trigger fired this week.
- "Add New Action" template updated accordingly (both fields default absent).
- Everything else (choice/effect CRUD, scope guide, icon/category pickers) kept as-is.

### 2.3 Side Events tab (new)
- Card list of all events (search box; category filter chips). Per event: `prompt`, `role_hint`, `category` (canonical picker showing that category's current weight), exactly-3-choices-not-enforced choice CRUD (schema allows any count ≥1; UI mirrors meetings), per-choice `label` + immediate/delayed effects with canonical pickers.
- Add / delete events (delete is safe: `side_event_history` keys by id; stale keys are ignored by the cooldown filter — verified in `sideEventSelection.ts:58`).
- **Read-only context strip:** `weekly_chance` 0.20 · `max_events_per_week` 1 · `event_cooldown` 2 · per-category weights — displayed for authoring context, NOT editable (feel knobs are explicitly untouched pending play; §6 fork B).
- `artist_personal` shows a "0 authored events — reserved for mood-driven content" note; the tab is exactly the authoring surface fork E anticipated.

### 2.4 Server (new endpoints + cache fix)
- `EventsConfigSchema` in `shared/api/contracts.ts` (version/generated/events, event schema deriving `category` from `SIDE_EVENT_CATEGORIES` — the RELEVANCE_TAGS one-source pattern; `.passthrough()` like ActionsConfig).
- `GET/POST /api/admin/events-config` in `server/routes/admin.ts`, mirroring the actions-config pattern: Zod validate → `.backup` → write.
- **Both POST handlers call `gameDataLoader.clearCache()`** after a successful write so a running dev server picks up saved content on the next request — closes the events-cache staleness (finding 5b) and is a no-op-but-future-proof for actions. (`tsx` has no watch, but no *server code* changes here — data re-reads suffice.)
- **Changelog (fork A decided: option 3).** Both POST handlers, after a successful write, compute a server-side id-level diff (old file was just read for the backup) and append an entry to `data/content-changelog.json`: `{ timestamp, file, added: [ids], modified: [ids], deleted: [ids] }`. Machine-readable, git-tracked; a later dev docs pass consumes it for the `[REFERENCE]`-doc sync and prunes consumed entries. The pairing rule is thereby satisfied at commit time without asking the copywriter to touch docs.
- Route-manifest snapshot delta expected and root-caused: exactly the two new admin routes.

### 2.5 Explicitly out of scope
- `dialogue.json` (artist dialogues) — different consumer, not in the session goal.
- Balance knobs editing (weights/chance/cooldown) — fork B, recommended read-only.
- Any engine/selection logic change. **Golden-master impact: zero by construction** (admin route + client only; no engine code touched; GM double-run per slice regardless, per house rules).

---

## 3. Slice plan (factory, one subagent per slice)

| # | Slice | Model | Contents |
|---|-------|-------|----------|
| 1 | Server + contracts | Sonnet 5 | `EventsConfigSchema`, GET/POST events-config, `clearCache()` on both POSTs, changelog writer (shared by both POSTs), endpoint + schema tests, route-manifest re-bless (root-caused) |
| 2 | Meetings tab modernization | Sonnet 5 | canonical effect whitelist + descriptions, `requires` + `reactive_trigger` editors, new-action template, client lint mirror (all hard blocks incl. dominance), GET-endpoint data source, tests |
| 3 | Side Events tab | Sonnet 5 | tab shell + events editor, category picker w/ weights context strip, event CRUD, lint mirror reuse, save flow, tests |

Each slice: tsc clean, full suite green incl. data-lint, GM double-run zero-delta, independently revertable. Suite baseline going in: 1,445.

---

## 4. Test plan
- Slice 1: events-config endpoint characterization (GET shape, POST happy/invalid/backup, cache-clear observable via a re-read), contracts schema unit tests.
- Slice 2/3: component tests for the lint mirror (each hard-block class + a dominance warn case), tag/trigger editors round-trip without dropping unknown fields, effect picker offers exactly the canonical set.
- Existing data-lint suites are the backstop and must stay green untouched.

## 5. Risks / notes
- The tool writes runtime files; **edits are not commits.** The working tree diff after a copywriter session is reviewed/committed by a dev (this is also where fork A's doc-sync lands).
- Production banner already exists (edits lost on deploy) — kept.
- `actions.json.backup` / new `events.json.backup` are single-generation; acceptable (git is the real history).

---

## 6. Product forks — DECIDED (Nes, July 6, 2026)

**A. [REFERENCE]-doc sync rule → option 3 (changelog).** The tool emits a machine-readable changelog (`data/content-changelog.json`, appended server-side on every successful save) that the dev docs pass consumes at commit time. Design in §2.4.
**B. Balance knobs → read-only** context strip (recommendation accepted); knob-editing rights remain a separate future decision.
**C. Dominance guard → hard block** at save (recommendation NOT taken — Nes chose the stricter gate): tool output can never turn the meeting-dominance suite red. Block banner names the dominating/dominated pair.
**D. Side-event add/delete → full CRUD** (recommendation accepted).
