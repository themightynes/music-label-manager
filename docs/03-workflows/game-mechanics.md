# Game Mechanics Documentation

**Music Label Manager - Complete Game Systems**  
*Version: 1.0 (MVP Complete)*

---

## 🎮 Core Game Loop

The Music Label Manager is a **turn-based strategic simulation** where players manage a music label over a 12-month campaign. Each month, players select up to 3 actions and advance time to see results.

### **Monthly Turn Structure**
```
1. Action Selection Phase
   ├── View available actions (industry roles, projects, marketing)
   ├── Select up to 3 actions (limited by focus slots)
   └── Engage in role dialogues with immediate choices

2. Turn Processing Phase
   ├── GameEngine processes all selected actions
   ├── Apply immediate effects from dialogues
   ├── Calculate monthly operational costs
   ├── Progress ongoing projects automatically
   └── Check for random events and delayed effects

3. Results Phase
   ├── Display month summary (revenue, expenses, net income)
   ├── Update dashboard with new resources
   ├── Show access tier progression
   └── Check for campaign completion (month 12)
```

---

## 💰 Resource Management

### **Primary Resources**

#### **Money (Starting: $75,000)**
- **Sources**: Project revenue, dialogue bonuses, marketing success
- **Expenses**: Artist signing costs, monthly operational burn, project budgets
- **Monthly Burn**: $3,000-$6,000 base + $800-$1,500 per signed artist
- **Game Over**: No explicit bankruptcy, but low money limits options

#### **Reputation (Range: 0-100, Starting: 5)**
- **Sources**: Successful projects, positive press, good artist relationships
- **Uses**: Unlocks access tiers, affects project success rates
- **Progression Gates**:
  - 25+ reputation: Second artist slot unlocked
  - 50+ reputation: Fourth focus slot unlocked
  - 75+ reputation: Maximum access tiers available

#### **Creative Capital (Range: 0-100, Starting: 10)**
- **Sources**: Artist collaborations, creative project choices
- **Uses**: Project quality bonuses, special dialogue options
- **Regeneration**: Slowly increases through artist interactions

#### **Focus Slots (Starting: 3, Max: 4)**
- **Limitation**: Maximum actions per month
- **Expansion**: Unlock 4th slot at 50+ reputation
- **Reset**: Available slots reset to maximum each month

### **Access Tiers System**
Access tiers unlock based on reputation and provide multiplicative benefits:

#### **Playlist Access**
```
None (0+ rep)     → 0.1x reach multiplier
Niche (15+ rep)   → 0.5x reach multiplier  
Mid (50+ rep)     → 1.0x reach multiplier
```

#### **Press Access**  
```
None (0+ rep)     → 5% pickup chance
Blogs (25+ rep)   → 15% pickup chance
Mid-Tier (60+ rep) → 35% pickup chance
```

#### **Venue Access**
```
None (0+ rep)     → No touring available
Clubs (40+ rep)   → 100-300 capacity venues
```

---

## 🎤 Artist Management System

### **Artist Discovery & Signing**
Players can discover and sign up to 3 artists from a pool of 6 available options:

#### **Artist Pool**
```typescript
const availableArtists = [
  {
    name: "Nova Sterling",
    archetype: "Visionary",
    genre: "Experimental Pop", 
    talent: 85,
    signingCost: 8000,
    monthlyCost: 1200,
    traits: ["perfectionist", "social_media_savvy"]
  },
  {
    name: "Mason Rivers", 
    archetype: "Workhorse",
    genre: "Folk Rock",
    talent: 78,
    signingCost: 6000,
    monthlyCost: 900,
    traits: ["reliable", "touring_focused"]
  }
  // ... 4 more artists
];
```

#### **Artist Archetypes**
- **Visionary**: High talent, experimental, higher costs, creative bonuses
- **Workhorse**: Reliable, consistent output, moderate costs, project efficiency
- **Trendsetter**: Commercial appeal, social media savvy, marketing bonuses

