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
│  │   Query     ││    │ │ • Auth      │ │    │ │ • JSON      │ │
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
- Month advancement and turn processing
- Resource calculations (money, reputation, creative capital)
- Project advancement logic and completion
- Streaming and revenue calculations
- Economic formulas and cost calculations
- Individual song revenue decay processing
- **Artist relationship management** (including mood targeting system)
- Access tier progression
- Random event generation
- Campaign completion and scoring

**Architecture Pattern**: 
```typescript
class GameEngine {
  constructor(gameState: GameState, gameData: ServerGameData)
  
  async advanceMonth(actions: GameEngineAction[]): Promise<{
    gameState: GameState;
    summary: MonthSummary;
    campaignResults?: CampaignResults;
  }>
  
  advanceProjectStages(): void
  calculateEnhancedProjectCost(baseData: any): number
  calculatePerSongProjectCost(songData: any): number
  calculateEconomiesOfScale(projectCount: number): number
  processNewlyReleasedProjects(): void
  processProjectSongReleases(): void
}
```

**Key Benefits**:
- Deterministic gameplay (seeded RNG)
- Consistent calculations between client preview and server execution
- Easy to test and modify game balance
- Clear separation of game logic from UI and API layers
- Single source of truth for all game logic
- Configuration-driven calculations using balance.json
- Transaction-safe processing with database integration

### **2. Database Layer (`/shared/schema.ts`, `/server/storage.ts`)**
**Purpose**: Persistent game state and user data management

**Database Design Principles**:
- **UUIDs**: All primary keys for distributed system compatibility
- **JSONB**: Flexible storage for game flags, metadata, and evolving data
- **Transactions**: Atomic operations for game state changes
- **Relations**: Clear foreign key relationships between entities

**Core Schema**:
```typescript
// Primary game entities
export const gameStates = pgTable("game_states", { /* core game state */ });
export const artists = pgTable("artists", { /* artist management */ });
export const projects = pgTable("projects", { /* production tracking */ });
export const songs = pgTable("songs", { /* individual song data */ });
export const releases = pgTable("releases", { /* release management */ });

// Supporting tables
export const monthlyActions = pgTable("monthly_actions", { /* action history */ });
export const gameSaves = pgTable("game_saves", { /* save system */ });
```

### **3. REST API Layer (`/server/routes.ts`)**
**Purpose**: HTTP interface for client-server communication

**API Design Principles**:
- **RESTful conventions**: Clear resource-based URLs
- **Type safety**: Zod validation for all requests/responses
- **Session auth**: Passport.js with Express sessions
- **Transaction wrapper**: Database operations in atomic transactions
- **Error handling**: Consistent error responses with detailed messages

**Core Endpoints**:
```typescript
// Authentication
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me

// Game management
GET  /api/game/:gameId
POST /api/game
POST /api/game/:gameId/advance

// Entity management
POST /api/game/:gameId/artists/:artistId/sign
POST /api/game/:gameId/projects
POST /api/game/:gameId/actions

// Save system
POST /api/game/:gameId/save
POST /api/saves/:saveId/load
```

### **4. React Frontend (`/client/src/`)**
**Purpose**: User interface and client-side state management

**Frontend Architecture**:
- **React 18**: Component-based UI with hooks
- **TypeScript**: Type safety throughout the application
- **Zustand**: Global state management
- **React Query**: Server state caching and synchronization
- **Motion.dev**: Production-grade animation library (successor to Framer Motion)
- **Tailwind CSS**: Utility-first styling with custom dark plum/burgundy theme
- **Vite**: Fast development and optimized builds

**Visual Theme System** *(Updated: August 31, 2025)*:
- **Dark Plum Theme**: Comprehensive UI overhaul with #2a1821 base and #2a1821 containers
- **Burgundy Accents**: Secondary color changed from purple to #791014 burgundy
- **Background Integration**: Full-opacity plum background image (plum_background.880Z.png)
- **Accessibility**: White/white-70 text on dark backgrounds with WCAG AA compliance
- **Modern Aesthetic**: 10px rounded corners and immersive gaming experience

**Component Structure**:
```
src/
├── components/
│   ├── Dashboard.tsx          # Main game dashboard
│   ├── MonthPlanner.tsx       # Turn planning interface
│   ├── ArtistRoster.tsx       # Artist management
│   ├── ActiveProjects.tsx     # Project tracking
│   └── modals/
│       ├── ProjectCreationModal.tsx
│       ├── ArtistDiscoveryModal.tsx
│       └── SaveLoadModal.tsx
├── stores/
│   ├── gameStore.ts          # Game state management
│   └── uiStore.ts            # UI state management
└── utils/
    ├── api.ts                # API client
    └── gameUtils.ts          # Client-side utilities
```

### **5. Content Management System (`/data/`)**
**Purpose**: Game balance and content configuration

**Content Architecture**:
- **`balance.ts`**: Main balance configuration aggregator (exports unified balance object)
- **`balance/`**: Modular balance configuration files
  - **`content.json`**: Song name pools and mood types for content generation (NEW)
  - **`economy.json`**: Economic costs and formulas
  - **`progression.json`**: Reputation and access tier progression systems
  - **`quality.json`**: Quality calculation rules and bonuses
  - **`artists.json`**: Artist archetype definitions and traits
  - **`markets.json`**: Market barriers and seasonal modifiers
  - **`projects.json`**: Project durations and time progression settings
  - **`events.json`**: Random event configurations
  - **`config.json`**: Version metadata and configuration info
