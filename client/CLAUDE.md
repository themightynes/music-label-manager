# Client Directory - Frontend Rules

## Critical API Rules
- **Always use `apiRequest()` from `lib/queryClient.ts`** - Attaches Clerk JWT tokens automatically
- Never manually add Authorization headers - `apiRequest()` handles it
- All backend calls must route through `apiRequest()` or TanStack Query's `queryClient`

## State Management (Phase 3.5 ownership model — final, PR-7)
- **TanStack Query owns EVERYTHING server-shaped**, including the `gameState` spine. Two kinds of cache-owned data:
  - **Server collections** (Phase 3): `songs`, `releases`, `releaseSongs`, `projects`, `artists`, `discoveredArtists`, `executives`, `charts`, `emails`, analytics — read via the domain hooks in `hooks/` (`useSongs`, `useReleases`, `useProjects`, `useArtists`, `useDiscoveredArtists`, `useExecutives`, `useCharts`, `useEmails`, `useAnalytics`). The store fan-out seeds these caches (`setQueryData`, zero extra requests); mutations invalidate them.
  - **The `gameState` spine** (Phase 3.5): week, money, reputation, creativeCapital, focusSlots, access tiers, flags, A&R fields, embedded `musicLabel`. Lives at `['gameState:record', gameId]` (`gameStateQueryKey(gameId)` in `hooks/useGameState.ts`) as a **client-committed record**: `staleTime`/`gcTime: Infinity`, no focus/mount/reconnect refetch. The ONLY writer is `gameStore.ts`'s internal `commitGameState(set, next, previousGameId?)` funnel — every one of the store's 12 spine-writing paths (`loadGame`, `loadGameFromSave`, `createNewGame`, `selectAction`, `removeAction`, `clearActions`, `advanceWeek`, `cancelProject`, `consumeAROfficeSlot`, `releaseAROfficeSlot`, `adoptServerBalances`, `adoptServerSideEventResolution` (Tier 2 PR-4, backing the `resolveSideEvent` action)) goes through it. Do NOT add these arrays, or ad-hoc spine fields, back onto the Zustand store.
- **Zustand Store** (`store/gameStore.ts`): owns session/UI state ONLY — `selectedActions`, `isAdvancingWeek`, `weeklyOutcome`, `campaignResults` — plus a **minimal session pointer** `gameState: { id } | null` (NOT the spine; just the id that tells the cache which record to read). Internal store code never reads `get().gameState` for spine fields directly — it calls the module-private `readGameState(get)` helper, which resolves the id from the pointer and pulls the full record out of the query cache (`queryClient.getQueryData(gameStateQueryKey(id))`).
- **The façade rule — read via `useGameState()`/`useGameId()`, never `useGameStore` for spine fields.** `hooks/useGameState.ts` exports:
  - `useGameState()` / `useGameState(selector)` — the spine read path. Subscribes to the QueryCache directly via `useSyncExternalStore` (NOT plain `useQuery`) so that a `commitGameState` write is visible on the **next render, same-tick** — matching the synchronous-slot-math guarantee the old Zustand subscription gave `selectAction`/`removeAction`/the A&R slot ops. A `useQuery` is also mounted internally purely to pin client-committed-record semantics and provide a cold-cache-miss fallback fetch (`GET /api/game/:id`); its `.data` is never read directly by callers.
  - `useGameId()` — `useGameStore((s) => s.gameState?.id ?? null)`, the id pointer, used as the bootstrap handle and by call sites that only need the id.
  - Components/pages/hooks needing spine fields (money, week, flags, etc.) call `useGameState()`; **never** `useGameStore((s) => s.gameState...)` — that selector no longer returns the spine (it returns at most `{ id }`) and is reserved for `gameStore.ts` internals and `useGameState.ts` itself.
- **The funnel rule — never `setQueryData` the gameState record directly.** All spine writes go through store actions (which call `commitGameState` internally). Do not call `queryClient.setQueryData(gameStateQueryKey(id), ...)` from components/hooks/pages — that bypasses the Zustand pointer sync and the stale-key cleanup `commitGameState` does on a game switch.
- **Persisted** (zustand `partialize` — the actual list, do not trust older docs): `gameState.id` (the pointer, not the spine), `selectedActions`, `isAdvancingWeek` only — on-disk localStorage shape is byte-identical to pre-Phase-3.5. Discovered artists survive reloads via the SERVER (`flags.ar_office_discovered_artists`), not client persistence.
- **GameContext**: Minimal - only stores `gameId` and syncs with localStorage
- Always update state via store actions, never mutate state or call `setQueryData` on the gameState key directly

