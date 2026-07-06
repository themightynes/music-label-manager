# Backend Architecture

**Music Label Manager - Node.js Server Design**  
*Version: 1.0 (MVP Complete)*

*Last Updated: July 4, 2026*

---

## 🚀 Backend Overview

The Music Label Manager backend is a **Node.js** application built with **Express.js**, **TypeScript**, and **PostgreSQL**. The architecture emphasizes type safety, transaction integrity, and separation of concerns.

**Technology Stack**:
- **Node.js 18+** with TypeScript
- **Express.js** web framework
- **PostgreSQL** with Drizzle ORM
- **Clerk** for authentication (JWT verified via `apiRequest()` on the client; `requireClerkUser` + `requireGameOwner` middleware on the server)
- **Zod** for validation
- **Shared types** between client and server

---

## 📁 Server Structure

```
server/
├── index.ts              # Server entry point and configuration
├── routes.ts             # Thin route registry (~121 lines): webhook/health/me + mounts feature routers, exports createServer
├── routes/               # Feature routers (one Express Router per domain)
│   ├── analytics.ts      #   /api/analytics
│   ├── bugReports.ts     #   bug report endpoints
│   ├── admin.ts          #   admin-only endpoints
│   ├── emails.ts         #   in-game inbox
│   ├── devTools.ts       #   dev/debug tooling
│   ├── content.ts        #   game content (some public/no-auth)
│   ├── arOffice.ts       #   A&R Office operations
│   ├── executives.ts     #   executive team + dialogue
│   ├── artists.ts        #   artist signing/management
│   ├── projects.ts       #   project creation/lifecycle
│   ├── charts.ts         #   weekly charts
│   ├── tour.ts           #   tour endpoints
│   ├── releases.ts       #   release planning
│   ├── games.ts          #   game lifecycle
│   ├── saves.ts          #   save/load snapshots
│   └── gameLoop.ts       #   advance-week / select-actions
├── auth.ts               # Authentication system (Clerk)
├── db.ts                 # Database connection and configuration
├── storage.ts            # Data access layer abstraction
├── vite.ts               # Vite integration for development
└── data/
    └── gameData.ts       # Game content server interface

shared/
├── engine/
│   └── game-engine.ts    # Unified game logic engine
├── api/
│   ├── client.ts         # API client for frontend
│   └── contracts.ts      # API request/response types
├── schema.ts             # Database schema and Zod validation
├── types/
│   └── gameTypes.ts      # Shared TypeScript types
└── utils/
    └── dataLoader.ts     # Content loading utilities
```

---

## 🔧 Server Implementation

### **1. Express.js Route Structure**
RESTful API implementation, decomposed into per-feature routers (Phase 1 route refactor — see `docs/01-planning/implementation-specs/[READY] phase-1-server-routes-refactor-plan.md`). `server/routes.ts` is a thin registry that mounts 16 feature routers from `server/routes/`. Each router registers its **full API path** and is mounted **bare**, with **auth middleware applied per-route** inside the router. Endpoint paths, request/response behavior, and auth requirements are **unchanged** from the previous monolithic `routes.ts` — only the file organization changed.

```typescript
// Core game operations
GET    /api/game/:id              // Get complete game state
POST   /api/game                  // Create new game session
PATCH  /api/game/:id              // Update specific fields
DELETE /api/game/:gameId          // Delete game (orphaned cleanup)
GET    /api/games                 // List all user's games (newest first)
POST   /api/advance-week          // Process weekly turn

// Entity management
POST   /api/game/:gameId/artists  // Sign new artist
POST   /api/game/:gameId/projects // Create new project
POST   /api/game/:gameId/actions  // Record player action

// Save system
GET    /api/saves                 // List user's saves
POST   /api/saves                 // Create new save

// Admin endpoints (require admin role)
GET    /api/admin/database-stats         // Database health metrics
POST   /api/admin/cleanup-orphaned-games // Manual orphaned game cleanup
GET    /api/admin/actions-config         // Content Editor: read data/actions.json
POST   /api/admin/actions-config         // Content Editor: save meetings (validate → backup → write → cache-clear → changelog)
GET    /api/admin/events-config          // Content Editor: read data/events.json
POST   /api/admin/events-config          // Content Editor: save side events (same pipeline; both POSTs append id-level diffs to data/content-changelog.json)

// Authentication (Clerk-issued JWT verified per request; no local auth endpoints)
GET    /api/me                    // Current user
```

