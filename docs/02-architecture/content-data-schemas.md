# Content Data Schemas

**Music Label Manager - JSON Content Structure**  
*Technical Reference*

---

## 📂 Data File Structure

The game uses JSON files in `/data/` for all content, separated by concern:

```
data/
├── balance.ts           # Browser-only TypeScript aggregator (Vite import)
├── balance.json         # [DEPRECATED] Compiled balance (no longer needed)
├── balance/             # Modular balance configuration files (SOURCE OF TRUTH)
│   ├── config.json      # Version and metadata
│   ├── economy.json     # Economic costs and formulas
│   ├── progression.json # Reputation and access tier systems
│   ├── quality.json     # Quality calculation rules
│   ├── artists.json     # Artist archetype definitions
│   ├── markets.json     # Market and seasonal modifiers (includes seasonal_modifiers)
│   ├── projects.json    # Project durations and settings
│   ├── events.json      # Random event configurations
│   └── content.json     # Game content generation (song names, moods)
├── actions.json         # Player actions and effects
├── artists.json         # Available artist pool and characteristics  
├── roles.json           # Industry role definitions and dialogue
├── dialogue.json        # Artist conversations and interactions
├── events.json          # Random events (future feature)
└── world.json           # Global game configuration (future feature)
```

### **Balance Data Loading Architecture** (Updated September 8, 2025)

The balance data system now uses **dynamic assembly** instead of compilation:

- **Browser/Client**: Uses `balance.ts` which imports and aggregates JSON modules
- **Node.js/Server**: Uses `dataLoader.assembleBalanceData()` to dynamically load and structure JSONs
- **Single Source of Truth**: Structure defined in `shared/utils/dataLoader.ts`
- **No Compilation Needed**: Changes to JSON files take effect immediately
- **Resilient**: GameEngine has fallback values for missing data

---

## ⚖️ Balance Configuration Schema (`balance.json`)

### **Root Structure**
```typescript
interface BalanceConfig {
  starting_resources: StartingResources;
  monthly_costs: MonthlyCosts;
  project_costs: ProjectCosts;
  revenue_formulas: RevenueFormulas;
  progression_gates: ProgressionGates;
  access_tiers: AccessTiers;
  streaming: StreamingConfig;
  press: PressConfig;
  time_progression: TimeProgressionConfig;
  song_generation?: SongGenerationConfig;  // Added August 29, 2025
}
```

### **Key Schema Definitions**

#### **Starting Resources**
```json
{
  "starting_resources": {
    "money": 75000,
    "reputation": 5,
    "creative_capital": 10,
    "focus_slots": 3
  }
}
```

#### **Project Economics**
```json
{
  "project_costs": {
    "single": {
      "min": 3000,
      "max": 12000,
      "quality_base": 40,
      "duration_months": 2
    },
    "ep": {
      "min": 15000,
      "max": 35000,
      "quality_base": 50,
      "duration_months": 4
    }
  }
}
```

#### **Streaming Revenue**
```json
{
  "streaming": {
    "base_streams_per_point": 1000,
    "quality_weight": 0.8,
    "playlist_weight": 1.0,
    "revenue_per_stream": 0.003,
    "decay_factor": 0.85
  }
}
```

#### **Access Tiers**
```json
{
  "access_tiers": {
    "playlist_access": {
      "none": { "threshold": 0, "reach_multiplier": 0.1 },
      "niche": { "threshold": 15, "reach_multiplier": 0.5 },
      "mid": { "threshold": 50, "reach_multiplier": 1.0 }
    }
  }
}
```

---

## 👥 Role System Schema (`roles.json`)

### **Role Structure**
```typescript
interface Role {
  id: string;
  name: string;
  title: string;
  type: string;
  relationship: number;
  description: string;
  meetings: Meeting[];
}

interface Meeting {
  id: string;
  context: string;
  prompt: string;
  choices: DialogueChoice[];
}

interface DialogueChoice {
  id: string;
  text: string;
  effects_immediate?: ResourceEffects;
  effects_delayed?: DelayedEffect;
}
```

### **Example Role**
```json
{
  "id": "manager",
  "name": "Sarah Mitchell",
  "title": "Music Label Manager",
  "type": "Manager",
  "relationship": 50,
  "description": "Strategic business advisor",
  "meetings": [
    {
      "id": "monthly_check_in",
      "context": "Monthly strategy discussion",
      "prompt": "How should we approach priorities this month?",
      "choices": [
        {
          "id": "growth_focus",
          "text": "Focus on aggressive growth",
          "effects_immediate": {
            "money": -1000,
            "reputation": 3
          },
          "effects_delayed": {
            "trigger_month": 3,
            "money": 5000,
            "description": "Growth investment pays off"
          }
        }
      ]
    }
  ]
}
```

