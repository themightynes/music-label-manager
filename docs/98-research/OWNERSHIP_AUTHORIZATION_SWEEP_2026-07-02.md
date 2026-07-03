# Authorization / Game-Ownership Sweep — All Routers
**Date**: July 2, 2026 · **Reviewer**: Claude (read-only session) · **Branch reviewed**: `claude/onboarding-jira33`
**Scope**: Every HTTP route across all 16 feature routers + the `server/routes.ts` registry (84 handlers total). Verdict per route on whether it enforces that the caller owns the game/entity it touches. Prompted by finding B1 of the recording-session review (projects router had zero ownership checks). Findings below were located by audit agents and the high-severity ones independently re-verified in source.

## Resolution status (2026-07-02, same day)
All buckets below closed same day: CRITICAL (no-auth routes) → fixed in **#62**. HIGH mutations → releases in **#63**, artists in **#64**, projects in **#66**/**#68**, all remaining routers (gameLoop/games/executives/arOffice/analytics/tour/devTools) in **#69**. MEDIUM unowned reads → **#63**/**#69**. The two "correctly owned" reference patterns cited below are now unified behind the shared `requireGameOwner` middleware rather than ad hoc per-router checks.

## Executive summary
This is a **systemic broken-object-level-authorization (IDOR) problem, not an isolated bug.** `requireClerkUser` proves the caller is *a* logged-in user but performs **no game-ownership check**; there is **no shared ownership helper**; each router re-implements the check inline, and roughly half forget it. **~35 of 84 routes that touch game-scoped data do not verify ownership.** An authenticated attacker who knows (or guesses — they're UUIDs, but they leak via the client, saves, and error messages) another player's `gameId` can read and mutate that player's entire game: money, reputation, artists, projects, releases, executives, focus slots. Two routes need no authentication at all.

### The root cause (one paragraph)
`req.userId` is the internal DB user UUID set by `requireClerkUser` (`server/auth.ts:115`). Games link to users via `game_states.user_id`. The **storage layer is not user-scoped**: `getGameState(id)`, `updateGameState(id, patch)`, `getArtist(id)`, `updateArtist(id, patch)`, `createWeeklyAction`, `getExecutivesByGame(gameId)`, `getSongsByGame(gameId)`, etc. all take only an entity/game id. So any handler that calls them without first checking `gameState.userId === req.userId` (or scoping the query with `and(eq(gameStates.id, gameId), eq(gameStates.userId, userId))`) is exploitable. The correct pattern is fully present and copyable — `server/routes/emails.ts:46-57` (game-scoped) and `server/routes/releases.ts:751-781` (`PATCH /api/songs/:songId`, the entity→game→user walk) — it's just applied inconsistently.

## Severity buckets

### CRITICAL — no authentication at all (unauthenticated attacker)
| Route | File:line | Impact |
|---|---|---|
| `GET /api/debug/game/:gameId/revenue` | devTools.ts:171 | **Zero auth middleware** (verified). Anyone on the internet dumps any game's projects, songs, quality, revenue, metadata by gameId. TODO-flagged at :168 but live. |
| `POST /api/select-actions` | gameLoop.ts:406 | **Zero auth middleware** (verified). Anyone mutates any game's focus slots/flags via GameEngine, gameId from body. Marked orphaned/"delete in phase 2" at :404 but still mounted and reachable. |

### HIGH — authenticated, unowned MUTATION of money/resources/state
| Route | File:line | Impact |
|---|---|---|
| `PATCH /api/projects/:id` | projects.ts:195 | Raw `req.body` → `updateProject(id, body)`. Mass-assignment on **any** project: set `totalRevenue`, `stage`, `quality`, `budget`, even `gameId`. No game lookup at all. |
| `PATCH /api/artists/:id` | artists.ts:289 | Raw `req.body` → `updateArtist(id, body)`. Mass-assignment on any artist by id; no gameId, no ownership walk. |
| `PATCH /api/game/:id` | games.ts:56 | `updateGameState(id, req.body)` with no ownership check. Set any game's money/reputation/access tiers/flags to anything. |
| `POST /api/advance-week` | gameLoop.ts:38 | `gameId` from **body**; loads by id only (:47-50), no `userId`. Force-advances/simulates a victim's game, mutating its entire state. Highest blast radius. |
| `POST /api/game/:gameId/projects` | projects.ts:73 | Create projects on any game; drains victim money + creative capital (:159). |
| `DELETE /api/projects/:id/cancel` | projects.ts:205 | Cancel any tour; **client-supplied `refundAmount`** (:209, TODO C40) added to victim money (:240). |
| `POST /api/game/:gameId/releases/plan` | releases.ts:435 | `gameState` loaded by id only (:466). Deducts victim money + creative capital, reserves victim songs. |
| `DELETE /api/game/:gameId/releases/:releaseId` | releases.ts:843 | Deletes victim release, frees songs, refunds `marketingBudget` into victim money. |
| `POST /api/game/:gameId/releases` | releases.ts:126 | Create releases + release-song links on any game; body spread into createRelease. |
| `POST /api/game/:gameId/songs/clear-reservations` | releases.ts:810 | "Debug" route, live w/ only requireClerkUser: wipes all song→release reservations on any game. |
| `POST /api/game/:gameId/executive/:execId/action` | executives.ts:120 | Consumes victim focus slots / mutates victim game state; `execId` never validated against the game. |
| `POST /api/game/:gameId/artist-dialogue` | artists.ts:18 | Verifies artist∈game (:54) but never game∈user. Mutates victim artist stats + money/reputation/creativeCapital. |
| `POST /api/game/:gameId/artists` | artists.ts:165 | Sign artists into any game; deduct victim money, mutate flags. |
| `POST /api/game/:gameId/actions` | gameLoop.ts:20 | Inject arbitrary weekly actions into any game. |
| `POST /api/game/:gameId/label` | games.ts:194 | Create/overwrite any game's label; existence-only check. |
| `POST /api/game/:gameId/ar-office/start` | arOffice.ts:8 | Start A&R op / consume focus slots on any game. |
| `POST /api/game/:gameId/ar-office/cancel` | arOffice.ts:74 | Clear A&R state / free slots on any game. |
| `POST /api/dev/markets-config` | devTools.ts:244 | **Not per-game** but weak-auth (TODO-flagged): any authenticated user overwrites the global `data/balance/markets.json` economy config on disk. Should be `requireAdmin`. |

### MEDIUM — authenticated, unowned READ (cross-user info disclosure, no mutation)
| Route | File:line |
|---|---|
| `GET /api/game/:id` (full game graph) | games.ts:14 |
| `GET /api/analytics/artist\|project\|release\|portfolio ROI` (all 4) | analytics.ts:16, 40, 64, 88 |
| `GET /api/game/:gameId/songs` / `.../artists/:artistId/songs` / `.../releases` / `.../artists/ready-for-release` / `.../songs/ready` / `.../songs/conflicts` | releases.ts:16, 26, 97, 158, 219, 671 |
| `POST /api/game/:gameId/releases/preview` (leaks economy preview) | releases.ts:314 |
| `GET /api/game/:gameId/executives` | executives.ts:104 |
| `GET /api/game/:gameId/ar-office/status` / `.../artists` (latter can also write fallback flags) | arOffice.ts:111, 129 |
| `POST /api/tour/estimate` (leaks victim money/reputation/venueAccess) | tour.ts:10 |
| `POST /api/game/:gameId/test/streaming-decay` (leaks currentWeek only) | devTools.ts:270 |

### Correctly OWNED (reference implementations — copy these)
- **All of `emails.ts`** (4 routes): `and(eq(gameStates.id, gameId), eq(gameStates.userId, userId))` → 403 (emails.ts:46-57).
- **All of `saves.ts`** (5 routes): via user-scoped storage methods (`getGameSaveForUser`, `deleteGameSave(id, userId)`, forced `userId: req.userId` on create/restore).
- **Both `charts.ts`** routes; `GET /api/games`, `GET /api/game-state`, `DELETE /api/game/:gameId`, `POST /api/game` (owner set server-side), `GET /api/game/:gameId/mood-events` (games.ts / artists.ts).
- **`PATCH /api/songs/:songId`** (releases.ts:720): the model entity-id walk — song→gameId→`userId` check + field-limited update (only `title`). **`GET /api/game/:gameId/release-songs`** (releases.ts:106).

### N/A by design (no game-scoped data)
Static content/config: all of `content.ts`, `executives.ts` role/dialogue GETs, `content.ts`/`executives.ts` public no-auth static routes, `projects.ts` `POST /api/budget-calculation` (stateless calc), devTools diagnostics, `GET /api/game/:gameId/balance` (gameId ignored, returns global config). Admin-gated (`requireAdmin`): all of `admin.ts`, the `bugReports.ts` GET/PATCH management routes. Own-identity only: `GET /api/me`. Signature-verified: `POST /api/webhooks/clerk`. Public: `GET /api/health`.

## Notable secondary issues surfaced during the sweep
- **`gameId` trusted from request body** (not URL param) in `POST /api/advance-week` and `POST /api/select-actions` (gameLoop.ts). Even after ownership checks are added, prefer param + ownership over body-supplied id.
- **Mass-assignment** compounds the mutation IDORs: `PATCH /api/projects/:id`, `PATCH /api/artists/:id`, `PATCH /api/game/:id`, `POST .../releases`, `POST .../projects` all spread raw `req.body` into storage writes. Ownership fixes should pair with field whitelists (as `PATCH /api/songs/:songId` already does).
- **`requireAdmin` depends on an upstream `requireClerkUser`** to have set `req.clerkUserId` (auth.ts:183-204 doesn't call it itself). All current admin routes chain both, so it's fine today, but a future admin route that forgets `requireClerkUser` would silently fail open/closed depending on `req.auth` presence — worth a defensive guard.
- **No auth middleware on static routes is intentional** (`content.ts` catalog, `executives.ts` dialogue) but undocumented; a one-line comment per route would prevent a future dev copying the pattern onto a stateful route.

## Recommended fix (single structural change kills most of the class)
1. **Add a shared `requireGameOwner` middleware + `getGameStateForUser(gameId, userId)` storage method.** `requireGameOwner` reads `gameId` from `req.params` (fallback body), loads the game scoped by `req.userId`, 403s if not found, and stashes it on `req.gameState` so handlers reuse it. Apply to every route with `:gameId` in its path. This is the emails.ts check, promoted to middleware.
2. **For entity-id routes without a gameId** (`PATCH /api/projects/:id`, `PATCH /api/artists/:id`, `DELETE /api/projects/:id/cancel`): walk entity→gameId→user like `PATCH /api/songs/:songId` already does. Consider adding `gameId` to their paths for consistency.
3. **Whitelist mutable fields** on every PATCH/POST that currently spreads `req.body` (pair with the ownership fix, not after).
4. **Delete or auth-gate the two zero-auth routes**: `GET /api/debug/game/:gameId/revenue` and `POST /api/select-actions` (both already TODO-flagged for deletion). Admin-gate `POST /api/dev/markets-config`.
5. **Server-side recompute money deltas** (`refundAmount`, `totalCost`) rather than trusting the client — overlaps with recording-review B2 and backlog C40.

### Suggested execution order (each characterization-test-first, per Phase-1 convention)
1. Kill the two zero-auth routes (CRITICAL, trivial). Admin-gate markets-config write.
2. Introduce `requireGameOwner` + `getGameStateForUser`; migrate the HIGH mutation routes first (projects, releases plan/delete/clear-reservations, gameLoop advance-week/actions, artists dialogue/sign, games PATCH/label, executives action, arOffice start/cancel), adding field whitelists as you go.
3. Migrate the MEDIUM read routes (analytics ×4, releases reads, tour estimate, arOffice status/artists, executives list).
4. Backfill HTTP-layer tests asserting 403 cross-tenant for each migrated route (the suite currently has none — the route-manifest snapshot wouldn't catch a dropped ownership check, same gap that let recording-review B1 ship).

## Counts
84 handlers audited (81 router + webhook/health/me). ~35 touch game data without ownership enforcement: **2 zero-auth**, ~19 unowned mutations, ~14 unowned reads. ~18 correctly owned; the remainder are static/admin/identity N/A.

*Environment note: `npm run check` fails in this container only because `node_modules` isn't installed; no code was changed or compiled. Line numbers are against the reviewed branch HEAD.*