### **Artist Economics**
- **Signing Costs**: $4,000-$15,000 one-time payment
- **Monthly Costs**: $600-$2,000 per artist per month
- **ROI Calculation**: Projects generate revenue based on artist talent + label support

### **Artist Relationships**
```typescript
interface ArtistRelationship {
  mood: number;        // 0-100, affects project quality
  loyalty: number;     // 0-100, affects contract renewals
  popularity: number;  // 0-100, affects project success
}
```

**Relationship Factors**:
- **Dialogue Choices**: Supportive vs. demanding approaches
- **Project Success**: Successful releases improve mood/loyalty
- **Resource Investment**: Budget allocation affects relationships

---

## 🎵 Project System

### **Project Types & Economics**

#### **Single Release**
- **Budget**: $3,000-$12,000
- **Timeline**: 2 months (planning → production → marketing → released)
- **Revenue Potential**: $5,000-$25,000 based on individual song quality
- **Individual Song Revenue Formula** ✅ SINGLE SOURCE OF TRUTH - GameEngine ONLY:
  ```typescript
  // ✅ MIGRATION COMPLETE: ALL processing in GameEngine with NO duplicate logic
  // ALL economic calculations moved from gameData.ts and routes.ts to GameEngine
  
  // GameEngine.calculateEnhancedProjectCost() - moved from gameData.ts
  // GameEngine.calculatePerSongProjectCost() - moved from gameData.ts
  // GameEngine.calculateEconomiesOfScale() - moved from gameData.ts
  
  // Configuration-driven calculations using balance.json
  const streamingConfig = getStreamingConfigSync();
  
  // Each song calculated individually by GameEngine ONLY
  const songInitialStreams = songQuality * 50 * (1 + Math.max(0, (songQuality - 40) / 60));
  const songInitialRevenue = songInitialStreams * 0.5; // $0.50 per stream on release
  
  // Monthly ongoing revenue (15% decay using balance.json configuration)
  const monthlyDecay = Math.pow(streamingConfig.monthly_decay_rate, monthsSinceRelease); // 0.85 from balance.json
  const monthlyStreams = initialStreams * monthlyDecay * reputationBonus * accessBonus * 0.8;
  const monthlyRevenue = monthlyStreams * streamingConfig.revenue_per_stream; // 0.05 from balance.json
  
  // Project total = sum of all individual songs (calculated by GameEngine only)
  const projectRevenue = songs.reduce((sum, song) => sum + song.totalRevenue, 0);
  ```

#### **EP Release**
- **Budget**: $15,000-$35,000
- **Timeline**: 4 months
- **Revenue Potential**: $20,000-$80,000
- **Quality Bonus**: +25% base quality due to expanded content

#### **Mini-Tour**
- **Budget**: $5,000-$15,000
- **Timeline**: 1 month
- **Revenue Calculation**:
  ```typescript
  const venueCapacity = getVenueCapacity(venueAccess); // 100-300 for clubs
  const sellThrough = 0.6 + (reputation * 0.01) + (artistPopularity * 0.005);
  const ticketPrice = 25 + (venueCapacity * 0.05);
  const revenue = venueCapacity * sellThrough * ticketPrice * numberOfCities;
  ```

### **Project Progression** ✅ SINGLE SOURCE OF TRUTH ACHIEVED
Projects advance through stages with GameEngine handling ALL business logic:

```typescript
const stages = ['planning', 'production', 'marketing', 'released'];

// ✅ MIGRATION COMPLETE: GameEngine handles ALL project advancement logic
// GameEngine.advanceProjectStages() - moved from routes.ts
if (monthsElapsed >= 1 && stage === 'planning') stage = 'production';
if (monthsElapsed >= 2 && stage === 'production') stage = 'marketing';  
if (monthsElapsed >= 3 && stage === 'marketing') stage = 'released';

// Quality increases each stage (GameEngine ONLY)
quality = Math.min(100, quality + 25);

// GAMEENGINE RESPONSIBILITY: ALL business logic consolidated
// - GameEngine.advanceProjectStages() - project advancement (moved from routes.ts)
// - GameEngine.processNewlyReleasedProjects() - song release processing
// - GameEngine.calculateEnhancedProjectCost() - economic calculations (moved from gameData.ts)
// - GameEngine.calculatePerSongProjectCost() - cost calculations (moved from gameData.ts)
// - GameEngine.calculateEconomiesOfScale() - scaling calculations (moved from gameData.ts)

// ROUTES.TS: HTTP handling and database transactions ONLY
// GAMEDATA.TS: JSON data access ONLY (NO calculations)
```