---

## 🎤 Artist Schema (`artists.json`)

### **Artist Structure**
```typescript
interface Artist {
  id: string;
  name: string;
  archetype: 'Visionary' | 'Workhorse' | 'Trendsetter';
  genre: string;
  talent: number; // 0-100
  signing_cost: number;
  monthly_cost: number;
  traits: string[];
  backstory: string;
  strengths: string[];
  weaknesses: string[];
  preferred_projects?: string[];
  relationship_modifiers?: Record<string, number>;
}
```

### **Example Artist**
```json
{
  "id": "nova_sterling",
  "name": "Nova Sterling",
  "archetype": "Visionary",
  "genre": "Experimental Pop",
  "talent": 85,
  "signing_cost": 8000,
  "monthly_cost": 1200,
  "traits": ["perfectionist", "social_media_savvy"],
  "backstory": "Rising star known for genre-bending approach",
  "strengths": ["creativity", "innovation"],
  "weaknesses": ["commercial_appeal"],
  "relationship_modifiers": {
    "creative_freedom": 2.0,
    "commercial_pressure": -1.5
  }
}
```

---

## 🎭 Artist Dialogue Schema (`dialogue.json`)

### **Dialogue Structure**
```typescript
interface ArtistDialogue {
  id: string;
  type: 'artist_interaction';
  archetype: string;
  context: string;
  prompt: string;
  choices: ArtistChoice[];
}

interface ArtistChoice extends DialogueChoice {
  artist_effects?: {
    mood?: number;
    loyalty?: number;
    creativity?: number;
  };
}
```

### **Example Dialogue**
```json
{
  "id": "creative_feedback_visionary",
  "type": "artist_interaction",
  "archetype": "Visionary",
  "context": "Creative direction discussion",
  "prompt": "I've been experimenting with unconventional sounds...",
  "choices": [
    {
      "id": "encourage_experimentation",
      "text": "Let's push boundaries!",
      "effects_immediate": {
        "creative_capital": 3
      },
      "artist_effects": {
        "mood": 5,
        "loyalty": 2,
        "creativity": 3
      }
    }
  ]
}
```

---

## 🎵 Content Generation Schema (`balance/content.json`)

### **Purpose**
The content.json file contains all data for procedural content generation, separating game content from business logic. This enables easy content updates without code changes and supports future content customization features.

### **Root Structure**
```typescript
interface ContentGenerationConfig {
  song_generation: SongGenerationConfig;
}

interface SongGenerationConfig {
  name_pools: SongNamePools;
  mood_types: string[];
}

interface SongNamePools {
  default: string[];
  genre_specific: Record<string, string[]>;
}
```

### **Schema Structure**

#### **Song Name Pools**
```json
{
  "song_generation": {
    "name_pools": {
      "default": [
        "Midnight Dreams",
        "City Lights", 
        "Hearts on Fire",
        "Thunder Road",
        "Broken Chains",
        "Rebel Soul",
        "Digital Love",
        "Neon Nights",
        "System Override",
        "Golden Hour",
        "Starlight",
        "Electric Pulse",
        "Velvet Sky",
        "Crimson Dawn",
        "Silver Lining",
        "Ocean Waves"
      ],
      "genre_specific": {
        "pop": [
          "Summer Nights",
          "Dance Floor", 
          "Sweet Escape",
          "Radio Waves"
        ],
        "rock": [
          "Thunder Road",
          "Broken Chains",
          "Rebel Soul", 
          "Electric Storm"
        ],
        "electronic": [
          "Digital Love",
          "System Override",
          "Neon Nights",
          "Circuit Breaker"
        ]
      }
    }
  }
}
```

#### **Mood Types**
```json
{
  "song_generation": {
    "mood_types": [
      "upbeat",
      "melancholic", 
      "aggressive",
      "chill"
    ]
  }
}
```

### **GameEngine Integration**

#### **Song Name Generation**
```typescript
// In game-engine.ts - generateSong() method
const songNamePools = this.gameData.getBalanceConfigSync()?.song_generation?.name_pools;
const defaultSongNames = songNamePools?.default || [
  // Fallback if data not available
  'Midnight Dreams', 'City Lights', 'Hearts on Fire', 'Thunder Road'
];

// Future enhancement: genre-specific selection
const songNames = defaultSongNames;
const randomName = songNames[Math.floor(this.getRandom(0, songNames.length))];
```