### **2. Request Validation with Zod**
Runtime validation for all API endpoints. Actual route handlers are thin — business logic lives in feature services, not inline in route files: `saveService.ts`, `releasePlanningService.ts`, `artistService.ts`, `gameCreationService.ts`, and `advanceWeekService.ts` (all under `server/services/`). A typical handler validates the request body with a Zod schema, delegates to the relevant service, and maps the result/error to an HTTP response.

### **3. Content Loading System**
JSON-based game data with caching:

```typescript
// server/data/gameData.ts
export class ServerGameData {
  private static instance: ServerGameData;
  private balanceConfig: any = null;
  
  // Singleton pattern for content caching
  static getInstance(): ServerGameData {
    if (!ServerGameData.instance) {
      ServerGameData.instance = new ServerGameData();
    }
    return ServerGameData.instance;
  }
  
  async loadJSON(filename: string): Promise<any> {
    const filePath = path.join(process.cwd(), 'data', filename);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  }
  
  async getRoleById(roleId: string): Promise<Role | null> {
    if (!this.rolesData) await this.initialize();
    return this.rolesData.roles.find((role: any) => role.id === roleId);
  }
}
```

---

## 🧹 Orphaned Game Cleanup System

### **Overview**
Orphaned games are game_states records that have no corresponding save files. These accumulate when users start games but never save them, navigate away, or experience browser crashes. The cleanup system provides both automatic prevention and manual maintenance tools.

**Implementation Date**: October 2025
**PRD Reference**: tasks/0006-prd-database-maintenance-orphaned-games.md

### **1. Game Deletion Endpoint**
```typescript
// DELETE /api/game/:gameId - Delete a game and all related data
app.delete("/api/game/:gameId", requireClerkUser, async (req, res) => {
  const userId = req.userId;
  const { gameId } = req.params;

  // Verify user owns this game
  const [gameOwnership] = await db
    .select({ id: gameStates.id, userId: gameStates.userId })
    .from(gameStates)
    .where(eq(gameStates.id, gameId))
    .limit(1);

  if (!gameOwnership) {
    return res.status(404).json({ message: 'Game not found' });
  }

  if (gameOwnership.userId !== userId) {
    // Don't leak game existence - return 404 for unauthorized access
    return res.status(404).json({ message: 'Game not found' });
  }

  // Delete the game - CASCADE configuration in schema handles all related records
  // Automatically deletes: artists, songs, projects, releases, emails, executives,
  // mood events, weekly actions, chart entries, and music label
  await db.delete(gameStates).where(eq(gameStates.id, gameId));

  res.json({
    success: true,
    message: 'Game deleted successfully',
    gameId: gameId
  });
});
```

**Security Features**:
- **Authentication required**: Uses `requireClerkUser` middleware
- **Ownership verification**: Only the game owner can delete their game
- **No information leakage**: Returns 404 for both non-existent and unauthorized access
- **CASCADE deletes**: All related records are automatically deleted via foreign key constraints

### **2. List Games Endpoint**
```typescript
// GET /api/games - List all games for current user (for server state recovery)
app.get("/api/games", requireClerkUser, async (req, res) => {
  const userId = req.userId;

  // Get all games for this user, sorted by created date (newest first)
  const games = await db
    .select()
    .from(gameStates)
    .where(eq(gameStates.userId, userId))
    .orderBy(desc(gameStates.createdAt));

  res.json(games);
});
```

**Use Cases**:
- **Server state recovery**: Load most recent game when localStorage is empty
- **Orphaned game detection**: Check if a game has corresponding save files
- **Multi-device sync**: Restore session state across devices

### **3. Automatic Cleanup on New Game Creation**
The client implements automatic cleanup when users create a new game:

**Flow**:
1. User clicks "New Game" in the UI
2. Client checks if a current game exists in Zustand store
3. If current game exists:
   - Query `GET /api/saves` to fetch all save files
   - Filter saves by `gameId` to check if current game has saves
   - If no saves exist: Call `DELETE /api/game/:gameId` to delete unsaved game
   - Show neutral toast: "Previous unsaved game cleaned up"
   - Log deletion event: `[ORPHANED GAME CLEANUP] Cleaned up unsaved game: {id} (Week {week})`
4. Proceed with new game creation

**Client Implementation**: `client/src/store/gameStore.ts` (lines 320-362)

**Error Handling**: Cleanup failures are logged but don't block new game creation