### **Economic Decision System** ✅ NEW - PHASE 2
Players make three strategic economic decisions when creating projects that directly impact song quality and costs:

#### **Budget Per Song Allocation**
- **Range**: $1,000 - $50,000 per song
- **Quality Impact**: Efficiency breakpoints determine budget effectiveness
  ```typescript
  const budgetRatio = budgetPerSong / minViableCost;
  const budgetBonus = budgetRatio < 0.5 ? -5 :     // Under-funded penalty
                      budgetRatio < 0.75 ? 0 :      // Minimal budget
                      budgetRatio < 1.0 ? 3 :       // Adequate budget  
                      budgetRatio < 1.5 ? 7 :       // Strong budget
                                         5;         // Diminishing returns
  ```
- **Strategic Consideration**: Diminishing returns above 150% of minimum viable cost

#### **Producer Tier Selection**
- **Local**: No bonus, 1.0x cost multiplier
- **Regional**: +5 quality bonus, 1.8x cost multiplier  
- **National**: +12 quality bonus, 3.2x cost multiplier
- **Legendary**: +20 quality bonus, 5.5x cost multiplier
- **Availability**: Higher tiers unlock based on label reputation

#### **Time Investment Approach**
- **Rushed**: -10 quality, 0.7x cost, 0.8x duration (fast but lower quality)
- **Standard**: No modifiers (baseline approach)
- **Extended**: +8 quality, 1.4x cost, 1.3x duration (high quality investment)
- **Perfectionist**: +15 quality, 2.1x cost, 1.6x duration (maximum quality focus)

#### **Quality Calculation Formula**
```typescript
const finalQuality = Math.min(100, 
  baseQuality +                    // Random base (40-60)
  artistMoodBonus +                // Artist happiness (+0 to +20)
  producerBonus +                  // Producer tier bonus (+0 to +20)
  timeBonus +                      // Time investment bonus (-10 to +15)
  budgetBonus +                    // Budget efficiency bonus (-5 to +7)
  songCountImpact                  // Multi-song project impact (0.85x to 1.0x)
);
```

### **Project Success Factors**
- **Artist Talent**: Base multiplier for all calculations
- **Economic Decisions**: Budget, producer, and time choices directly affect song quality ✅ NEW
- **Label Reputation**: Affects playlist placement and press coverage
- **Access Tiers**: Multiplicative bonuses to reach and success rates
- **Timing**: Market conditions and seasonal factors (future feature)

---

## 🤝 Dialogue & Role System

### **Industry Roles**
Players interact with 8 industry professionals, each with unique benefits:

#### **Core Roles**
1. **Sarah Mitchell (Manager)**
   - **Meetings**: Strategy planning, artist development, industry connections
   - **Benefits**: Reputation bonuses, artist relationship improvements
   - **Dialogue Topics**: "Strategic priorities", "Artist development", "Industry networking"

2. **Marcus Chen (A&R Representative)**
   - **Meetings**: Artist scouting, talent evaluation, label connections
   - **Benefits**: Artist discovery bonuses, talent assessment
   - **Dialogue Topics**: "Single choice discussions", "Artist potential", "Market trends"

3. **Elena Rodriguez (Producer)**
   - **Meetings**: Project quality, creative direction, technical expertise
   - **Benefits**: Project quality bonuses, creative capital increases
   - **Dialogue Topics**: "Production approaches", "Creative vision", "Technical standards"

4. **David Kim (PR Specialist)**
   - **Meetings**: Press strategy, media relations, publicity campaigns
   - **Benefits**: Press access improvements, reputation boosts
   - **Dialogue Topics**: "Media strategy", "Press relationships", "Public image"

