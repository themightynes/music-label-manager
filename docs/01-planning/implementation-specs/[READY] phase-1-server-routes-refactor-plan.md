# [READY] Phase 1: Split `server/routes.ts` into Feature Routers + Service Layer

*Created: July 1, 2026 — planned by a code-reading architect pass against the live tree.*
*Status: READY — execution gated on merge order: PR #38 (vitest CI) → #36 → #37 → start Phase 1.*
*Part of the four-phase scaling arc (Phase 0: CI safety net · Phase 1: server seams · Phase 2: engine seams · Phase 3: client state ownership · Phase 4: game feel).*

## 0. Ground truth (verified against the working tree)

- `server/routes.ts` is **5,341 lines** with **85 route registrations + 1 router mount** (`/api/analytics`).
- A router/service convention **already exists**: `server/routes/analytics.ts` (default-exports an Express `Router`) + `server/services/AnalyticsService.ts` (class + exported singleton), mounted via `app.use('/api/analytics', requireClerkUser, analyticsRouter)`. Phase 1 follows this convention with one deliberate deviation (full-path routers, §3).
- **Closure risk is small**: `registerRoutes(app)` contains exactly **one** closure-scoped shared helper — `validateSnapshotCollections` (lines 73–123), used only by the restore handler. Everything else handlers share is already module-level imports (`storage`, `db`, `serverGameData`, schema tables, auth middleware). Handler-local helpers move verbatim with their handlers.
- **Critical test finding**: the vitest suite contains **zero HTTP-layer tests**. No supertest, no `registerRoutes` import anywhere in `tests/`. Files named like endpoint tests replicate the handler's DB queries directly. The suite guards engine/storage logic, **not route wiring** — it stays green even if a route is dropped or its middleware chain is lost during a move. **Phase 1 must add a route-manifest characterization test before any move (PR-1).**
- Open PRs at planning time: **#36** (chore, touches `package.json`), **#37** `fix/starting-money-difficulty` (touches `POST /api/game` lines ~512–565 + one import), **#38** `ci/vitest-suite-in-ci`. **Merge order prerequisite: #38 first (CI guards every Phase 1 PR), then #37 (it edits the exact lines PR-13/PR-15 touch), then start Phase 1.** If #37 stalls, everything except PR-13 (games router) and PR-15 (gameCreationService) can proceed.

## 1. Route inventory

Line numbers from the tree at planning time; #37 shifts lines below ~560 by ~+9.

### System / auth identity → stays in thin `routes.ts` (or tiny `server/routes/system.ts`)
| Method & Path | Lines | Auth | Notes |
|---|---|---|---|
| POST `/api/webhooks/clerk` | 126 | none (Svix-verified) | Handler from `./auth`; depends on `rawBody` capture in `server/index.ts` (unaffected) |
| GET `/api/health` | 129–131 | none | Trivial |
| GET `/api/me` | 299–321 | `ClerkExpressWithAuth()` (optional auth) | Uses `clerkClient` directly |

### Emails → `server/routes/emails.ts` (PR-4)
| Method & Path | Lines | Auth | Notes |
|---|---|---|---|
| GET `/api/game/:gameId/emails` | 134–184 | requireClerkUser | Uses module-level `emailQuerySchema` (lines 50–65) |
| GET `/api/game/:gameId/emails/unread-count` | 186–219 | requireClerkUser | |
| PATCH `/api/game/:gameId/emails/:emailId/read` | 221–261 | requireClerkUser | Uses `markEmailReadSchema` (67–69) |
| DELETE `/api/game/:gameId/emails/:emailId` | 263–297 | requireClerkUser | |

