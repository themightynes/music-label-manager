# Content Management System

**Music Label Manager - JSON-Based Game Content**  
*Version: 1.0 (MVP Complete)*

---

## 📂 Content Overview

The Music Label Manager uses a **JSON-based content management system** that separates game data from code, enabling non-developers to modify game content, balance, and dialogue without touching the codebase.

**Content Philosophy**:
- **Separation of Concerns**: Game logic separate from game content
- **Version Control**: All content changes tracked in git
- **Localization Ready**: Structure supports multiple languages
- **Easy Modification**: Non-developers can edit game balance and content

---

## 🗂️ Content File Structure

```
data/
├── balance.json          # Economic balance and game formulas
├── roles.json           # Industry role definitions and dialogue
├── dialogue.json        # Artist conversations and interactions
├── artists.json         # Available artist pool and characteristics
├── events.json          # Random events and opportunities (future)
└── world.json           # Game world configuration and access tiers
```

---

## ⚖️ Balance Configuration (`balance.json`)

The master configuration file for all game balance and economic formulas.

### **Structure Overview**
```json
{
  "starting_resources": { /* Initial player resources */ },
  "monthly_costs": { /* Operational expenses */ },
  "project_costs": { /* Project budget ranges */ },
  "revenue_formulas": { /* Income calculation formulas */ },
  "progression_gates": { /* Unlock thresholds */ },
  "time_progression": { /* Campaign and timing settings */ },
  "access_tiers": { /* Playlist, press, venue progression */ },
  "streaming": { /* Streaming revenue calculations */ },
  "press": { /* Press coverage mechanics */ },
  "tours": { /* Tour revenue calculations */ },
  "events": { /* Random event configuration */ }
}
```

### **Detailed Configuration**

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

#### **Monthly Operational Costs**
```json
{
  "monthly_costs": {
    "base_operational": [3000, 6000],
    "artist_monthly": [800, 1500],
    "project_overhead": 0.1,
    "scaling_factor": 1.05
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
    },
    "mini_tour": {
      "min": 5000,
      "max": 15000,
      "quality_base": 30,
      "duration_months": 1
    }
  }
}
```

#### **Streaming Revenue Formula**
```json
{
  "streaming": {
    "base_streams_per_point": 1000,
    "quality_weight": 0.8,
    "playlist_weight": 1.0,
    "reputation_weight": 0.5,
    "marketing_weight": 0.3,
    "revenue_per_stream": 0.003,
    "first_week_multiplier": 1.5,
    "decay_factor": 0.85
  }
}
```

#### **Press Coverage System**
```json
{
  "press": {
    "base_chance": 0.05,
    "reputation_modifier": 0.01,
    "pr_spend_modifier": 0.0001,
    "story_flag_bonus": 0.15,
    "max_pickups_per_release": 5,
    "reputation_per_pickup": 2
  }
}
```

#### **Progression Gates**
```json
{
  "progression_gates": {
    "second_artist_reputation": 25,
    "fourth_focus_slot_reputation": 50,
    "playlist_niche_reputation": 15,
    "playlist_mid_reputation": 50,
    "press_blog_reputation": 25,
    "press_mid_reputation": 60,
    "venue_club_reputation": 40
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
    },
    "press_access": {
      "none": { "threshold": 0, "pickup_chance": 0.05 },
      "blogs": { "threshold": 25, "pickup_chance": 0.15 },
      "mid_tier": { "threshold": 60, "pickup_chance": 0.35 }
    },
    "venue_access": {
      "none": { "threshold": 0, "capacity_range": [0, 0] },
      "clubs": { "threshold": 40, "capacity_range": [100, 300] }
    }
  }
}
```

#### **Campaign Configuration**
```json
{
  "time_progression": {
    "campaign_length_months": 12,
    "autosave_frequency": 3,
    "seasonal_modifiers": {
      "q1": 0.9,
      "q2": 1.0,
      "q3": 0.95,
      "q4": 1.1
    }
  }
}
```

---

## 👥 Role Definitions (`roles.json`)

Defines industry professionals, their dialogue trees, and meeting options.