5. **Lisa Thompson (Digital Marketing)**
   - **Meetings**: Online presence, social media, digital campaigns
   - **Benefits**: Streaming bonuses, digital reach improvements
   - **Dialogue Topics**: "Digital strategy", "Platform optimization", "Audience engagement"

6. **Ryan Jackson (Streaming Curator)**
   - **Meetings**: Playlist placement, streaming optimization
   - **Benefits**: Playlist access tier progression
   - **Dialogue Topics**: "Playlist strategy", "Streaming optimization", "Curator relationships"

7. **Amanda Foster (Booking Agent)**
   - **Meetings**: Tour planning, venue relationships, routing
   - **Benefits**: Venue access improvements, tour revenue bonuses
   - **Dialogue Topics**: "Tour planning", "Venue relationships", "Market expansion"

8. **Chris Park (Operations Manager)**
   - **Meetings**: Business efficiency, cost management, workflow optimization
   - **Benefits**: Operational cost reductions, efficiency improvements
   - **Dialogue Topics**: "Operational efficiency", "Cost management", "Workflow optimization"

### **Dialogue Mechanics**

#### **Choice Types**
```typescript
interface DialogueChoice {
  id: string;
  text: string;
  effects_immediate?: {
    money?: number;
    reputation?: number;
    creative_capital?: number;
  };
  effects_delayed?: {
    trigger_month: number;
    money?: number;
    reputation?: number;
  };
}
```

#### **Example Dialogue Tree**
```json
{
  "role": "manager",
  "meeting": "monthly_check_in",
  "prompt": "How should we approach our strategic priorities this month?",
  "choices": [
    {
      "id": "aggressive_growth",
      "text": "Focus on aggressive growth and expansion",
      "effects_immediate": { "money": -1000, "reputation": 3 },
      "effects_delayed": { "trigger_month": 3, "money": 5000 }
    },
    {
      "id": "steady_building", 
      "text": "Take a steady, sustainable approach",
      "effects_immediate": { "reputation": 1, "creative_capital": 2 },
      "effects_delayed": { "trigger_month": 2, "reputation": 2 }
    },
    {
      "id": "cost_cutting",
      "text": "Focus on cost management and efficiency", 
      "effects_immediate": { "money": 1500 },
      "effects_delayed": { "trigger_month": 4, "reputation": -1 }
    }
  ]
}
```

#### **Dialogue Integration**
1. **Action Selection**: Player clicks role meeting → opens DialogueModal
2. **Choice Selection**: Player selects dialogue option → immediate effects applied
3. **Action Recording**: Choice recorded for month processing
4. **Delayed Effects**: Stored in game flags, triggered in future months

---

## ⚖️ Game Balance System

### **Economic Balance** ✅ SINGLE SOURCE OF TRUTH COMPLETE
**ARCHITECTURE**: All economic calculations consolidated in GameEngine with ZERO duplication:
- ✅ **GameEngine**: ALL business logic (project advancement, economic calculations, revenue processing)
- ✅ **Routes.ts**: HTTP handling ONLY (delegates everything to GameEngine)
- ✅ **GameData.ts**: Pure data access ONLY (NO calculations or business logic)

```json
{
  "starting_resources": {
    "money": 75000,
    "reputation": 5,
    "creative_capital": 10,
    "focus_slots": 3
  },
  "monthly_costs": {
    "base_operational": [3000, 6000],
    "artist_monthly": [800, 1500],
    "project_overhead": 0.1
  },
  "project_costs": {
    "single": { "min": 3000, "max": 12000 },
    "ep": { "min": 15000, "max": 35000 },
    "mini_tour": { "min": 5000, "max": 15000 }
  },
  "ongoing_streams": {
    "revenue_per_stream": 0.05,
    "monthly_decay_rate": 0.85
  },
  "streaming": {
    "base_streams_per_point": 50,
    "quality_weight": 0.8,
    "playlist_weight": 1.0,
    "reputation_weight": 0.5
  }
}
```