### Game lifecycle → `server/routes/games.ts` (PR-13, after #37)
| Method & Path | Lines | Auth | Notes |
|---|---|---|---|
| GET `/api/game/:id` | 483–510 | requireClerkUser | Aggregates storage + `serverGameData.getReleasesByGame` |
| POST `/api/game` | 512–623 | requireClerkUser | **FAT**: label creation in `db.transaction`, executive seeding, access-tier derivation via inline `pickTier`, dead `defaultRoles` array (598–607, never persisted). #37 adds difficulty here. → `gameCreationService` (PR-15) |
| PATCH `/api/game/:id` | 625–644 | requireClerkUser | Thin |
| GET `/api/games` | 647–669 | requireClerkUser | Direct drizzle query |
| DELETE `/api/game/:gameId` | 701–760 | requireClerkUser | Manual `gameSaves` JSON-path delete + CASCADE |
| POST `/api/game/:gameId/label` | 763–816 | requireClerkUser | `labelRequestSchema` |
| GET `/api/game-state` | 3809–3887 | requireClerkUser | **Legacy**: auto-creates a game; **duplicates** `pickTier` from POST `/api/game` (3847–3856). Keep behavior; dedupe only in PR-15 |

### A&R Office → `server/routes/arOffice.ts` (PR-7)
| Method & Path | Lines | Auth |
|---|---|---|
| POST `/api/game/:gameId/ar-office/start` | 832–894 | requireClerkUser |
| POST `/api/game/:gameId/ar-office/cancel` | 898–932 | requireClerkUser |
| GET `/api/game/:gameId/ar-office/status` | 935–950 | requireClerkUser |
| GET `/api/game/:gameId/ar-office/artists` | 953–1233 | requireClerkUser (280 lines of flags-migration/fallback logic — service candidate, Phase 2) |

### Roles / executives / dialogue → `server/routes/executives.ts` (PR-8)
| Method & Path | Lines | Auth | Notes |
|---|---|---|---|
| GET `/api/roles/:roleId` | 1270–1323 | requireClerkUser | Uses `seededRandomPick`/`generateMeetingSeed` |
| GET `/api/roles/:roleId/meetings/:meetingId` | 1327–1360 | requireClerkUser | |
| GET `/api/game/:gameId/executives` | 1363–1376 | requireClerkUser | |
| POST `/api/game/:gameId/executive/:execId/action` | 1379–1444 | requireClerkUser | Focus-slot mutation |
| GET `/api/dialogue/:roleType` | 2649–2660 | **none** | Legacy |
| GET `/api/dialogue-scenes` | 2663–2677 | **none** | Uses `gameDataLoader` directly |

### Static content/config → `server/routes/content.ts` (PR-6)
| Method & Path | Lines | Auth | Notes |
|---|---|---|---|
| GET `/api/artists/available` | 819–828 | **none** | JSON content |
| GET `/api/actions/weekly` | 1236–1265 | requireClerkUser | |
| GET `/api/project-types` | 1597–1606 | requireClerkUser | |
| GET `/api/artists/:archetype/dialogue` | 2639–2646 | **none** | |
| GET `/api/events` | 2680–2687 | **none** | |
| GET `/api/game/:gameId/balance` | 5323–5334 | requireClerkUser | `gameId` unused in handler |

### Artists (state) → `server/routes/artists.ts` (PR-9)
| Method & Path | Lines | Auth | Notes |
|---|---|---|---|
| POST `/api/game/:gameId/artists` | 1670–1792 | requireClerkUser | **FAT**: funds check, dup-name check, money deduction, `pending_signing_fees` flags, A&R pool cleanup, welcome email → `artistService` (PR-18) |
| PATCH `/api/artists/:id` | 1794–1801 | requireClerkUser | Thin (no ownership check — preserve as-is) |
| POST `/api/game/:gameId/artist-dialogue` | 1450–1594 | requireClerkUser | Uses `ArtistDialogueRequestSchema` from `@shared/api/contracts` |
| GET `/api/game/:gameId/mood-events` | 2948–2965 | requireClerkUser | |

### Projects → `server/routes/projects.ts` (PR-10)
| Method & Path | Lines | Auth | Notes |
|---|---|---|---|
| POST `/api/budget-calculation` | 1609–1667 | requireClerkUser | Instantiates `FinancialSystem` per request |
| POST `/api/game/:gameId/projects` | 1804–1924 | requireClerkUser | Budget validation, money + creative-capital deduction |
| PATCH `/api/projects/:id` | 1926–1933 | requireClerkUser | Thin |
| DELETE `/api/projects/:id/cancel` | 1936–1986 | requireClerkUser | Tour cancellation + refund |