### **Structure Overview**
```json
{
  "roles": [
    {
      "id": "manager",
      "name": "Sarah Mitchell",
      "title": "Music Label Manager",
      "type": "Manager",
      "relationship": 50,
      "description": "Experienced manager who helps with strategic decisions",
      "meetings": [ /* Array of meeting objects */ ]
    }
  ]
}
```

### **Role Object Schema**
```typescript
interface Role {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  title: string;                 // Professional title
  type: string;                  // Role category
  relationship: number;          // Starting relationship (0-100)
  description: string;           // Role description
  meetings: Meeting[];           // Available meeting types
}
```

### **Meeting Structure**
```json
{
  "id": "monthly_check_in",
  "context": "Monthly strategy discussion",
  "prompt": "How should we approach our strategic priorities this month?",
  "choices": [
    {
      "id": "aggressive_growth",
      "text": "Focus on aggressive growth and expansion",
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
```

### **Complete Role Example**
```json
{
  "id": "anr",
  "name": "Marcus Chen",
  "title": "A&R Representative", 
  "type": "A&R",
  "relationship": 50,
  "description": "Talent scout and artist development specialist with industry connections.",
  "meetings": [
    {
      "id": "monthly_check_in",
      "context": "Monthly talent assessment and strategy",
      "prompt": "Let's discuss our artist development priorities this month.",
      "choices": [
        {
          "id": "single_choice",
          "text": "Focus on developing our current artists' next singles",
          "effects_immediate": {
            "creative_capital": 2,
            "reputation": 1
          },
          "effects_delayed": {
            "trigger_month": 2,
            "reputation": 3,
            "description": "Single development shows results"
          }
        },
        {
          "id": "talent_search",
          "text": "Invest time in scouting new talent",
          "effects_immediate": {
            "money": -2000,
            "reputation": 1
          },
          "effects_delayed": {
            "trigger_month": 4,
            "money": 8000,
            "description": "New talent discovery pays dividends"
          }
        },
        {
          "id": "industry_networking",
          "text": "Focus on building industry relationships",
          "effects_immediate": {
            "reputation": 2
          },
          "effects_delayed": {
            "trigger_month": 3,
            "reputation": 5,
            "description": "Industry connections open new opportunities"
          }
        }
      ]
    }
  ]
}
```

### **All Available Roles**
1. **Manager (Sarah Mitchell)** - Strategic planning and industry connections
2. **A&R Rep (Marcus Chen)** - Talent scouting and artist development
3. **Producer (Elena Rodriguez)** - Project quality and creative direction
4. **PR Specialist (David Kim)** - Press relations and publicity
5. **Digital Marketing (Lisa Thompson)** - Online presence and streaming
6. **Streaming Curator (Ryan Jackson)** - Playlist placement and streaming optimization
7. **Booking Agent (Amanda Foster)** - Tour planning and venue relationships
8. **Operations Manager (Chris Park)** - Business efficiency and cost management

---

## 🎭 Artist Conversations (`dialogue.json`)

Defines artist-specific dialogue trees and relationship interactions.

### **Structure Overview**
```json
{
  "additional_scenes": [
    {
      "id": "artist_feedback_visionary",
      "type": "artist_interaction",
      "archetype": "Visionary",
      "context": "Creative direction discussion",
      "prompt": "I've been thinking about our artistic direction...",
      "choices": [ /* Choice objects */ ]
    }
  ]
}
```

### **Artist Dialogue Example**
```json
{
  "id": "creative_feedback_visionary",
  "type": "artist_interaction",
  "archetype": "Visionary",
  "context": "Monthly creative check-in with visionary artist",
  "prompt": "I've been experimenting with some really unconventional sounds. I know it might not be commercially viable, but I think it could be groundbreaking. What's your take?",
  "choices": [
    {
      "id": "encourage_experimentation",
      "text": "I love your experimental approach. Let's push boundaries and see where it takes us!",
      "effects_immediate": {
        "creative_capital": 3
      },
      "artist_effects": {
        "mood": 5,
        "loyalty": 2,
        "creativity": 3
      },
      "effects_delayed": {
        "trigger_month": 2,
        "reputation": 4,
        "description": "Experimental approach gains critical acclaim"
      }
    },
    {
      "id": "commercial_balance",
      "text": "I appreciate the creativity, but let's find a way to balance innovation with commercial appeal.",
      "effects_immediate": {
        "money": 1000,
        "reputation": 1
      },
      "artist_effects": {
        "mood": -1,
        "loyalty": 1
      }
    },
    {
      "id": "focus_commercial",
      "text": "We need to prioritize commercial viability right now. Let's save the experimentation for later.",
      "effects_immediate": {
        "money": 2000
      },
      "artist_effects": {
        "mood": -3,
        "loyalty": -1,
        "creativity": -2
      },
      "effects_delayed": {
        "trigger_month": 1,
        "money": 3000,
        "description": "Commercial focus generates quick revenue"
      }
    }
  ]
}
```

