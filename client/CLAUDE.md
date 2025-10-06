# Client Directory - Frontend Rules

## Critical API Rules
- **Always use `apiRequest()` from `lib/queryClient.ts`** - Attaches Clerk JWT tokens automatically
- Never manually add Authorization headers - `apiRequest()` handles it
- All backend calls must route through `apiRequest()` or TanStack Query's `queryClient`

## State Management
- **Zustand Store**: `store/gameStore.ts` - Single source of truth for game state
- **Persisted**: gameState, artists, projects, roles, songs, releases, discoveredArtists, selectedActions
- **Not Persisted**: isAdvancingWeek, weeklyOutcome, campaignResults
- **GameContext**: Minimal - only stores `gameId` and syncs with localStorage
- Always update store via store actions, never mutate state directly

## Page Architecture Patterns
- All pages wrap content in `<GameLayout>` - provides sidebar and global navigation
- Pages are lightweight containers - delegate to feature components
- Use `useGameContext()` for `gameId`, `useGameStore()` for game state
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

## GameSidebar Integration
- Sidebar manages: navigation, week advancement, save game, bug reports, admin access
- Use `onShowSaveModal` prop pattern for triggering modals from layout

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
- Use TanStack Query for server data
- After week advancement: invalidate `['artist-roi']`, `['executives']`, `['emails']`

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