### Saves → `server/routes/saves.ts` (PR-14)
| Method & Path | Lines | Auth | Notes |
|---|---|---|---|
| GET `/api/saves` | 2010–2018 | requireClerkUser | |
| GET `/api/saves/:saveId` | 2020–2036 | requireClerkUser | |
| POST `/api/saves` | 2038–2070 | requireClerkUser | Autosave purge (keep-3) |
| POST `/api/saves/:saveId/restore` | 2072–2607 | requireClerkUser | **FAT (535 lines)**: `SNAPSHOT_VERSION` check, closure helper `validateSnapshotCollections`, handler-local `convertTimestamps` + `restoreRequestSchema`, overwrite mode (delete-and-reinsert 11 tables in one transaction) and fork mode (`idMap`/`randomUUID` remapping) → `saveService` (PR-16) |
| DELETE `/api/saves/:saveId` | 2609–2636 | requireClerkUser | |

### Songs & Releases → `server/routes/releases.ts` (PR-12)
| Method & Path | Lines | Auth | Notes |
|---|---|---|---|
| GET `/api/game/:gameId/songs` | 2692–2699 | requireClerkUser | |
| GET `/api/game/:gameId/artists/:artistId/songs` | 2702–2770 | requireClerkUser | Instantiates `ChartService` |
| GET `/api/game/:gameId/releases` | 2920–2927 | requireClerkUser | |
| GET `/api/game/:gameId/release-songs` | 2929–2946 | requireClerkUser | |
| POST `/api/game/:gameId/releases` | 2968–2995 | requireClerkUser | Legacy direct create |
| GET `/api/game/:gameId/artists/ready-for-release` | 3000–3058 | requireClerkUser | Has query-level test |
| GET `/api/game/:gameId/artists/:artistId/songs/ready` | 3061–3154 | requireClerkUser | |
| POST `/api/game/:gameId/releases/preview` | 3156–3274 | requireClerkUser | Instantiates `GameEngine` for preview |
| POST `/api/game/:gameId/releases/plan` | 3277–3508 | requireClerkUser | **FAT**: funds/creative-capital checks, conflict detection, transaction → `releasePlanningService` (PR-17) |
| GET `/api/game/:gameId/songs/conflicts` | 3569–3615 | requireClerkUser | |
| PATCH `/api/songs/:songId` | 3618–3705 | requireClerkUser | Ownership via song→game→user chain |
| POST `/api/game/:gameId/songs/clear-reservations` | 3708–3737 | requireClerkUser | Debug-ish but player-reachable |
| DELETE `/api/game/:gameId/releases/:releaseId` | 3741–3804 | requireClerkUser | Transaction: free songs + refund + delete |

### Charts → `server/routes/charts.ts` (PR-11)
| Method & Path | Lines | Auth |
|---|---|---|
| GET `/api/game/:gameId/charts/top10` | 2773–2830 | requireClerkUser |
| GET `/api/game/:gameId/charts/top100` | 2833–2917 | requireClerkUser |

### Tour → `server/routes/tour.ts` (PR-11)
| Method & Path | Lines | Auth | Notes |
|---|---|---|---|
| POST `/api/tour/estimate` | 3890–4006 | requireClerkUser | `FinancialSystem` + `VenueCapacityManager` |

### Game loop → `server/routes/gameLoop.ts` (PR-14)
| Method & Path | Lines | Auth | Notes |
|---|---|---|---|
| POST `/api/game/:gameId/actions` | 1989–2004 | requireClerkUser | Thin |
| POST `/api/advance-week` | 4009–4373 | requireClerkUser | **FAT but engine-orchestration**: two transactions, `GameEngine.advanceWeek(actions, tx)`, weekly-action persistence. Service extraction = Phase 2 |
| POST `/api/select-actions` | 4376–4453 | **NONE — known orphaned** | No auth; instantiates `GameEngine` then discards it. Move as-is with `// TODO(phase-2): orphaned endpoint, no client callers, no auth — delete`. Do NOT delete or add auth in Phase 1 |