- **`artists.json`**: Available artist pool and characteristics
- **`roles.json`**: Industry professionals, dialogue trees
- **`world.json`**: Game world configuration and access tiers
- **`actions.json`**: Available player actions and effects

**Balance System Design**:
```json
{
  "market_formulas": {
    "streaming_calculation": {
      "longevity_decay": 0.85,
      "max_catalog_months": 24
    }
  },
  "quality_system": {
    "producer_tier_bonus": { "local": 0, "legendary": 20 },
    "time_investment_bonus": { "rushed": -10, "perfectionist": 15 }
  },
  "access_tier_system": {
    "playlist_tiers": { /* progression thresholds */ },
    "press_tiers": { /* reputation gates */ }
  },
  "song_generation": {
    "name_pools": {
      "default": ["Midnight Dreams", "City Lights", "..."],
      "genre_specific": { "pop": ["Summer Nights"], "rock": ["Thunder Road"] }
    },
    "mood_types": ["upbeat", "melancholic", "aggressive", "chill"]
  }
}
```

---

## 🔄 Data Flow Architecture

### **Month Advancement Flow**
```
Client Request → API Route → GameEngine → Database Transaction → Response
     ↓              ↓           ↓              ↓                   ↓
1. User clicks    2. Validate  3. Process     4. Atomic          5. Updated
   "End Month"       request      turn           update             state
```

### **Project Creation Flow**
```
UI Form → Validation → Cost Calculation → Resource Check → Database → Client Update
   ↓         ↓             ↓                 ↓              ↓           ↓
1. Player  2. Zod       3. GameEngine     4. Sufficient   5. Create   6. UI
   input     schema        economics         resources       record     refresh
```

### **Save/Load System**
```
Game State → Serialization → Database Storage → Retrieval → Deserialization → Restore
     ↓            ↓              ↓               ↓              ↓              ↓
1. Current    2. JSON        3. JSONB          4. User        5. Parse       6. Game
   state         export         storage           loads           JSON          restored
```

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
- **Form state**: React Hook Form with Zod validation
- **Persistence**: Local storage for UI preferences

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
Zod schemas → TypeScript types

// Frontend type consumption
React components with full type safety
```

---

## 🌐 Deployment Architecture

### **Development Environment**
- **Frontend**: Vite dev server (port 5173)
- **Backend**: Node.js with tsx (port 5000)
- **Database**: PostgreSQL (local or Railway)
- **Content**: Local JSON files

### **Production Considerations**
- **Build process**: Vite production build with optimizations
- **Database**: Railway PostgreSQL with connection pooling
- **Authentication**: Secure session management with proper secrets
- **Content delivery**: Static asset optimization
- **Error monitoring**: Production error tracking and logging

---

## 🔒 Security Architecture

### **Authentication & Authorization**
- **Password security**: Bcrypt hashing with salt rounds
- **Session management**: Express sessions with secure configuration
- **API protection**: Authentication middleware on protected routes
- **Data validation**: Input sanitization and type checking

### **Database Security**
- **Prepared statements**: SQL injection prevention via Drizzle ORM
- **Row-level security**: User isolation through game ownership
- **Transaction safety**: Atomic operations prevent data corruption
- **Access control**: Minimal database permissions

---

## 🏆 Campaign Completion System

### **Completion Detection and Scoring**
```typescript
const checkCampaignCompletion = (gameState: GameState) => {
  // Only complete if we've reached final month
  if (gameState.currentMonth >= 12) {
    // Mark campaign as completed
    this.gameState.campaignCompleted = true;
    
    // Calculate final score
    const finalScore = calculateFinalScore(gameState);
    
    return {
      campaignCompleted: true,
      finalScore,
      scoreBreakdown: {
        moneyScore: Math.floor(gameState.money / 1000),
        reputationScore: Math.floor(gameState.reputation * 5),
        accessTierBonus: calculateAccessTierBonus()
      },
      achievements: determineAchievements(gameState),
      artistStats: gameState.artists.map(artist => ({
        name: artist.name,
        projectsCompleted: 0, // Based on completed projects
        totalRevenue: 0,
        finalLoyalty: artist.loyalty
      }))
    };
  }
  return null;
};
```

### **Campaign Completion Flow**
```
Month 12 Detection → Score Calculation → Achievement Analysis → Database Update → UI Display
        ↓                    ↓                   ↓                  ↓             ↓
    1. End month         2. Financial       3. Progress        4. Mark         5. Show
       validation           assessment         evaluation        completed       results
```

### **Database Updates**
- `campaign_completed` set to true
- Final score recorded in game state
- Achievement flags updated
- Complete campaign statistics preserved

### **Scoring System**
- **Money Score**: Total funds divided by 1,000 (financial success)
- **Reputation Score**: Reputation multiplied by 5 (industry standing)
- **Access Tier Bonus**: Progression through playlist/press/venue tiers
- **Achievement System**: Milestone-based bonus scoring

---

*This system architecture supports the complete Music Label Manager experience with scalability, maintainability, and performance as core design principles.*