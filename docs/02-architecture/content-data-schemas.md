# Content Data Schemas

**Music Label Manager - JSON Content Structure**  
*Technical Reference*

---

## 📂 Data File Structure

The game uses JSON files in `/data/` for all content, separated by concern:

```
data/
├── balance.json          # Economic balance and game formulas
├── roles.json           # Industry role definitions and dialogue
├── dialogue.json        # Artist conversations and interactions
├── artists.json         # Available artist pool and characteristics
├── events.json          # Random events (future feature)
└── world.json           # Global game configuration (future feature)
```

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