### Bug reports → `server/routes/bugReports.ts` (PR-2)
| Method & Path | Lines | Auth |
|---|---|---|
| POST `/api/bug-reports` | 4455–4521 | requireClerkUser |
| GET `/api/bug-reports` | 4523–4576 | requireClerkUser + requireAdmin |
| PATCH `/api/bug-reports/:id/status` | 4578–4622 | requireClerkUser + requireAdmin |
| GET `/api/bug-reports/stats` | 4625–4633 | requireClerkUser + requireAdmin |
| GET `/api/bug-reports/archives` | 4636–4644 | requireClerkUser + requireAdmin |
| GET `/api/bug-reports/archives/:fileName` | 4647–4662 | requireClerkUser + requireAdmin |

Self-contained: fs/path + `@shared/api/contracts` + `server/utils/bugReportArchival.ts`.

### Admin → `server/routes/admin.ts` (PR-3)
| Method & Path | Lines | Auth |
|---|---|---|
| GET `/api/admin/health` | 324–326 | requireClerkUser + requireAdmin |
| GET `/api/admin/actions-config` | 4703–4713 | requireClerkUser + requireAdmin |
| POST `/api/admin/actions-config` | 4715–4764 | requireClerkUser + requireAdmin |
| GET `/api/admin/database-stats` | 4767–4858 | requireClerkUser + requireAdmin |
| POST `/api/admin/cleanup-orphaned-games` | 4861–4967 | requireClerkUser + requireAdmin |

### Dev/debug/test tools → `server/routes/devTools.ts` (PR-5)
| Method & Path | Lines | Auth | Notes |
|---|---|---|---|
| GET `/api/debug/data-load` | 329–396 | requireClerkUser | |
| GET `/api/test-data` | 399–432 | requireClerkUser | |
| GET `/api/validate-types` | 434–480 | requireClerkUser | |
| GET `/api/debug/game/:gameId/revenue` | 3512–3566 | **none** — flag with TODO, don't change | |
| GET `/api/dev/markets-config` | 4665–4675 | requireClerkUser (not admin!) | |
| POST `/api/dev/markets-config` | 4677–4700 | requireClerkUser (not admin — preserve, TODO-flag) | Writes to `data/balance/markets.json` |
| POST `/api/game/:gameId/test/streaming-decay` | 4970–5320 | requireClerkUser | 350 lines of inline simulation math — moves verbatim |

### Already extracted
`app.use('/api/analytics', requireClerkUser, analyticsRouter)` at line 5337 → `server/routes/analytics.ts`.

## 2. Module-scope risk analysis

| Shared item | Where defined | Strategy |
|---|---|---|
| `storage` (DatabaseStorage singleton) | `server/storage.ts:1093` | Already an importable singleton — routers import directly. No DI needed |
| `db` + drizzle operators | `server/db.ts`, `drizzle-orm` | Direct import per router |
| `serverGameData` singleton | `server/data/gameData.ts:1146` | Direct import. Keep the sprinkled idempotent `initialize()` calls verbatim (removing them is a behavior change) |
| `requireClerkUser`, `requireAdmin`, `handleClerkWebhook` | `server/auth.ts` | Direct import. `Express.Request` augmentation (`userId`, `clerkUserId`, `rawBody`) is `declare global` in `auth.ts:206` — no per-file work |
| Schema tables + insert schemas | `@shared/schema` | Each router imports only what it touches |
| Contract schemas | `@shared/api/contracts` | Direct import per router |
| `validateSnapshotCollections` (the only true closure-shared helper) | `routes.ts:73–123` | Moves to module scope in `server/routes/saves.ts` (PR-14); into `saveService` in PR-16 |
| Email zod schemas (lines 50–69) | routes.ts module scope | Move into `server/routes/emails.ts` (PR-4) |
| `pickTier` tier derivation | duplicated inline at 538–545 and 3847–3856 | Both handlers land in `games.ts`; keep duplication during the move; dedupe into `gameCreationService.deriveInitialAccessTiers()` in PR-15 |
| Handler-local helpers (`convertTimestamps`, `restoreRequestSchema`, `clamp`, `calculateRealisticStreams`, `calculateAwarenessGain`, `mapId`/`idMap`) | inside individual handlers | Move verbatim with the handler — zero risk |
| Engine classes (`GameEngine`, `ChartService`, `FinancialSystem`, `VenueCapacityManager`) | `shared/engine/*` | Direct import. Prefer `@shared/engine/…` alias in new files; `Song` import appears unused — drop in PR-2 if tsc confirms |
| `db.transaction` pattern | — | No shared abstraction needed in Phase 1; services take tx-compatible code with them unchanged |
| `httpServer = createServer(app)` / return type | routes.ts:5339 | Stays in thin `routes.ts`; **do not change the `registerRoutes` signature** |