### **RNG System**
Deterministic randomness using seeded random number generation:

```typescript
// Seed format: gameId-currentMonth ensures consistent outcomes
const seed = `${gameState.id}-${gameState.currentMonth}`;
const rng = seedrandom(seed);

// All random calculations use this seeded RNG
const variance = rng() * 0.2 + 0.9; // 90%-110% variance
const outcome = baseValue * variance;
```

### **Progression Gates**
Key unlocks tied to reputation milestones:

```typescript
const progressionGates = {
  second_artist_slot: 25,      // reputation
  fourth_focus_slot: 50,       // reputation  
  playlist_niche_access: 15,   // reputation
  playlist_mid_access: 50,     // reputation
  press_blog_access: 25,       // reputation
  press_mid_access: 60,        // reputation
  venue_club_access: 40        // reputation
};
```

---

## 🎯 Campaign Completion & Scoring

### **Campaign Structure**
- **Duration**: 12 months exactly
- **Goal**: Build successful music label and achieve high score
- **End Trigger**: Automatic completion when advancing from month 12

### **Scoring System**
Final score calculated from multiple factors:

```typescript
const scoreBreakdown = {
  money: Math.floor(finalMoney / 1000),           // 1 point per $1k
  reputation: Math.floor(finalReputation / 5),    // 1 point per 5 reputation
  artistsSuccessful: countSuccessfulArtists(),    // Based on artist metrics
  projectsCompleted: countCompletedProjects(),    // Based on project outcomes
  accessTierBonus: calculateAccessTierBonus()    // Bonus for tier progression
};

const finalScore = Object.values(scoreBreakdown).reduce((sum, score) => sum + score, 0);
```

### **Victory Types**
Determined by score distribution and final state:

- **Commercial Success**: High money score, moderate reputation
- **Critical Acclaim**: High reputation score, moderate money  
- **Balanced Growth**: Even distribution across metrics
- **Survival**: Completed campaign with minimal success
- **Failure**: Negative money or very low overall score

### **Achievements System**
Dynamic achievements based on performance:

```typescript
const achievements = [];

if (finalMoney >= 100000) achievements.push('💰 Big Money - Ended with $100k+');
if (finalReputation >= 200) achievements.push('⭐ Industry Legend - 200+ Reputation');
if (playlistAccess === 'Mid') achievements.push('🎵 Playlist Master - Maximum playlist access');
if (finalMoney >= 0) achievements.push('🛡️ Survivor - Made it through 12 months');
```

---

## 🎵 Individual Song System (Phase 1 Enhancement)

### **Core Concept**
Each song in recording projects (Singles, EPs) is tracked individually with its own quality, streams, and revenue metrics. This enables realistic music industry mechanics where individual songs can become hits and carry entire projects.

### **Song Generation Process**
1. **During Recording Projects**: 2-3 songs created per month in production stage
2. **Quality Assignment**: Each song gets individual quality score (20-100) based on:
   - Artist talent level
   - Producer tier effects  
   - Random variation for diversity
3. **Song Properties**: Title, genre, mood, creation month
4. **Project Association**: Songs linked to their recording session via metadata

### **Individual Revenue Calculation**

#### **Release Revenue (Month Released)**
```typescript
// Each song calculated separately
const qualityBonus = Math.max(0, (songQuality - 40) / 60);
const initialStreams = Math.round(songQuality * 50 * (1 + qualityBonus));
const initialRevenue = Math.round(initialStreams * 0.5); // $0.50 per initial stream

// Example: Quality 67 song
// qualityBonus = (67 - 40) / 60 = 0.45
// initialStreams = 67 * 50 * (1 + 0.45) = 4,858 streams  
// initialRevenue = 4,858 * 0.5 = $2,429
```

#### **Ongoing Revenue (Each Month After Release)**
```typescript
// Individual monthly decay calculation
const monthsSinceRelease = currentMonth - song.releaseMonth;
const baseDecay = Math.pow(0.85, monthsSinceRelease); // 15% monthly decline
const monthlyStreams = song.initialStreams * baseDecay * reputationBonus * accessBonus * 0.8;
const monthlyRevenue = Math.round(monthlyStreams * 0.05); // $0.05 per ongoing stream

// Revenue stops when below $1 threshold or after 24 months
```