## Page Architecture Patterns
- All pages wrap content in `<GameLayout>` - provides the page backdrop, the GameHeader (balance chip, week/date, Advance Week), and the CommandDock global navigation
- Pages are lightweight containers - delegate to feature components
- Use `useGameContext()` for `gameId`, `useGameState()` for game state (NOT `useGameStore()` — see State Management above)
- Pages handle URL params for pre-selection (e.g., `/live-performance?artistId=123`)

## Component Organization
- `components/` - Reusable game components (modals, cards, displays)
- `components/ui/` - shadcn/ui primitives (never edit)
- `components/executive-meetings/` - Executive suite meeting flows
- `components/ar-office/` - A&R office discovery flows
- `components/email-templates/` - Email notification templates
- `pages/` - Route-level components (full screens)
- `admin/` - Admin tools gated by `withAdmin` HOC
- `layouts/` - Layout wrappers (GameLayout)

## Navigation Shell (v2, July 2026 — GameSidebar is GONE)
- `components/CommandDock.tsx` — floating bottom-center dock: nav clusters, center HoloDisc = Dashboard/home, "More" overflow menu (Save/Load, Weekly Results, Bug Report, Admin, Main Menu, Live Performance), Clerk UserButton, WeekSummary/BugReport modals, AUTO focus-slot filler
- `components/GameHeader.tsx` — balance chip + week/date + Advance Week button (handler/disabled logic formerly in the sidebar)
- Use `onShowSaveModal` prop pattern for triggering modals from layout
- Design language: see `docs/04-frontend/design/v2/design-system-v2.md` (neo-cyber HUD — glass panels, chromatic hairlines, spectral neon accents; utilities `.glass-panel`, `.chromatic-hairline`, `.hud-ticks`, `.backdrop-*` in `index.css`)

## Data Flow & Loading
**Server-Side Authority:**
- Server is source of truth - all calculations via `/api/advance-week`
- Client manages only UI state and syncs with server

**Load Sequence:**
- Check store first, fallback to `/api/game-state`
- `loadGame(gameId)` fetches game, artists, projects, songs, releases in parallel
- Transform with helpers: `transformArtistData()`, `transformSongData()`
- IMPORTANT: Honor backend fields - never override with hardcoded defaults
- Use `isCancelled` flag pattern for cleanup in useEffect

**Cache Management:**
- Use TanStack Query for server data AND for the `gameState` spine (see above) — the spine is a **client-committed record**, not a normal server-truth query: it never refetches in the background (`staleTime`/`gcTime: Infinity`, all refetch triggers off), so it is safe to read synchronously without worrying about a stale-time-driven refetch racing local slot math. Its key is `gameStateQueryKey(gameId)` = `['gameState:record', gameId]` (exported by `hooks/useGameState.ts`).
- After week advancement, invalidate server-data queries so new state shows immediately. ⚠️ TanStack matches query keys **element-by-element**, not by string prefix: invalidating `['emails']` does NOT match the scoped email keys `['emails:list', gameId]` / `['emails:unread-count', gameId]`. Use a predicate (`invalidateQueries({ predicate: q => q.queryKey[0] === EMAIL_LIST_SCOPE || q.queryKey[0] === EMAIL_UNREAD_SCOPE })`) or the exact scoped keys.
- Real key shapes by domain (Phase 3): analytics ROI keys are `[url, 'analytics:<scope>-roi', { gameId, ... }]` (scope at element **1** — match via predicate, as `advanceWeek` does); executives key on `executivesQueryKey(gameId)` = `['executives', gameId]` (exported by `hooks/useExecutives.ts`); charts key on `['charts:top10'|'charts:top100', gameId]` (`hooks/useCharts.ts`); gameState spine key on `gameStateQueryKey(gameId)` = `['gameState:record', gameId]` (`hooks/useGameState.ts`, Phase 3.5). Never invalidate bare `['artist-roi']`/`['executives']` — those match nothing (this was a real bug, fixed Phase 3 PR-3). `tests/client/query-key-contract.test.ts` enforces that every store invalidation matches a real hook key — extend it when adding scopes.
- **The `gameState` record is never invalidated** — it has no server-refetch path by design; it is only ever replaced wholesale via `commitGameState`'s `setQueryData` (fan-out seed on load/create, advance-week commit, synchronous slot math, `adoptServerBalances`). Do not add `invalidateQueries({ queryKey: gameStateQueryKey(...) })` calls — that would trigger the cold-cache-miss fallback fetch in `useGameState.ts` for no reason instead of receiving the intended commit.

