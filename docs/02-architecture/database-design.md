# Database Design

**Music Label Manager - Complete Database Architecture**  
*Version: 1.0 (MVP Complete)*

---

## 🗃️ Database Overview

The Music Label Manager uses **PostgreSQL** with **Drizzle ORM** for type-safe database operations. The schema is designed for flexibility, scalability, and data integrity.

**Key Design Principles**:
- **UUID Primary Keys**: Distributed system compatibility and security
- **JSONB Storage**: Flexible data for evolving game mechanics
- **Foreign Key Integrity**: Strict relationships between entities
- **Transaction Safety**: Atomic operations for complex game state changes

---

## 📊 Complete Schema

### **Core Tables**

#### **users** - User Authentication
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_username ON users(username);
```

**Purpose**: User authentication and account management  
**Key Features**: Bcrypt password hashing, unique usernames, audit timestamps

#### **game_states** - Core Game Session Data
```sql
CREATE TABLE game_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Game Progress
  current_month INTEGER DEFAULT 1,
  campaign_completed BOOLEAN DEFAULT FALSE,
  campaign_type VARCHAR(50) DEFAULT 'standard',
  
  -- Resources
  money INTEGER DEFAULT 75000,
  reputation INTEGER DEFAULT 5,
  creative_capital INTEGER DEFAULT 10,
  
  -- Focus System
  focus_slots INTEGER DEFAULT 3,
  used_focus_slots INTEGER DEFAULT 0,
  
  -- Access Tiers
  playlist_access VARCHAR(50) DEFAULT 'none',
  press_access VARCHAR(50) DEFAULT 'none',
  venue_access VARCHAR(50) DEFAULT 'none',
  
  -- Flexible Data
  rng_seed VARCHAR(255) NOT NULL,
  flags JSONB DEFAULT '{}',
  monthly_stats JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_game_states_user_id ON game_states(user_id);
CREATE INDEX idx_game_states_current_month ON game_states(current_month);
CREATE INDEX idx_game_states_updated_at ON game_states(updated_at);
```

**Purpose**: Primary game session state and progression tracking  
**Key Features**: Resource management, access tier progression, flexible JSONB for game flags

#### **artists** - Signed Artists and Relationships
```sql
CREATE TABLE artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES game_states(id) ON DELETE CASCADE,
  
  -- Artist Identity
  name VARCHAR(255) NOT NULL,
  archetype VARCHAR(100) NOT NULL, -- 'Visionary', 'Workhorse', 'Trendsetter'
  genre VARCHAR(255),
  
  -- Core Stats
  talent INTEGER NOT NULL,
  loyalty INTEGER DEFAULT 50,
  mood INTEGER DEFAULT 50,
  popularity INTEGER DEFAULT 0,
  
  -- Economic Data
  signing_cost INTEGER DEFAULT 0,
  monthly_cost INTEGER DEFAULT 1200,
  signed_month INTEGER DEFAULT 1,
  is_signed BOOLEAN DEFAULT TRUE,
  
  -- Flexible Data
  traits JSONB DEFAULT '[]',
  history JSONB DEFAULT '[]',
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_artists_game_id ON artists(game_id);
CREATE INDEX idx_artists_archetype ON artists(archetype);
CREATE INDEX idx_artists_signed_month ON artists(signed_month);
```

**Purpose**: Artist roster management and relationship tracking  
**Key Features**: Multi-archetype system, mood/loyalty mechanics, economic modeling

#### **projects** - Music Production Projects
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES game_states(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES artists(id) ON DELETE SET NULL,
  
  -- Project Identity
  title VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL, -- 'single', 'ep', 'mini-tour'
  genre VARCHAR(255),
  
  -- Production Data
  stage VARCHAR(100) DEFAULT 'planning', -- 'planning', 'production', 'marketing', 'released'
  quality INTEGER DEFAULT 0,
  budget INTEGER DEFAULT 0,
  budget_used INTEGER DEFAULT 0,
  
  -- Timeline
  start_month INTEGER NOT NULL,
  due_month INTEGER,
  completed_month INTEGER,
  
  -- Results
  streams INTEGER DEFAULT 0,
  revenue INTEGER DEFAULT 0,
  press_pickups INTEGER DEFAULT 0,
  
  -- Flexible Data
  metadata JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_projects_game_id ON projects(game_id);
CREATE INDEX idx_projects_artist_id ON projects(artist_id);
CREATE INDEX idx_projects_stage ON projects(stage);
CREATE INDEX idx_projects_start_month ON projects(start_month);
```