**Ordering hazard check (done)**: Express matches in registration order; every same-prefix pair across domains was checked (`/api/artists/available` vs `PATCH /api/artists/:id`; `ready-for-release` vs `:artistId/songs`; `bug-reports/stats|archives` vs `:id/status`; `/api/game-state` vs `/api/game/:id`) — **no ambiguous overlaps exist**. Belt-and-braces rule anyway: each extracted router is mounted at the exact position in `registerRoutes` where its first endpoint previously sat, preserving global registration order. The route-manifest test (PR-1) locks this.

## 3. Proposed file structure

```
server/
  routes.ts                    # shrinks each PR; ends ~120 lines: registerRoutes() mounting routers in original order + createServer
  routes/
    analytics.ts               # exists — untouched
    emails.ts                  # PR-4
    bugReports.ts              # PR-2
    admin.ts                   # PR-3
    devTools.ts                # PR-5
    content.ts                 # PR-6
    arOffice.ts                # PR-7
    executives.ts              # PR-8
    artists.ts                 # PR-9
    projects.ts                # PR-10
    charts.ts                  # PR-11
    tour.ts                    # PR-11
    releases.ts                # PR-12
    games.ts                   # PR-13 (after #37)
    saves.ts                   # PR-14
    gameLoop.ts                # PR-14
  services/
    AnalyticsService.ts        # exists — untouched
    gameCreationService.ts     # PR-15
    saveService.ts             # PR-16
    releasePlanningService.ts  # PR-17
    artistService.ts           # PR-18
tests/
  endpoints/
    route-manifest.test.ts     # PR-1 — the safety net
    game-creation.characterization.test.ts  # PR-15 (written first, against old code)
```

**Router template — full-path routers, mounted bare** (deliberate deviation from analytics.ts):

```ts
// server/routes/emails.ts
import { Router } from 'express';
import { requireClerkUser } from '../auth';
const router = Router();
router.get('/api/game/:gameId/emails', requireClerkUser, async (req, res) => { /* moved verbatim */ });
export default router;

// routes.ts, at the old location of the section:
app.use(emailsRouter);
```

Rationale: domains don't share clean prefixes (games spans `/api/game`, `/api/games`, `/api/game-state`; releases spans `/api/game/:gameId/*` and `/api/songs/:songId`), prefix-mounting would require path rewrites + `mergeParams: true` (a silent-`req.params`-loss hazard), and mixed auth makes mount-level middleware wrong for most routers. Full paths keep every diff a pure cut-paste. Prefix normalization is Phase 2 material if desired.

**Service convention** (follow `AnalyticsService.ts`): class with explicit deps in constructor defaulting to the singletons, plus exported instance. Routes keep validating/authorizing and call the service.

## 4. PR sequence