## XState Machines
- `machines/executiveMeetingMachine.ts` - Multi-step executive meeting flows
- `machines/arOfficeMachine.ts` - A&R office discovery state machine
- Attach `@statelyai/inspect` only in dev: `if (import.meta.env.DEV)`

## Routing
- **Wouter** (not React Router) - See `App.tsx` for route definitions
- Navigation: `const [, setLocation] = useLocation()` then `setLocation('/path')`
- URL params via `new URLSearchParams(window.location.search)`

## Authentication
- **Clerk** handles all auth - Use Clerk hooks: `useUser()`, `useAuth()`
- Use Clerk components: `<SignedIn>`, `<SignedOut>`, `<UserButton>`

## Styling
- See `tailwind.config.ts` header comments for branding and full color system docs

## Focus Slots & A&R Office
- `usedFocusSlots` = selectedActions.length + (arOfficeSlotUsed ? 1 : 0)
- Sync slots to server via `syncSlotsPatch()` after every action selection change
- A&R operations consume 1 focus slot until week advances
- ExecutiveSuitePage shows focus slot allocation UI via `SelectionSummary` component

## Critical Store Operations
- `loadGame(gameId)` - Load existing game from server
- `createNewGame(campaignType, labelData)` - Start new campaign
- `advanceWeek()` - Submit actions to server, process week, reload data
- `signArtist(artistData)` - Add artist to roster, deduct money
- `createProject(projectData)` - Create project, deduct money & creative capital
- `planRelease(releaseData)` - Schedule release, deduct marketing budget
- All operations update local state immediately for responsive UI

## Shared Utilities
- Import from `@shared/utils/` for game logic (seasonalCalculations, marketingUtils, etc.)
- Import from `@shared/schema` for types (Artist, Project, GameState, etc.)
- Import from `@shared/types/gameTypes` for custom types (LabelData, SourcingTypeString, etc.)
- Never duplicate game calculations in client - use shared utilities

## Modal Patterns
- Modals use `open` and `onOpenChange` props (shadcn pattern)
- Modal state managed at page level with useState
- Complex modals (LabelCreationModal, ArtistDiscoveryModal) receive callbacks
- Use `onClick={(e) => e.stopPropagation()}` to prevent background click-through

## Dev vs Prod
- No hardcoded backend URLs - use relative `/api/` paths

## Critical: Avoid These Mistakes
- ❌ Mutating Zustand state directly → ✓ Use store actions
- ❌ Using `react-router` → ✓ Use Wouter
- ❌ Missing cleanup flags → ✓ Use `isCancelled` in useEffect
- ❌ Overriding backend data → ✓ Honor API responses

## Effect Badges & Exec Mood (July 2026)
- **Never render an effect badge for a key outside `LIVE_EFFECT_KEYS` ∪ {executive_mood}** — import the set from `@shared/engine/processors/ActionProcessor` and filter both the immediate-effects loop and the delayed-effects loop against it (PR-2 precedent). The WeekSummary meetings-card regression — where a dead/unauthored key briefly rendered a plausible-looking badge — is the cautionary tale; don't reintroduce it.
- **Exec mood modifiers must route through `shared/utils/executiveMoodModifier`** — the Impact Preview reads its `DEFAULT_EXEC_MOOD_MODIFIER_CONFIG`. If you tune `progression.json`'s `exec_mood_modifiers`, you MUST update `DEFAULT_EXEC_MOOD_MODIFIER_CONFIG` to match, or a tripwire test fails.