### **4. Admin Dashboard Endpoints**

#### **Database Stats Endpoint**
```typescript
// GET /api/admin/database-stats - Fetch database health metrics
app.get('/api/admin/database-stats', requireClerkUser, requireAdmin, async (req, res) => {
  // Identify orphaned games using LEFT JOIN
  const orphanedGamesQuery = sql`
    SELECT gs.id, gs.user_id, gs.current_week, gs.created_at
    FROM game_states gs
    LEFT JOIN game_saves gsaves ON gs.id = (gsaves.game_state->'gameState'->>'id')::uuid
    WHERE gsaves.id IS NULL
    ORDER BY gs.created_at DESC
  `;

  const orphanedGames = await db.execute(orphanedGamesQuery);
  const totalGames = await db.select({ count: sql`count(*)::int` }).from(gameStates);

  res.json({
    orphanedGamesCount: orphanedGames.rows.length,
    totalGamesCount: totalGames[0].count,
    orphanedPercentage: (orphanedGames.rows.length / totalGames[0].count) * 100,
    databaseSizeMB: /* PostgreSQL database size query */,
    topUsersOrphanedGames: /* Top 10 users by orphaned game count */
  });
});
```

**Access Control**: Requires both authentication (`requireClerkUser`) and admin role (`requireAdmin`)

**Metrics Returned**:
- Orphaned games count and percentage
- Total games count
- Database size in MB
- Top users by orphaned games (with hashed user IDs for privacy)

#### **Manual Cleanup Endpoint**
```typescript
// POST /api/admin/cleanup-orphaned-games - Trigger manual cleanup
app.post('/api/admin/cleanup-orphaned-games', requireClerkUser, requireAdmin, async (req, res) => {
  // Same orphaned game detection query as stats endpoint
  const orphanedGames = await db.execute(orphanedGamesQuery);

  // Batch delete in chunks of 100 for safety
  for (let i = 0; i < orphanedGames.length; i += BATCH_SIZE) {
    const batch = orphanedGames.slice(i, i + BATCH_SIZE);
    const batchIds = batch.map(g => g.id);

    // Use transaction for atomic deletion
    await db.transaction(async (tx) => {
      await tx.delete(gameStates).where(sql`${gameStates.id} = ANY(${batchIds})`);
    });
  }

  res.json({
    deletedCount: orphanedGames.length,
    totalGamesBefore: /* count before cleanup */,
    totalGamesAfter: /* count after cleanup */
  });
});
```

**Safety Features**:
- **Batch processing**: Deletes 100 games at a time to avoid long transactions
- **Transactional**: Each batch is deleted atomically
- **Idempotent**: Safe to run multiple times

### **5. CLI Cleanup Script**
**Location**: `scripts/cleanup-orphaned-games.ts`

**Usage**:
```bash
# Dry-run mode (default) - preview orphaned games without deleting
npm run db:cleanup-orphaned

# Execute mode - actually delete orphaned games
npm run db:cleanup-orphaned -- --execute
```

**Features**:
- **Dry-run by default**: Must explicitly use `--execute` flag to delete
- **Detailed metrics**: Shows total games, orphaned count, sample IDs, duration
- **Batch processing**: Deletes 100 games at a time
- **Idempotent**: Safe to run multiple times
- **Expected behavior post-wipe**: Reports 0 orphaned games after database rebuild (2025-10-15)

**Output Example**:
```
=== ORPHANED GAME CLEANUP ===
Mode: DRY RUN
[BEFORE] Total games: 0
[FOUND] Orphaned games: 0
✅ No orphaned games found. Database is healthy!
📝 Note: This is expected immediately after the database wipe (2025-10-15).
```

### **6. CASCADE Delete Configuration**
All foreign keys in the schema are configured with `CASCADE` delete behavior:

```typescript
// Example: artists table foreign key
artistId: uuid('artist_id')
  .references(() => artists.id, { onDelete: 'cascade' })
  .notNull()
```

**Automatically Deleted Records** when a game_state is deleted:
- Artists (`artists` table)
- Songs (`songs` table)
- Projects (`projects` table)
- Releases (`releases` table)
- Release-Song mappings (`release_songs` table)
- Emails (`emails` table)
- Executives (`executives` table)
- Mood events (`mood_events` table)
- Weekly actions (`weekly_actions` table)
- Chart entries (`charts` table)
- Music label (`music_labels` table)