Every PR: branch from `main`, single concern, verify with:
1. `npm run check`
2. `npm run test:db:start` → `npm run test:run` (541+ tests; CI runs this too once #38 merges)
3. Route-manifest test proves no route/middleware was lost (from PR-1 on)
4. Manual smoke where the domain has zero coverage (noted per PR)
5. `npm run dev` boots and `GET /api/health` returns 200

**PR-0 (prerequisite, not Phase 1 work): merge #38 (CI), then #36, then #37.**

| # | PR | Scope | Risk | Verification notes |
|---|---|---|---|---|
| 1 | `test: route-manifest characterization for registerRoutes` | ✅ **Done.** Test builds an `express()` app, calls `registerRoutes(app)`, walks `app._router.stack` (recursing into mounted routers), and locks the sorted `{method, path, middleware[]}` manifest in a vitest snapshot (84 entries; 70× requireClerkUser, 10× requireAdmin) plus hard assertions on admin routes and the game-mutating core loop. Deviations from original plan: snapshot file instead of inline manifest (same guarantee, no transcription risk); `supertest` + `tests/helpers/test-app.ts` deferred to PR-15, the first PR that issues HTTP requests (`vi.mock` hoisting makes a shared mock helper awkward to pre-build). Note: analytics routes show empty per-route middleware because their `requireClerkUser` is mount-level — stable and still snapshot-guarded. The test force-sets `DATABASE_URL` to the test-DB URL before dynamically importing routes.ts, so no production-pointed pool is ever created | Low | Done |
| 2 | `refactor: extract bug-reports router` | Pure move of 6 endpoints → `bugReports.ts`. Drop unused `Song` import if tsc confirms | Low | Zero test coverage → smoke: submit report, list as admin |
| 3 | `refactor: extract admin router` | 5 admin endpoints → `admin.ts` | Low | `cleanup-orphaned-games.test.ts` covers query logic; smoke `/api/admin/health` |
| 4 | `refactor: extract emails router` | 4 endpoints + module-level email schemas (lines 50–69) → `emails.ts` | Low | Storage layer covered; smoke: inbox, mark read |
| 5 | `refactor: extract dev-tools router` | 7 endpoints → `devTools.ts`. TODO-comment (no behavior change) the no-auth debug revenue + non-admin markets-config | Low | Dev-only surface; smoke `GET /api/debug/data-load` |
| 6 | `refactor: extract content router` | 6 endpoints → `content.ts`. Preserve no-auth status of public content endpoints | Low | Smoke: artist discovery screen loads |
| 7 | `refactor: extract A&R office router` | 4 endpoints incl. the 280-line artists handler, verbatim | Medium | Client-machine test only → smoke: start op, advance week, view discovered, cancel |
| 8 | `refactor: extract executives/roles router` | 6 endpoints → `executives.ts` (imports `seededRandomPick`, `generateMeetingSeed`) | Low | Smoke: open meeting, make a choice |
| 9 | `refactor: extract artists router` | sign-artist, PATCH artist, artist-dialogue, mood-events → `artists.ts` | Medium | Engine-side mood tests exist; smoke: sign artist (money deduction + welcome email) |
| 10 | `refactor: extract projects router` | budget-calculation, POST/PATCH projects, cancel → `projects.ts` | Low-Med | No POST coverage → smoke: create Single with budget slider, cancel tour |
| 11 | `refactor: extract charts + tour routers` | `charts.ts` (top10/top100) + `tour.ts` (estimate), one PR | Low | Unit tests guard the math; smoke: Top 10 page, tour estimator |
| 12 | `refactor: extract songs/releases router` | 13 endpoints (~900 lines) → `releases.ts`, pure move | Medium | Query-level test exists; smoke: full plan-release flow incl. preview |
| 13 | `refactor: extract games router` — **after #37 merges; rebase over it** | 7 endpoints → `games.ts`, carrying #37's difficulty code verbatim | Medium | POST /api/game has zero coverage → smoke: new game end-to-end (label modal → 4 executives, correct starting money) |
| 14 | `refactor: extract saves + gameLoop routers` | `saves.ts` (5 endpoints + `validateSnapshotCollections` to module scope) + `gameLoop.ts` (actions, advance-week, select-actions w/ orphan TODO). routes.ts is now thin | Med-High | Best-covered domain (snapshot-integrity, email-system, spine test from #38, advance-week integration) + smoke: save, restore (overwrite + fork), advance week |
| 15 | `feat(refactor): gameCreationService` — first logic extraction | Write `game-creation.characterization.test.ts` FIRST (supertest + mocked auth, real test DB): balance-config money×difficulty, derived tiers, label, exactly 4 executives (`head_ar`,`cmo`,`cco`,`head_distribution` @ 1/50/50), `flags.difficulty`, Zod-400. Then extract `gameCreationService.createGame(userId, body)` + `deriveInitialAccessTiers(reputation)`; handler becomes validate→call→respond. Reuse `deriveInitialAccessTiers` in GET `/api/game-state` (removes `pickTier` duplication — logic-identical, verified). Keep dead `defaultRoles` out with a TODO note; response shape byte-equivalent | Medium | Characterization test green before AND after the swap; manual new-game smoke |
| 16 | `feat(refactor): saveService` | `createSave`, `restoreOverwrite`, `restoreFork`, `deleteSave`; `validateSnapshotCollections` + `convertTimestamps` become private. Routes keep status-code mapping (service throws coded errors matching the existing `error.code = 'INVALID_SNAPSHOT_COLLECTIONS'` pattern) | Med-High | Strongest test cluster guards it; add restore-fork characterization if time allows |
| 17 | `feat(refactor): releasePlanningService` | Plan-release transaction + conflict checks; optionally preview orchestration | Medium | Add characterization for POST plan (409 conflict + 402 funds paths) before extracting |
| 18 | `feat(refactor): artistService` | Sign-artist logic (funds, dup check, flags bookkeeping, welcome email) | Medium | Characterization first (409 duplicate, 400 insufficient funds, email row created) |

PRs 2–12 are order-independent among themselves; 13 gates on #37; 15 gates on 13; 16 gates on 14. Deliberately deferred to Phase 2: advance-week orchestration (engine boundary), the A&R discovered-artists handler, tour estimate, GET `/api/game-state` auto-creation removal.

## 5. Test-coverage map

| Domain | Existing coverage (all logic-level, none HTTP) | Route-move safety |
|---|---|---|
| Saves/restore | **Strong**: snapshot-integrity, email-system, spine test (#38) | Good logic net; manifest covers wiring |
| Advance-week | **Strong**: advance-week integration, mood suite (8 files), action-validation | Engine guarded |
| Game deletion / orphan cleanup | Query-level replicas | OK |
| Ready-for-release | Query-level | OK |
| Charts | Pure-function unit tests | Math guarded |
| Tour/financial | 3 unit files | Math guarded |
| Tier unlocks | `tests/task-0001/*` | OK |
| **Game creation (POST /api/game)** | **None** (only #37's multiplier unit test) | **Characterization test required before PR-15** |
| **Emails HTTP, executives, projects, releases plan/preview, artist signing, A&R, bug reports, admin config, dev tools, tour endpoint, select-actions** | **None at any level** | Pure moves rely on manifest test + per-PR manual smoke; characterization tests added just-in-time before service extractions (PRs 17–18) |

Blanket mitigation: PR-1's route-manifest test converts "did the move drop a route or its auth middleware?" into a CI assertion for all 15 move PRs.

## 6. Explicit non-goals for Phase 1

- **No behavior changes**: response shapes, status codes, log lines (even the emoji `console.error`s), redundant `initialize()` calls, and the duplicated-then-deduped `pickTier` stay byte-equivalent except where a PR explicitly says otherwise.
- **No endpoint renames or path normalization** (`/api/game` vs `/api/games` inconsistency stays; no prefix-mounted routers).
- **No auth hardening**: `POST /api/select-actions`, `GET /api/debug/game/:gameId/revenue`, `POST /api/dev/markets-config` keep their current weak auth, flagged with TODO comments only. Fixing these is a deliberate, separately-reviewed change.
- **No deletion of orphaned/dead code**: `select-actions` and the `defaultRoles` block move verbatim with TODO markers; removal is Phase 2.
- **No engine refactoring** (Phase 2), **no schema/migration changes**, **no `storage.ts` interface changes**, **no client changes** — `client/src` never appears in a Phase 1 diff.

## Critical files

- `server/routes.ts` — the file being decomposed; every PR touches it
- `server/routes/analytics.ts` — existing router convention (with the full-path deviation)
- `server/auth.ts` — middleware + global `Express.Request` augmentation every router relies on
- `server/services/AnalyticsService.ts` — service-layer convention for PRs 15–18
- `tests/helpers/test-db.ts` — harness the new manifest/characterization tests build on
