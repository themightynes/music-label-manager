# System Architecture

**Music Label Manager - System Design**
*System Design Document*

---

## 🏗️ High-Level Architecture

The Music Label Manager is a **strategic simulation game** built as a full-stack web application with a unified game engine architecture. The system is designed for scalability, maintainability, and content flexibility.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Client (React) │    │  Server (Node)  │    │  Database (PG)  │
│                 │    │                 │    │                 │
│  ┌─────────────┐│    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│  │ Components  ││    │ │ Game Engine │ │    │ │ Game State  │ │
│  │             ││    │ │             │ │    │ │             │ │
│  │ • Dashboard ││    │ │ • Unified   │ │    │ │ • Schemas   │ │
│  │ • Modals    ││◄──►│ │   Logic     │ │◄──►│ │ • Relations │ │
│  │ • Forms     ││    │ │ • Balance   │ │    │ │ • JSONB     │ │
│  └─────────────┘│    │ │ • RNG       │ │    │ │ • Types     │ │
│                 │    │ └─────────────┘ │    │ └─────────────┘ │
│  ┌─────────────┐│    │                 │    │                 │
│  │ State Mgmt  ││    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│  │             ││    │ │ REST API    │ │    │ │ Content     │ │
│  │ • Zustand   ││    │ │             │ │    │ │ Files       │ │
│  │ • React     ││    │ │ • Routes    │ │    │ │             │ │
│  │   Query     ││    │ │ • Clerk     │ │    │ │ • JSON      │ │
│  └─────────────┘│    │ │ • Validation│ │    │ │ • Balance   │ │
└─────────────────┘    │ └─────────────┘ │    │ │ • Dialogue  │ │
                       └─────────────────┘    │ └─────────────┘ │
                                              └─────────────────┘
```

---

## 🧩 Core Components

### **1. Unified Game Engine (`/shared/engine/game-engine.ts`)**
**Purpose**: Single source of truth for ALL game calculations and business logic

**Key Responsibilities**:
- Week advancement and turn processing (52-week campaign)
- Resource calculations (money, reputation, creative capital)
- Project advancement logic and completion
- Streaming and revenue calculations
- Economic formulas and cost calculations
- Individual song revenue decay processing
- **Artist relationship management** (including mood targeting system)
- A&R Office operation processing (`processAROfficeWeekly`)
- Access tier progression
- Random event generation
- Campaign completion and scoring (delegated to `AchievementsEngine`)

**Architecture Pattern**:
```typescript
class GameEngine {
  constructor(
    gameState: GameState,
    gameData: ServerGameData,
    storage?: any,   // optional storage interface for DB operations
    seed?: string    // seeded RNG; defaults to `${gameState.id}-${gameState.currentWeek}`
  )

  // Main game loop — advances one week
  async advanceWeek(weeklyActions: GameEngineAction[], dbTransaction?: any): Promise<{
    gameState: GameState;
    summary: WeekSummary;
    campaignResults?: CampaignResults;
  }>

  // Internal weekly processing (selection)
  private async processAROfficeWeekly(summary, dbTransaction?): Promise<void>
  private async advanceProjectStages(summary, dbTransaction?): Promise<void>
  private calculateEnhancedProjectCost(...): number
  private calculatePerSongProjectCost(...): number
  private async checkCampaignCompletion(summary): Promise<CampaignResults | undefined>
}
```

**Key Benefits**:
- Deterministic gameplay (seeded RNG)
- Consistent calculations between client preview and server execution
- Easy to test and modify game balance
- Clear separation of game logic from UI and API layers
- Single source of truth for all game logic
- Configuration-driven calculations using `data/balance/` JSON modules
- Transaction-safe processing with database integration
- Financial math delegated to `FinancialSystem` (`shared/engine/FinancialSystem.ts`)

### **2. Database Layer (`/shared/schema.ts`, `/server/storage.ts`)**
**Purpose**: Persistent game state and user data management

**Database Design Principles**:
- **UUIDs**: All primary keys for distributed system compatibility
- **JSONB**: Flexible storage for game flags, metadata, and evolving data
- **Transactions**: Atomic operations for game state changes
- **Relations**: Clear foreign key relationships between entities

**Core Schema** (see [Database Design](./database-design.md) for full detail):
```typescript
// Primary game entities
export const gameStates = pgTable("game_states", { /* core game state */ });
export const artists = pgTable("artists", { /* artist management */ });
export const projects = pgTable("projects", { /* production tracking */ });
export const songs = pgTable("songs", { /* individual song data */ });
export const releases = pgTable("releases", { /* release management */ });
export const releaseSongs = pgTable("release_songs", { /* track listings */ });

