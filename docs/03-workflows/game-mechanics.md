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
- **Revenue Potential**: $5,000-$25,000 based on quality and marketing
- **Streaming Formula**:
  ```typescript
  const streams = (quality * 0.8) + (playlistAccess * 100) + (reputation * 0.5) + (marketingSpend * 0.3);
  const revenue = streams * 0.003; // $0.003 per stream
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

### **Project Progression**
Projects automatically advance through stages each month:

```typescript
const stages = ['planning', 'production', 'marketing', 'released'];

// Progression logic (in GameEngine)
if (monthsElapsed >= 1 && stage === 'planning') stage = 'production';
if (monthsElapsed >= 2 && stage === 'production') stage = 'marketing';  
if (monthsElapsed >= 3 && stage === 'marketing') stage = 'released';

// Quality increases each stage
quality = Math.min(100, quality + 25);
```

### **Project Success Factors**
- **Artist Talent**: Base multiplier for all calculations
- **Budget Investment**: Higher budgets improve quality and marketing reach
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

### **Economic Balance**
All economic calculations are driven by `/data/balance.json`:

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
  "revenue_formulas": {
    "streaming": {
      "base_streams_per_point": 1000,
      "quality_weight": 0.8,
      "playlist_weight": 1.0,
      "reputation_weight": 0.5,
      "revenue_per_stream": 0.003
    }
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