#### **Mood Generation**
```typescript
// In game-engine.ts - generateSongMood() method  
const moodTypes = this.gameData.getBalanceConfigSync()?.song_generation?.mood_types;
const moods = moodTypes || ['upbeat', 'melancholic', 'aggressive', 'chill'];
return moods[Math.floor(this.getRandom(0, moods.length))];
```

### **Architectural Benefits**

- **Separation of Concerns**: Content data separated from business logic in GameEngine
- **Easy Content Updates**: Modify song names without touching code or redeployment
- **Future Extensibility**: Genre-specific song naming ready for implementation
- **Backward Compatibility**: Fallback values ensure system works if data unavailable
- **Established Pattern**: Follows same data-driven approach as balance configuration

### **Song Title Editing API Integration**

#### **API Endpoint Specification**
```
PATCH /api/songs/:songId
Content-Type: application/json
Authorization: Required (via getUserId middleware)
```

**Request Body**:
```json
{
  "title": "New Song Title"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "song": {
    "id": "song-uuid-here",
    "title": "New Song Title",
    "previousTitle": "Previous Song Title"
  }
}
```

**Response (Error Examples)**:
```json
{
  "error": "INVALID_TITLE",
  "message": "Song title must be a non-empty string"
}

{
  "error": "TITLE_TOO_LONG",
  "message": "Song title must be 100 characters or less"
}

{
  "error": "UNAUTHORIZED",
  "message": "You do not have permission to edit this song"
}
```

#### **Validation Rules**
- **Title Required**: Must be non-empty string after trimming whitespace
- **Length Limit**: Maximum 100 characters
- **User Authorization**: Song must belong to user's active game
- **Game Ownership**: User must own the game containing the song
- **Security**: Full authorization chain prevents cross-user data access

#### **Database Schema Impact**
```sql
-- Songs table supports title updates
UPDATE songs 
SET title = ?, updatedAt = CURRENT_TIMESTAMP 
WHERE id = ? AND gameId IN (SELECT id FROM game_states WHERE userId = ?);
```

#### **UI Integration Pattern**
```typescript
// Client-side song editing state management
const [editingSongId, setEditingSongId] = useState<string | null>(null);
const [editedTitle, setEditedTitle] = useState<string>('');
const [songTitles, setSongTitles] = useState<Record<string, string>>({});

// API call with proper error handling
const updateSongTitle = async (songId: string, title: string) => {
  const response = await apiRequest(`/api/songs/${songId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title })
  });
  
  // Response object, not JSON - fixed common integration bug
  if (response.ok) {
    const data = await response.json();
    setSongTitles(prev => ({ ...prev, [songId]: data.song.title }));
    setEditingSongId(null);
  }
};
```

### **Future Enhancements Enabled**

- **Genre-Specific Names**: Artist genre could influence song name selection
- **Additional Content Types**: Album names, marketing slogans, press quotes
- **Localization Support**: Multiple language versions of content pools
- **Dynamic Content**: Time-based or seasonal content variations
- **User Customization**: Player-uploaded custom content pools
- **Bulk Editing**: Multiple song title updates in single API call
- **History Tracking**: Song title change history for undo functionality
- **Validation Extensions**: Custom validation rules per genre or project type

---

## 🔧 Content Loading Integration

### **GameEngine Integration**
Content is loaded through the `ServerGameData` class and accessed by the GameEngine:

```typescript
// Content loading in game engine
const balanceConfig = await this.gameData.getBalanceConfig();
const streamingRules = balanceConfig.streaming;
const revenue = calculateRevenue(project, streamingRules);
```

### **Validation Pipeline**
All content is validated on server startup:

```typescript
interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}
```

---

## 📝 Schema Validation Rules

### **Required Fields**
- All `id` fields must be unique within their file
- Numeric fields must be positive where business logic requires
- Array fields must not be empty where content is required

### **Cross-File References**
- Artist archetypes must match dialogue archetype values
- Role types must be consistent across role and dialogue files
- Effect field names must match GameEngine property names

### **Business Logic Constraints**
- Artist talent: 0-100 range
- Costs: Must be positive integers
- Reputation thresholds: Must be ascending order
- Time values: Must be positive integers

---

This schema reference provides the technical foundation for all game content. For practical editing workflows, see [Content Editing Guide](../06-development/content-editing-guide.md).