### **Project Aggregation**
Recording projects display **sum of individual song metrics**:
- **Total Revenue**: Sum of all song revenues
- **Total Streams**: Sum of all song streams  
- **Song Count**: Number of songs in the project
- **Last Month Revenue**: Sum of all song monthly revenues

### **UI Display**

#### **Song Catalog (Artist Info)**
- **Individual song cards** with quality, streams, revenue
- **Monthly performance** tracking per song
- **Release month** and total metrics
- **Aggregated artist totals** across all songs

#### **Project Boxes (Active Projects)**
- **Project-level aggregates** calculated from individual songs
- **"Individual song tracking active"** indicator
- **Backward compatibility** with legacy project-based data

### **Strategic Implications**
- **Hit Song Effect**: High-quality individual songs can make projects highly profitable
- **Quality Distribution**: Projects with mixed quality create realistic revenue patterns  
- **Long-term Revenue**: Individual songs continue generating revenue with natural decay
- **Song-by-Song Analysis**: Players can identify which songs perform best
- **Portfolio Management**: Build catalog of consistently performing individual tracks

### **Technical Benefits**
- **Realistic Simulation**: Matches actual music industry economics
- **Granular Tracking**: Detailed analytics for strategic decisions
- **Scalable System**: Foundation for advanced features (remixes, re-releases, compilations)
- **Data Rich**: Comprehensive metrics for complex business decisions

---

## 🔄 Advanced Mechanics

### **Delayed Effects System**
Actions can have consequences that trigger in future months:

```typescript
// Store delayed effect in game flags
const delayedEffect = {
  triggerMonth: currentMonth + 2,
  effects: { money: 3000, reputation: 5 },
  description: "Magazine feature boost"
};

gameState.flags[`delayed_${choiceId}`] = delayedEffect;

// Process delayed effects each month
const triggeredEffects = Object.values(gameState.flags)
  .filter(effect => effect.triggerMonth === currentMonth);
```

### **Artist Relationship Dynamics**
Artist mood and loyalty affect project outcomes:

```typescript
// Project quality modified by artist mood
const moodMultiplier = 0.8 + (artistMood / 100) * 0.4; // 80%-120%
const finalQuality = baseQuality * moodMultiplier;

// Loyalty affects contract renewal likelihood (future feature)
const renewalChance = 0.5 + (artistLoyalty / 100) * 0.5; // 50%-100%
```

### **Market Dynamics**
Access tiers create multiplicative benefits:

```typescript
// Playlist placement calculation
const baseReach = 1000;
const playlistMultiplier = accessTiers.playlist[currentTier].reach_multiplier;
const finalReach = baseReach * playlistMultiplier * qualityFactor;

// Press pickup calculation  
const baseChance = 0.05;
const accessChance = accessTiers.press[currentTier].pickup_chance;
const finalChance = baseChance + accessChance + (reputation * 0.01);
```

---

## 🎲 Random Events (Future Feature)

### **Event System Framework**
Random events add variability and narrative to campaigns:

```typescript
interface GameEvent {
  id: string;
  title: string;
  description: string;
  trigger_chance: number;
  requirements?: {
    min_reputation?: number;
    required_artists?: number;
  };
  effects: {
    immediate?: ResourceEffects;
    delayed?: DelayedEffect[];
  };
}
```

### **Event Categories**
- **Industry Events**: Award shows, festival opportunities, label competitions
- **Artist Events**: Creative breakthroughs, personal challenges, collaboration offers
- **Market Events**: Streaming platform changes, industry trends, economic shifts
- **Random Events**: Unexpected opportunities, technical issues, viral moments

---

This comprehensive game mechanics documentation ensures that developers can understand, modify, and extend the game systems effectively. The balance between complexity and playability is maintained through clear formulas and predictable progression systems.