// Supporting tables
export const users = pgTable("users", { /* Clerk-linked identities */ });
export const weeklyActions = pgTable("weekly_actions", { /* action history */ });
export const gameSaves = pgTable("game_saves", { /* save system */ });
export const emails = pgTable("emails", { /* in-game inbox */ });
export const executives = pgTable("executives", { /* executive team */ });
export const chartEntries = pgTable("chart_entries", { /* weekly charts */ });
export const musicLabels = pgTable("music_labels", { /* player label identity */ });
export const moodEvents = pgTable("mood_events", { /* artist mood history */ });
```

### **3. REST API Layer (`/server/routes.ts`)**
**Purpose**: HTTP interface for client-server communication

**API Design Principles**:
- **RESTful conventions**: Clear resource-based URLs
- **Type safety**: Zod validation for all requests/responses (shared contracts in `shared/api/contracts.ts`)
- **Clerk auth**: `requireClerkUser` middleware (`server/auth.ts`) validates Clerk JWTs and resolves the local user record; admin routes add `requireAdmin` (Clerk `privateMetadata.role === 'admin'`)
- **Transaction wrapper**: Database operations in atomic transactions
- **Error handling**: Consistent error responses with detailed messages

**Core Endpoints** (selection):
```typescript
// Auth / identity
POST /api/webhooks/clerk                 // Clerk webhook (svix-verified) syncs users
GET  /api/me                             // Current user info incl. isAdmin flag

// Game management
GET  /api/game/:id
POST /api/game                           // Create game
POST /api/game/:gameId/label             // Create label for a game
POST /api/advance-week                   // Advance the week (main game loop)

// Entity management
POST /api/game/:gameId/artists           // Sign an artist
POST /api/game/:gameId/projects          // Create project (consumes creative capital)
POST /api/game/:gameId/releases/plan     // Plan a release (consumes creative capital)
POST /api/game/:gameId/ar-office/start   // A&R Office operations

// Save system
GET  /api/saves
POST /api/saves                          // Create save (snapshot v2)
POST /api/saves/:saveId/restore          // Restore (overwrite or fork)

// Charts & data
GET  /api/game/:gameId/charts/top100
GET  /api/game/:gameId/emails
```

### **4. React Frontend (`/client/src/`)**
**Purpose**: User interface and client-side state management

**Frontend Architecture**:
- **React 18**: Component-based UI with hooks
- **TypeScript**: Type safety throughout the application
- **Zustand**: Global state management
- **React Query**: Server state caching and synchronization
- **XState**: Multi-step decision flows (A&R Office, artist dialogue)
- **Clerk React**: Authentication (`useUser()`, `<SignedIn>`, `<UserButton>`)
- **Motion.dev**: Production-grade animation library (successor to Framer Motion)
- **Tailwind CSS**: Utility-first styling with custom dark plum/burgundy theme
- **Vite**: Fast development and optimized builds

**Visual Theme System** *(Updated: August 31, 2025)*:
- **Dark Plum Theme**: Comprehensive UI overhaul with #2a1821 base and #2a1821 containers
- **Burgundy Accents**: Secondary color changed from purple to #791014 burgundy
- **Background Integration**: Full-opacity plum background image (plum_background.880Z.png)
- **Accessibility**: White/white-70 text on dark backgrounds with WCAG AA compliance
- **Modern Aesthetic**: 10px rounded corners and immersive gaming experience

**Component Structure** (selection):
```
client/src/
├── components/
│   ├── Dashboard.tsx            # Main game dashboard
│   ├── SelectionSummary.tsx     # Weekly action selection + advance (used by ExecutiveSuitePage)
│   ├── ArtistRoster.tsx         # Artist management
│   ├── ActiveProjects.tsx       # Project tracking
│   ├── ProjectCreationModal.tsx
│   ├── ArtistDiscoveryModal.tsx
│   └── SaveGameModal.tsx        # Save/load/import/export
├── store/
│   └── gameStore.ts             # Zustand game state management
├── machines/                    # XState machines (co-located per feature)
└── lib/
    └── queryClient.ts           # apiRequest() helper — attaches Clerk JWTs