### **Artist Archetypes**
- **Visionary**: Creative and experimental, values artistic freedom
- **Workhorse**: Reliable and consistent, values professionalism and efficiency
- **Trendsetter**: Commercial and social media savvy, values popularity and trends

---

## 🎤 Artist Pool (`artists.json`)

Defines the available artists for discovery and signing.

### **Structure Overview**
```json
{
  "available_artists": [
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
      "strengths": ["creativity", "innovation", "fan_engagement"],
      "weaknesses": ["commercial_appeal", "consistency"]
    }
  ]
}
```

### **Complete Artist Examples**

#### **Visionary Artist**
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
  "backstory": "A rising star in the experimental pop scene, known for her genre-bending approach and ethereal vocals.",
  "strengths": ["creativity", "innovation", "fan_engagement"],
  "weaknesses": ["commercial_appeal", "consistency"],
  "preferred_projects": ["single", "ep"],
  "relationship_modifiers": {
    "creative_freedom": 2.0,
    "commercial_pressure": -1.5,
    "experimental_support": 1.8
  }
}
```

#### **Workhorse Artist**
```json
{
  "id": "mason_rivers",
  "name": "Mason Rivers",
  "archetype": "Workhorse",
  "genre": "Folk Rock",
  "talent": 78,
  "signing_cost": 6000,
  "monthly_cost": 900,
  "traits": ["reliable", "touring_focused"],
  "backstory": "Seasoned folk rock musician with a strong work ethic and touring background.",
  "strengths": ["consistency", "live_performance", "professionalism"],
  "weaknesses": ["innovation", "social_media"],
  "preferred_projects": ["single", "mini_tour"],
  "relationship_modifiers": {
    "professional_respect": 1.5,
    "touring_opportunities": 2.0,
    "creative_pressure": -0.5
  }
}
```

#### **Trendsetter Artist**
```json
{
  "id": "luna_vee",
  "name": "Luna Vee",
  "archetype": "Trendsetter",
  "genre": "Pop/Electronic",
  "talent": 82,
  "signing_cost": 12000,
  "monthly_cost": 1500,
  "traits": ["social_media_expert", "trend_aware"],
  "backstory": "Pop sensation with a keen eye for trends and massive social media following.",
  "strengths": ["marketing", "social_media", "commercial_appeal"],
  "weaknesses": ["artistic_depth", "longevity"],
  "preferred_projects": ["single", "ep"],
  "relationship_modifiers": {
    "marketing_support": 2.0,
    "trend_following": 1.8,
    "artistic_restriction": -1.2
  }
}
```

### **All Available Artists**
1. **Nova Sterling (Visionary)** - Experimental Pop, $8k signing
2. **Mason Rivers (Workhorse)** - Folk Rock, $6k signing
3. **Luna Vee (Trendsetter)** - Pop/Electronic, $12k signing
4. **Diego Morales (Visionary)** - Jazz Fusion, $15k signing
5. **Riley Thompson (Workhorse)** - Country, $4k signing
6. **Zara Chen (Trendsetter)** - K-Pop/R&B, $10k signing

---

## 🎲 Random Events (`events.json`)

Defines random events that can occur during gameplay (future feature).

### **Structure Overview**
```json
{
  "events": [
    {
      "id": "award_nomination",
      "title": "Award Nomination",
      "description": "One of your artists has been nominated for an industry award!",
      "trigger_chance": 0.1,
      "requirements": {
        "min_reputation": 30,
        "required_projects": 2
      },
      "effects": {
        "immediate": {
          "reputation": 5,
          "creative_capital": 3
        },
        "delayed": [
          {
            "trigger_month": 2,
            "money": 10000,
            "description": "Award ceremony publicity boost"
          }
        ]
      }
    }
  ]
}
```

### **Event Categories**
- **Industry Events**: Awards, festivals, label opportunities
- **Artist Events**: Breakthroughs, challenges, collaborations
- **Market Events**: Platform changes, trend shifts, economic factors
- **Random Events**: Viral moments, technical issues, surprise opportunities

---

## 🌍 World Configuration (`world.json`)

Defines game world settings and global configurations.

### **Structure Overview**
```json
{
  "world_settings": {
    "industry_health": 85,
    "market_trends": ["streaming_growth", "vinyl_revival", "live_music_recovery"],
    "seasonal_modifiers": {
      "spring": { "creativity": 1.1, "marketing": 1.0 },
      "summer": { "touring": 1.3, "streaming": 0.9 },
      "fall": { "album_releases": 1.2, "press": 1.1 },
      "winter": { "studio_work": 1.2, "social_media": 1.1 }
    }
  },
  "global_events": [
    {
      "id": "streaming_platform_update",
      "month": 6,
      "effects": { "streaming_multiplier": 1.15 }
    }
  ]
}
```

---

## 🛠️ Content Management Workflow

### **Editing Content**
1. **Find the relevant JSON file** in `/data/`
2. **Edit using any text editor** or JSON editor
3. **Validate JSON syntax** using online validators
4. **Test changes** by running the game locally
5. **Commit changes** to version control

### **Adding New Content**

#### **Adding a New Role**
```json
// In roles.json, add to roles array:
{
  "id": "new_role_id",
  "name": "Professional Name",
  "title": "Job Title",
  "type": "Category",
  "relationship": 50,
  "description": "Role description",
  "meetings": [
    {
      "id": "meeting_type",
      "context": "Meeting context",
      "prompt": "Meeting prompt text",
      "choices": [
        {
          "id": "choice_id",
          "text": "Choice text",
          "effects_immediate": { /* immediate effects */ },
          "effects_delayed": { /* delayed effects */ }
        }
      ]
    }
  ]
}
```

#### **Adding a New Artist**
```json
// In artists.json, add to available_artists array:
{
  "id": "artist_id",
  "name": "Artist Name",
  "archetype": "Visionary|Workhorse|Trendsetter",
  "genre": "Music Genre",
  "talent": 75,
  "signing_cost": 7000,
  "monthly_cost": 1000,
  "traits": ["trait1", "trait2"],
  "backstory": "Artist background",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"]
}
```

#### **Modifying Game Balance**
```json
// In balance.json, adjust values:
{
  "project_costs": {
    "single": {
      "min": 3000,    // Reduce minimum cost
      "max": 10000    // Reduce maximum cost
    }
  },
  "streaming": {
    "revenue_per_stream": 0.004  // Increase revenue per stream
  }
}
```

### **Content Validation**

#### **Automatic Validation**
The game includes content validation:
```typescript
// Server validates content on startup
const validation = await serverGameData.validateDataIntegrity();
if (!validation.success) {
  console.error('Content validation failed:', validation.errors);
}
```

#### **Manual Validation**
```bash
# Check content loading
npm run test:content

# Validate JSON syntax
npm run validate:json

# Test game balance
npm run test:balance
```

### **Content Versioning**
- All content changes tracked in git
- Use semantic versioning for content releases
- Tag major balance changes for rollback capability
- Document changes in CHANGELOG.md

---

## 📊 Content Analytics

### **Tracking Content Usage**
```typescript
// Track which content is used most
interface ContentMetrics {
  roleInteractions: Record<string, number>;
  artistSignings: Record<string, number>;
  projectTypes: Record<string, number>;
  dialogueChoices: Record<string, number>;
}
```

### **A/B Testing Framework**
```json
// Future: Multiple balance configurations
{
  "balance_variants": {
    "conservative": { /* lower costs, slower progression */ },
    "aggressive": { /* higher costs, faster progression */ },
    "experimental": { /* test new mechanics */ }
  }
}
```

---

This content management system provides a flexible, maintainable foundation for game content that can evolve with the game's needs while remaining accessible to non-technical team members.