**Purpose**: Music production lifecycle management  
**Key Features**: Multi-stage progression, budget tracking, performance metrics

#### **monthly_actions** - Player Action History
```sql
CREATE TABLE monthly_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES game_states(id) ON DELETE CASCADE,
  
  -- Action Context
  month INTEGER NOT NULL,
  action_type VARCHAR(100) NOT NULL, -- 'role_meeting', 'start_project', 'marketing', etc.
  
  -- Action Target (optional UUIDs)
  target_id UUID, -- Can reference artists, projects, or be NULL for general actions
  choice_id UUID, -- For dialogue choices
  
  -- Action Results
  results JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_monthly_actions_game_id ON monthly_actions(game_id);
CREATE INDEX idx_monthly_actions_month ON monthly_actions(month);
CREATE INDEX idx_monthly_actions_action_type ON monthly_actions(action_type);
```

**Purpose**: Complete action history and analytics  
**Key Features**: Flexible action types, JSONB results for varied outcomes

#### **game_saves** - Save Game System
```sql
CREATE TABLE game_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Save Metadata
  name VARCHAR(255) NOT NULL,
  month INTEGER NOT NULL,
  is_autosave BOOLEAN DEFAULT FALSE,
  
  -- Game State Snapshot
  game_state JSONB NOT NULL,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_game_saves_user_id ON game_saves(user_id);
CREATE INDEX idx_game_saves_created_at ON game_saves(created_at DESC);
```

**Purpose**: Save/load functionality with complete game state snapshots  
**Key Features**: JSONB storage for entire game state, autosave support

---

## 🔗 Relationships & Data Integrity

### **Relationship Diagram**
```
users (1) ──────────────── (many) game_states
  │                              │
  └──── (many) game_saves        ├── (many) artists
                                 ├── (many) projects  
                                 └── (many) monthly_actions
                                 
artists (1) ─────── (many) projects (via artist_id)
```

### **Cascade Behavior**
- **User deletion**: All game states, saves, and related data deleted (CASCADE)
- **Game state deletion**: All artists, projects, actions deleted (CASCADE)  
- **Artist deletion**: Projects keep reference but artist_id set to NULL (SET NULL)

### **Data Integrity Rules**
1. **Foreign Key Constraints**: Enforced at database level
2. **Check Constraints**: Money >= 0, reputation between 0-100
3. **Unique Constraints**: Username uniqueness, save name per user
4. **Not Null Constraints**: Essential fields like game_id, user_id

---

## 💾 JSONB Usage Patterns

### **game_states.flags** - Game State Flags
```json
{
  "signed_artists_count": 2,
  "second_artist_unlocked": true,
  "story_flags": {
    "met_producer": true,
    "completed_first_single": true
  },
  "delayed_effects": [
    {
      "triggerMonth": 6,
      "effects": { "reputation": 5, "money": 2000 },
      "description": "Magazine feature boost"
    }
  ]
}
```

### **game_states.monthly_stats** - Performance Tracking
```json
{
  "month_1": {
    "revenue": 5000,
    "expenses": 8000,
    "net_income": -3000,
    "actions_taken": ["meet_manager", "meet_anr", "start_single"]
  },
  "month_2": {
    "revenue": 12000,
    "expenses": 9000,
    "net_income": 3000,
    "actions_taken": ["meet_producer", "marketing_push", "meet_operations"]
  }
}
```

### **artists.traits** - Artist Characteristics
```json
[
  { "trait": "perfectionist", "effect": "+quality, -speed" },
  { "trait": "social_media_savvy", "effect": "+marketing_effectiveness" },
  { "trait": "touring_focused", "effect": "+tour_revenue" }
]
```

### **projects.metadata** - Project-Specific Data
```json
{
  "marketing_spend": 5000,
  "collaborators": ["Producer X", "Mixer Y"],
  "release_strategy": "streaming_first",
  "playlist_placements": ["Indie Rock Rising", "New Music Friday"],
  "press_coverage": [
    { "outlet": "Pitchfork", "score": 7.2 },
    { "outlet": "Rolling Stone", "mention": "brief" }
  ]
}
```

### **monthly_actions.results** - Action Outcomes
```json
{
  "immediate_effects": {
    "money": 2000,
    "reputation": 3,
    "creative_capital": 1
  },
  "delayed_effects": {
    "trigger_month": 8,
    "money": 5000,
    "description": "Playlist placement revenue"
  },
  "dialogue_choice": "supportive_approach",
  "role_relationship_change": 5
}
```