```

### **5. Content Management System (`/data/`)**
**Purpose**: Game balance and content configuration

**Content Architecture**:
- **`balance.ts`**: Main balance configuration aggregator (exports unified balance object)
- **`balance/`**: Modular balance configuration files
  - **`content.json`**: Song name pools and mood types for content generation
  - **`economy.json`**: Economic costs and formulas (starting money: $500k)
  - **`progression.json`**: Reputation and access tier progression systems
  - **`quality.json`**: Quality calculation rules and bonuses
  - **`artists.json`**: Artist archetype definitions and traits
  - **`markets.json`**: Market barriers, seasonal modifiers, awareness system
  - **`projects.json`**: Project durations and time progression settings
  - **`events.json`**: Random event configurations
  - **`config.json`**: Version metadata and configuration info
- **`artists.json`**: Available artist pool and characteristics
- **`roles.json`**: Industry professionals, dialogue trees
- **`world.json`**: Game world configuration and access tiers
- **`actions.json`**: Available player actions and effects

**Balance System Design** (illustrative excerpts):
```json
{
  "market_formulas": {
    "streaming_calculation": {
      "ongoing_streams": { "weekly_decay_rate": 0.85 }
    }
  },
  "producer_tier_system": {
    "local": { "quality_bonus": 0 },
    "legendary": { "quality_bonus": 20 }
  },
  "time_investment_system": {
    "perfectionist": { "quality_bonus": 15 }
  },
  "access_tier_system": {
    "playlist_access": { /* progression thresholds */ },
    "press_access": { /* reputation gates */ },
    "venue_access": { /* venue capacity tiers */ }
  },
  "time_progression": {
    "campaign_length_weeks": 52
  }
}
```

---

## 🔄 Data Flow Architecture

### **Week Advancement Flow**
```
Client Request → API Route → GameEngine → Database Transaction → Response
     ↓              ↓           ↓              ↓                   ↓
1. User clicks    2. Validate  3. Process     4. Atomic          5. Updated
   "Advance Week"    request      turn           update             state
```

### **Project Creation Flow**
```
UI Form → Validation → Cost Calculation → Resource Check → Database → Client Update
   ↓         ↓             ↓                 ↓              ↓           ↓
1. Player  2. Zod       3. GameEngine     4. Money +      5. Create   6. UI
   input     schema        economics         creative       record      refresh
                                             capital
```

### **Save/Load System**
```
Game State → Serialization → Database Storage → Retrieval → Deserialization → Restore
     ↓            ↓              ↓               ↓              ↓              ↓
1. Current    2. Snapshot    3. JSONB          4. User        5. Version     6. Game
   state         v2 export      storage           loads          check +       restored
                                                                 migration
```
See `docs/03-workflows/save-load-system-workflow.md` for the snapshot v2 format (collections are siblings of `gameState`, not nested inside it).

### **Song Title Editing Flow**
```
Player Edit → UI Update → API Request → Authorization → Database Update → State Sync
     ↓           ↓           ↓            ↓               ↓                ↓
1. Player    2. Inline    3. PATCH       4. Verify       5. Update       6. All UI
   hovers       input        /songs/:id     ownership       songs           components
   song         appears      request        chain           table           refreshed
```

**Song Editing Architecture Benefits**:
- **Real-time updates**: No page refresh required, instant visual feedback
- **Authorization chain**: Multi-level security with user → game → song validation
- **State consistency**: Synchronized updates across all UI components
- **User agency**: Direct content manipulation enhances player engagement
- **Extensibility**: Foundation for future content customization features

---

## 🔧 Technical Patterns

### **Error Handling Strategy**
- **Client-side**: React error boundaries with user-friendly messages
- **API level**: Consistent error responses with HTTP status codes
- **Database**: Transaction rollback on any operation failure
- **Validation**: Zod schemas for runtime type checking

### **State Management Pattern**
- **Server state**: React Query for API data caching
- **Client state**: Zustand for UI state and game state preview
- **Flow state**: XState machines for multi-step flows (A&R operations, dialogue)
- **Form state**: React Hook Form with Zod validation
- **Persistence**: Local storage for UI preferences and current game ID

### **Performance Optimization**
- **Database**: Indexed queries for game state retrieval
- **API**: Request caching and conditional requests
- **Frontend**: Component memoization and lazy loading
- **Build**: Vite optimization and code splitting

### **Type Safety Architecture**
```typescript
// Shared type definitions
shared/types/gameTypes.ts