**Migration History**: Foreign keys were added and database was rebuilt on 2025-10-15 to ensure proper CASCADE configuration.

---

## 🔐 Authentication Implementation

### **Authentication & Authorization**
Authentication is handled entirely by **Clerk**. The client attaches a Clerk-issued JWT to every request via the shared `apiRequest()` helper (`client/src/lib/queryClient.ts`); the server verifies it with `requireClerkUser`, which populates `req.userId`.

Object-level authorization (ensuring a caller owns the game they're operating on) is handled by the shared `requireGameOwner` middleware (`server/middleware/requireGameOwner.ts`), added in Phase 1 to close an IDOR gap that previously required each route to hand-roll its own ownership check. It resolves the `gameId` from the route param (or body/query fallback for routes that carry it off-path), loads the game scoped to both that id AND `req.userId`, and returns 404 (not 403) on a mismatch so it never leaks whether a given `gameId` exists to a non-owner. On success it stashes the loaded row on `req.gameState` so the handler can reuse it without a second query. Routes whose id param isn't named `gameId` (e.g. `games.ts`'s `:id`) use `requireGameOwnerByParam('id')` instead.

```typescript
// Typical route wiring
router.get('/api/game/:gameId/...', requireClerkUser, requireGameOwner, async (req, res) => {
  // req.userId and req.gameState are both populated here
});
```

### **Input Validation Pattern**
All endpoints use Zod validation via the same `validateRequest<T>()` helper used above — parse the request against a shared schema, and let a thrown `z.ZodError` map to a 400 response in the route's catch block.

---

## 💾 Data Access Layer

### **Storage Abstraction**
The storage layer provides clean abstraction over database operations:

```typescript
// server/storage.ts
export class Storage {
  constructor(private db: Database) {}

  async getGameState(gameId: string): Promise<GameState | null> {
    const [gameState] = await this.db
      .select()
      .from(gameStates)
      .where(eq(gameStates.id, gameId));
    
    return gameState || null;
  }

  async createGameState(data: Omit<GameState, 'id'>): Promise<GameState> {
    const [gameState] = await this.db
      .insert(gameStates)
      .values({
        id: crypto.randomUUID(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return gameState;
  }

  async updateGameState(gameId: string, updates: Partial<GameState>): Promise<GameState> {
    const [gameState] = await this.db
      .update(gameStates)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(gameStates.id, gameId))
      .returning();
    
    return gameState;
  }

  // Related data fetching for complete game state
  async getGameStateWithRelated(gameId: string): Promise<{
    gameState: GameState;
    artists: Artist[];
    projects: Project[];
    roles: Role[];
    weeklyActions: WeeklyAction[];
  }> {
    const [gameState, artists, projects, roles, weeklyActions] = await Promise.all([
      this.getGameState(gameId),
      this.getArtistsByGame(gameId),
      this.getProjectsByGame(gameId),
      this.getRolesByGame(gameId),
      this.getWeeklyActions(gameId, currentWeek)
    ]);
    
    return { gameState, artists, projects, roles, weeklyActions };
  }

  // Individual Song Management (NEW: Phase 1 Enhancement)
  async getSongsByArtist(artistId: string, gameId: string): Promise<Song[]> {
    return await this.db.select().from(songs)
      .where(and(eq(songs.artistId, artistId), eq(songs.gameId, gameId)))
      .orderBy(desc(songs.createdAt));
  }

  async getReleasedSongs(gameId: string): Promise<Song[]> {
    return await this.db.select().from(songs)
      .where(and(
        eq(songs.gameId, gameId),
        eq(songs.isReleased, true)
      ))
      .orderBy(desc(songs.releaseMonth));
  }

  async updateSongs(songUpdates: { songId: string; [key: string]: any }[]): Promise<void> {
    // Batch update individual songs with new revenue/streaming metrics
    for (const update of songUpdates) {
      const { songId, ...updateData } = update;
      await this.db.update(songs)
        .set(updateData)
        .where(eq(songs.id, songId));
    }
  }

  async createSong(song: InsertSong): Promise<Song> {
    const [newSong] = await this.db.insert(songs).values({
      id: crypto.randomUUID(),
      ...song,
      createdAt: new Date()
    }).returning();
    return newSong;
  }
}
```

### **Database Connection Management**
Efficient connection handling with Drizzle ORM:

```typescript
// server/db.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@shared/schema';

// Railway PostgreSQL configuration
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return error after 10 seconds if connection cannot be acquired
  ssl: {
    rejectUnauthorized: false // Required for Railway's SSL certificates
  }
});

export const db = drizzle(pool, { schema });

// Connection pooling managed by pg Pool
// Supports concurrent connections for multiple users
```

### **Error Handling Strategy**
Comprehensive error handling with proper HTTP status codes:

```typescript
// Error response helper
export function createErrorResponse(
  errorCode: string,
  message: string,
  details?: any
) {
  return {
    error: {
      code: errorCode,
      message,
      details,
      timestamp: new Date().toISOString()
    }
  };
}

// Usage in route handlers
router.post('/api/advance-week', requireClerkUser, requireGameOwner, async (req, res) => {
  try {
    const request = validateRequest(AdvanceWeekRequest, req.body);
    const result = await advanceWeekService.advanceWeek(request);
    res.json(result);
    
  } catch (error) {
    console.error('Advance week error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json(createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid request data',
        error.errors
      ));
    }
    
    if (error.message.includes('Game not found')) {
      return res.status(404).json(createErrorResponse(
        'GAME_NOT_FOUND',
        'Game session not found'
      ));
    }
    
    res.status(500).json(createErrorResponse(
      'ADVANCE_WEEK_ERROR',
      'Failed to advance week'
    ));
  }
});
```

Week advancement runs inside a single database transaction with `SELECT ... FOR UPDATE` row locking on the game state (the "D6" hardening pass), so concurrent advance-week calls for the same game serialize instead of racing each other; a failure at any point rolls back the whole turn rather than leaving partial state.

---

## 🔐 Security Implementation

### **Authentication System**
Authentication is Clerk-only — there is no local username/password store, session table, or Passport strategy in this codebase. See "Authentication Implementation" above for the `requireClerkUser` + `requireGameOwner` middleware chain.

### **Data Protection**
```typescript
// SQL injection protection through Drizzle ORM
await db
  .select()
  .from(gameStates)
  .where(eq(gameStates.id, gameId)); // Parameterized query

// Input sanitization through Zod schemas
const sanitizedData = GameStateSchema.parse(userInput);

// Access control
if (gameState.userId !== req.userId) {
  return res.status(403).json({ message: 'Access denied' });
}
```

### **Environment Configuration**
```typescript
// Environment variables for security
const config = {
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000')
};

// HTTPS enforcement in production
if (config.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

---

## 📊 Performance Optimizations

### **Database Query Optimization**
```typescript
// Batch related data fetching
async getGameStateWithRelated(gameId: string) {
  // Use Promise.all for parallel queries
  const [gameState, artists, projects] = await Promise.all([
    this.getGameState(gameId),
    this.getArtistsByGame(gameId),
    this.getProjectsByGame(gameId)
  ]);
  
  return { gameState, artists, projects };
}

// Indexed queries for performance
// Database indexes created on:
// - game_states.user_id
// - artists.game_id
// - projects.game_id
// - weekly_actions.game_id
```

### **Caching Strategy**
```typescript
// Content caching (game data files)
class ServerGameData {
  private static instance: ServerGameData;
  private balanceConfig: any = null;
  
  // Singleton pattern for content caching
  static getInstance(): ServerGameData {
    if (!ServerGameData.instance) {
      ServerGameData.instance = new ServerGameData();
    }
    return ServerGameData.instance;
  }
  
  // Dynamic balance assembly (Updated September 8, 2025)
  async getBalanceConfig(): Promise<any> {
    if (!this.balanceConfig) {
      // Dynamically assembles from modular JSON files
      // See dataLoader.assembleBalanceData() for implementation
      const dataLoader = gameDataLoader;
      this.balanceConfig = await dataLoader.assembleBalanceData();
    }
    return this.balanceConfig;
  }
}
```

### **Request/Response Optimization**
```typescript
// Response compression
import compression from 'compression';
app.use(compression());

// Request size limits
app.use(express.json({ limit: '1mb' }));

// Response caching headers for static content
app.use('/api/data', (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
  next();
});
```

---

## 🔧 Development Tools

### **Environment Configuration**
```typescript
// Environment variables for development
const config = {
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev-secret',
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000')
};
```

### **Database Connection**
```typescript
// server/db.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@shared/schema';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Railway
});
export const db = drizzle(pool, { schema });
```

This backend implementation provides the server infrastructure for the Music Label Manager game with focus on practical development and deployment needs.