---

## 🔄 Database Operations Patterns

### **Game State Updates (Transactional)**
```typescript
// All game state changes use database transactions
await db.transaction(async (tx) => {
  // 1. Update game state
  const [updatedGameState] = await tx
    .update(gameStates)
    .set({ 
      currentMonth: newMonth,
      money: newMoney,
      reputation: newReputation,
      flags: updatedFlags 
    })
    .where(eq(gameStates.id, gameId))
    .returning();
  
  // 2. Record monthly actions
  await tx.insert(monthlyActions).values(actionRecords);
  
  // 3. Update related entities (artists, projects)
  await tx.update(projects)
    .set({ stage: 'production' })
    .where(eq(projects.gameId, gameId));
});
```

### **Artist Signing (Economic Transaction)**
```typescript
await db.transaction(async (tx) => {
  // 1. Verify sufficient funds
  const gameState = await tx.select().from(gameStates).where(eq(gameStates.id, gameId));
  if (gameState.money < signingCost) throw new Error('Insufficient funds');
  
  // 2. Create artist record
  const artist = await tx.insert(artists).values(artistData).returning();
  
  // 3. Deduct signing cost
  await tx.update(gameStates)
    .set({ money: gameState.money - signingCost })
    .where(eq(gameStates.id, gameId));
  
  // 4. Update game flags
  const flags = { ...gameState.flags, signed_artists_count: artistCount + 1 };
  await tx.update(gameStates).set({ flags }).where(eq(gameStates.id, gameId));
});
```

### **Save Game Creation**
```typescript
await db.insert(gameSaves).values({
  userId: req.userId,
  name: saveName,
  month: gameState.currentMonth,
  gameState: {
    gameState: gameState,
    artists: artists,
    projects: projects,
    roles: roles
  }
});
```

---

## 📈 Performance Considerations

### **Current Indexes**
- **Primary lookups**: All foreign key relationships indexed
- **Game queries**: game_id, user_id, current_month indexed
- **Time-based**: created_at, updated_at for audit queries
- **Type filtering**: action_type, archetype, stage for categorization

### **Query Optimization Patterns**
1. **Single game state query**: Includes related data in one request
2. **Monthly action batching**: Insert multiple actions in single transaction
3. **JSONB querying**: Use GIN indexes for complex JSONB queries (future)
4. **Connection pooling**: Drizzle handles connection management

### **Future Scaling Considerations**
- **Read replicas**: Analytics and reporting on separate instances
- **Partitioning**: monthly_actions table by month for large datasets
- **Archiving**: Completed campaigns moved to cold storage
- **Caching**: Redis layer for frequently accessed game data

---

## 🛡️ Security & Data Protection

### **Access Control**
- **Row-level security**: Users can only access their own game data
- **Input validation**: Zod schemas validate all data before database
- **SQL injection protection**: Drizzle ORM parameterized queries
- **Cascade controls**: Proper deletion behavior prevents orphaned data

### **Data Integrity**
- **Foreign key constraints**: Prevent invalid references
- **Check constraints**: Enforce business rules (money >= 0)
- **Transaction isolation**: Prevent race conditions in concurrent access
- **Backup strategies**: Regular automated backups (production requirement)

### **Audit Trail**
- **Created/updated timestamps**: All tables track modification times
- **Action history**: Complete player action log in monthly_actions
- **Game state snapshots**: Save system provides point-in-time recovery

---

## 🔧 Migration Strategy

### **Schema Evolution**
- **Drizzle migrations**: Version-controlled schema changes
- **Backward compatibility**: JSONB fields allow gradual feature rollout
- **Data migration scripts**: Transform existing data during upgrades
- **Zero-downtime deployments**: Migrations designed for online execution

### **Current Migration Files**
```typescript
// Example: Adding new artist trait system
export async function up(db: NodePgDatabase) {
  await db.execute(sql`
    ALTER TABLE artists 
    ADD COLUMN traits JSONB DEFAULT '[]'
  `);
}

export async function down(db: NodePgDatabase) {
  await db.execute(sql`
    ALTER TABLE artists 
    DROP COLUMN traits
  `);
}
```

---

This database design provides a solid foundation for the current MVP and is architected to scale efficiently as the game grows in complexity and user base. The combination of structured relational data and flexible JSONB storage allows for both data integrity and rapid feature development.