// Database schema types (auto-generated)
shared/schema.ts → Drizzle types

// API contract types (validated)
shared/api/contracts.ts → Zod schemas → TypeScript types

// Frontend type consumption
React components with full type safety
```

---

## 🌐 Deployment Architecture

### **Development Environment**
- **Single server**: `npm run dev` runs Express via tsx on port 5000 (`PORT` env override), with Vite mounted as middleware for HMR — there is no separate frontend dev server
- **Database**: Railway PostgreSQL via `DATABASE_URL` (standard `pg` driver, SSL enabled)
- **Test database**: Docker PostgreSQL on port 5433 for the vitest integration suite
- **Content**: Local JSON files in `/data/`

### **Production Considerations**
- **Build process**: `vite build` for the client + esbuild bundle for the server (`npm run build`), served from `dist/`
- **Database**: Railway PostgreSQL with connection pooling (max 10, `rejectUnauthorized: false`)
- **Authentication**: Clerk-hosted auth; server verifies JWTs, webhook keeps user records in sync
- **Content delivery**: Static asset optimization
- **Error monitoring**: Production error tracking and logging

---

## 🔒 Security Architecture

### **Authentication & Authorization**
- **Identity provider**: Clerk (no local passwords) — client uses Clerk React components, server validates JWTs via `requireClerkUser`
- **User sync**: Clerk webhook (`POST /api/webhooks/clerk`, svix signature-verified) creates/updates local `users` rows keyed by `clerk_id`
- **Admin access**: `requireAdmin` middleware + `withAdmin()` client HOC gate developer tools behind Clerk `privateMetadata.role === 'admin'`
- **API protection**: Authentication middleware on protected routes
- **Data validation**: Input sanitization and type checking (Zod)

### **Database Security**
- **Prepared statements**: SQL injection prevention via Drizzle ORM
- **Row-level security**: User isolation through game ownership
- **Transaction safety**: Atomic operations prevent data corruption
- **Access control**: Minimal database permissions

---

## 🏆 Campaign Completion System

### **Completion Detection and Scoring**
Completion is config-driven: the campaign ends when `currentWeek` reaches `balance.time_progression.campaign_length_weeks` (52). Scoring is handled by `AchievementsEngine` (`shared/engine/AchievementsEngine.ts`).

```typescript
// shared/engine/game-engine.ts (simplified)
private async checkCampaignCompletion(summary: WeekSummary): Promise<CampaignResults | undefined> {
  const currentWeek = this.gameState.currentWeek || 0;
  const balanceConfig = await this.gameData.getBalanceConfig();
  const campaignLength = balanceConfig.time_progression.campaign_length_weeks;

  if (currentWeek < campaignLength) return undefined;

  this.gameState.campaignCompleted = true;
  const campaignResults = AchievementsEngine.calculateCampaignResults(this.gameState);

  summary.changes.push({
    type: 'unlock',
    description: `🎉 Campaign Completed! Final Score: ${campaignResults.finalScore}`,
    amount: campaignResults.finalScore
  });

  return campaignResults;
}
```

### **Campaign Completion Flow**
```
Week 52 Detection → Score Calculation → Achievement Analysis → Database Update → UI Display
        ↓                    ↓                   ↓                  ↓             ↓
    1. Advance-week      2. Financial       3. Victory type    4. Mark         5. Show
       processing           assessment         evaluation        completed       results
```

### **Database Updates**
- `campaign_completed` set to true
- Further `advanceWeek` calls are rejected until a new game is started
- Complete campaign statistics preserved in game state

### **Scoring System** (`AchievementsEngine`)
- **Money Score**: Financial success component
- **Reputation Score**: Industry standing component
- **Access Tier Bonus**: Progression through playlist/press/venue tiers
- **Victory Types**: Commercial Success, Critical Acclaim, Balanced Growth, Survival, Failure
- **Achievement System**: Milestone-based bonus scoring

---

*This system architecture supports the complete Music Label Manager experience with scalability, maintainability, and performance as core design principles.*
