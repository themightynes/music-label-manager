# Music Label Manager - Development Roadmap 2025
**Comprehensive Implementation Guide for Claude Code**  
*Updated: August 18, 2025 - Replacing MVP_Status.md*

## 🎯 **EXECUTIVE SUMMARY**

**Project Status: Ready for Core Implementation** 🚀  
**Current State**: Architecture planned, systems designed, ready for feature development  
**Next Phase**: 12-week sprint-based implementation following 5-tier priority system  
**Target**: Fully playable MVP with sophisticated music industry simulation mechanics

---

## 📋 **DEVELOPMENT TIER SYSTEM**

### **🎵 TIER 1: ABSOLUTE CORE (Weeks 1-4) - MVP ESSENTIAL**
*These features define the fundamental game experience and must be implemented first*

#### **1. Music Creation & Release Cycle** ⭐ **FOUNDATION**
**Status**: 🔴 Not Implemented  
**Priority**: CRITICAL - All other systems serve this loop  
**Implementation**: Sprint 1 (Weeks 1-2)

**Core Requirements**:
- Multi-song project tracking per artist
- Strategic single selection from available songs  
- EP creation (3-5 songs) and album compilation (8-12 songs)
- Release timing and catalog building strategy
- Song quality affects release success

**JSON Fields Required**:
```json
{
  "project_management": {
    "song_tracking": "individual_songs_per_project",
    "release_types": ["single", "ep", "album", "compilation"],
    "multi_song_projects": true
  }
}
```

**Claude Code Focus**: Implement project creation workflow, song management system, release strategy mechanics

---

#### **2. Streaming Revenue Decay System**
**Status**: 🔴 Not Implemented  
**Priority**: CRITICAL - Transforms economic model  
**Implementation**: Sprint 1 (Weeks 1-2)

**Core Requirements**:
- Apply 85% decay to all active releases each month
- Track individual release revenue streams over time
- Display revenue trends and catalog value
- Make new releases essential for sustained income

**JSON Fields Required**:
```json
{
  "market_formulas": {
    "streaming_calculation": {
      "longevity_decay": 0.85,
      "max_catalog_months": 24,
      "decay_formula": "current_revenue * decay_rate * reputation_bonus"
    }
  }
}
```

**Claude Code Focus**: Implement monthly revenue processing, catalog value tracking, decay calculations

---

#### **3. Producer Tier System**
**Status**: 🔴 Not Implemented  
**Priority**: HIGH - Strategic budget vs quality decisions  
**Implementation**: Sprint 2 (Weeks 3-4)

**Core Requirements**:
- Producer marketplace with tier selection interface
- Cost scaling by producer tier and reputation
- Quality bonuses applied to song/project outcomes
- Producer availability based on label reputation

**JSON Fields Required**:
```json
{
  "quality_system": {
    "producer_tier_bonus": {
      "local": 0,
      "regional": 5, 
      "national": 12,
      "legendary": 20
    },
    "cost_multipliers": {
      "local": 1.0,
      "regional": 2.5,
      "national": 5.0,
      "legendary": 10.0
    }
  }
}
```

**Claude Code Focus**: Producer selection UI, cost calculation system, quality bonus application

---

#### **4. Access Tier Progression System**
**Status**: 🔴 Not Implemented  
**Priority**: HIGH - Clear progression goals  
**Implementation**: Sprint 2 (Weeks 3-4)

**Core Requirements**:
- **Playlist Tiers**: None → Niche → Mid → Flagship (60+ rep, 1.5x multiplier)
- **Press Tiers**: None → Blogs → Mid-Tier → National (50+ rep, 85% pickup)
- **Venue Tiers**: None → Clubs → Theaters (20+ rep) → Arenas (45+ rep)
- Visual tier badges and unlock notifications
- Reputation thresholds gate progression

**JSON Fields Required**:
```json
{
  "access_tier_system": {
    "playlist_tiers": {
      "flagship": {"rep_required": 60, "multiplier": 1.5, "cost_multiplier": 2.0}
    },
    "press_tiers": {
      "national": {"rep_required": 50, "pickup_chance": 0.85}
    },
    "venue_tiers": {
      "arenas": {"rep_required": 45, "capacity_multiplier": 10.0}
    }
  }
}
```

**Claude Code Focus**: Reputation tracking, tier unlock system, progression UI

---

### **🔧 TIER 2: CORE ENHANCEMENT (Weeks 5-8) - ESSENTIAL FOR DEPTH**

#### **5. Time Investment Quality System**
**Status**: 🔴 Not Implemented  
**Priority**: MEDIUM - Strategic depth  
**Implementation**: Sprint 2 (Weeks 3-4)

**Core Requirements**:
- Timeline slider in project creation interface
- Quality bonuses/penalties based on time allocation
- Cost multipliers for extended development
- Deadline pressure mechanics

**JSON Fields Required**:
```json
{
  "quality_system": {
    "time_investment_bonus": {
      "rushed": -10,
      "standard": 0,
      "extended": 8,
      "perfectionist": 15
    },
    "cost_multipliers": {
      "rushed": 0.7,
      "standard": 1.0,
      "extended": 1.4,
      "perfectionist": 2.0
    }
  }
}
```

**Claude Code Focus**: Project timeline UI, quality calculation system, cost impact mechanics

---

#### **6. Artist Mood Effects System**
**Status**: 🔴 Not Implemented  
**Priority**: HIGH - Relationship management crucial  
**Implementation**: Sprint 3 (Weeks 5-6)

**Core Requirements**:
- Mood tracking and display for each artist
- Performance multipliers applied to all projects
- Mood management through dialogue choices and work-life balance
- Visual mood indicators and trend tracking

**JSON Fields Required**:
```json
{
  "artist_effects": {
    "mood_effects": {
      "very_low": -30,
      "low": -15,
      "good": 10,
      "excellent": 25
    },
    "mood_decay_rate": 0.95,
    "burnout_threshold": 20
  }
}
```

**Claude Code Focus**: Artist mood tracking, performance impact calculations, mood management UI

---

#### **7. Regional Market Barriers System**
**Status**: 🔴 Not Implemented  
**Priority**: MEDIUM - Strategic market expansion  
**Implementation**: Sprint 3 (Weeks 5-6)

**Core Requirements**:
- Region-locked release options until reputation thresholds met
- Regional reputation tracking and display
- Market-specific release strategies and costs
- Geographic expansion as progression mechanic

**JSON Fields Required**:
```json
{
  "reputation_system": {
    "regional_barriers": {
      "domestic": 0,
      "neighboring": 15,
      "international": 35,
      "global": 60
    },
    "market_multipliers": {
      "domestic": 1.0,
      "neighboring": 0.7,
      "international": 0.5,
      "global": 0.3
    }
  }
}
```

**Claude Code Focus**: Regional reputation system, market unlock mechanics, geographic release options

---

### **⚡ TIER 3: STRATEGIC SYSTEMS (Weeks 9-12) - IMPORTANT FOR REPLAYABILITY**

#### **8. Label Brand Building System**
**Status**: 🔴 Not Implemented  
**Priority**: MEDIUM - Long-term strategic identity  
**Implementation**: Post-MVP Phase 1

**Core Requirements**:
- Genre specialization tracking and bonuses
- Brand coherence scoring system
- Artist attraction modifiers based on label identity
- Mixed-genre penalties vs specialist advantages

**JSON Fields Required**:
```json
{
  "brand_system": {
    "genre_specialization": {
      "pop": {"coherence_bonus": 1.2, "artist_attraction": 1.3},
      "rock": {"coherence_bonus": 1.15, "artist_attraction": 1.25}
    },
    "coherence_threshold": 0.7,
    "mixed_genre_penalty": 0.9
  }
}
```

**Claude Code Focus**: Genre tracking, brand identity calculations, coherence bonus system

---

#### **9. Multi-Channel Marketing System**
**Status**: 🔴 Not Implemented  
**Priority**: MEDIUM - Strategic promotion choices  
**Implementation**: Post-MVP Phase 1

**Core Requirements**:
- Marketing campaign creation interface
- Channel-specific audience targeting and outcomes
- ROI tracking and optimization
- Platform relationship building

**JSON Fields Required**:
```json
{
  "marketing_costs": {
    "radio_push": [2500, 10000],
    "pr_push": [3000, 8000],
    "digital_ads": [1000, 8000]
  },
  "marketing_effectiveness": {
    "radio_push": {"older_demo": 1.4, "younger_demo": 0.7},
    "digital_ads": {"older_demo": 0.8, "younger_demo": 1.5}
  }
}
```

**Claude Code Focus**: Marketing campaign UI, ROI calculations, audience targeting system

---

#### **10. Seasonal Modifiers System**
**Status**: 🔴 Not Implemented  
**Priority**: MEDIUM - Release timing strategy  
**Implementation**: Post-MVP Phase 1

**Core Requirements**:
- Quarterly sales multipliers applied automatically
- Calendar view showing seasonal trends
- Strategic release timing recommendations
- Holiday season competitive pressure

**JSON Fields Required**:
```json
{
  "time_progression": {
    "seasonal_modifiers": {
      "q1": 0.85,
      "q2": 0.95,
      "q3": 0.90,
      "q4": 1.25
    },
    "holiday_competition": 1.3
  }
}
```

**Claude Code Focus**: Calendar system, seasonal calculations, timing recommendations

---

#### **11. Artist Loyalty Effects System**
**Status**: 🔴 Not Implemented  
**Priority**: MEDIUM - Relationship building benefits  
**Implementation**: Post-MVP Phase 1

**Core Requirements**:
- Loyalty tracking and relationship building mechanics
- Cost reduction calculations based on loyalty levels
- Contract negotiation and retention mechanics
- Long-term relationship investment payoffs

**JSON Fields Required**:
```json
{
  "artist_effects": {
    "loyalty_effects": {
      "high_loyalty": {
        "tour_cost_reduction": 0.2,
        "marketing_cost_reduction": 0.5,
        "contract_renewal_bonus": 1.3
      },
      "low_loyalty": {
        "cost_penalty": 1.2,
        "departure_risk": 0.15
      }
    }
  }
}
```

**Claude Code Focus**: Loyalty tracking, cost reduction calculations, contract system

---

## 🗓️ **12-WEEK IMPLEMENTATION ROADMAP**

### **Sprint 1: Foundation (Weeks 1-2)**
**Goal**: Establish core music creation and economic foundation

**Week 1**:
- [ ] Music Creation & Release Cycle - Project creation system
- [ ] Song management and catalog system
- [ ] Basic release workflow (Single/EP/Album)

**Week 2**:
- [ ] Streaming Revenue Decay - Monthly processing system
- [ ] Catalog value tracking and display
- [ ] Revenue trend visualization

**Deliverable**: Players can create projects, record songs, release music, and see realistic revenue decay

---

### **Sprint 2: Strategic Depth (Weeks 3-4)**
**Goal**: Add strategic decision-making and progression systems

**Week 3**:
- [ ] Producer Tier System - Producer marketplace
- [ ] Quality bonus calculations
- [ ] Cost vs quality strategic choices

**Week 4**:
- [ ] Access Tier Progression - Reputation tracking
- [ ] Tier unlock system and visual badges
- [ ] Time Investment Quality - Project timeline options

**Deliverable**: Players make strategic producer and timing decisions that meaningfully impact outcomes

---

### **Sprint 3: Enhancement & Polish (Weeks 5-6)**
**Goal**: Add relationship management and market expansion

**Week 5**:
- [ ] Artist Mood Effects - Mood tracking system
- [ ] Performance impact calculations
- [ ] Mood management through gameplay

**Week 6**:
- [ ] Regional Market Barriers - Geographic progression
- [ ] Market unlock mechanics
- [ ] UI polish and integration testing

**Deliverable**: Complete MVP with relationship management and geographic expansion

---

### **Post-MVP Development (Weeks 7-12)**
**Goal**: Strategic systems for long-term engagement

**Weeks 7-8**: Label Brand Building System
**Weeks 9-10**: Multi-Channel Marketing & Seasonal Modifiers
**Weeks 11-12**: Artist Loyalty Effects & System Integration

---

## 🎯 **CLAUDE CODE IMPLEMENTATION PRIORITIES**

### **Immediate Focus (This Week)**
1. **Music Creation & Release Cycle** - Start with project creation workflow
2. **Database Schema** - Design for multi-song projects and release tracking
3. **Core Game Engine** - Monthly advancement with revenue processing

### **JSON Field Implementation Order**
1. **Week 1**: `project_management`, `streaming_calculation.longevity_decay`
2. **Week 2**: `producer_tier_bonus`, `time_investment_bonus`  
3. **Week 3**: `access_tier_system`, `mood_effects`
4. **Week 4**: `regional_barriers`, `seasonal_modifiers`

### **Architecture Decisions**
- **Database**: Multi-song project tracking with individual song assets
- **Game Engine**: Monthly turn processing with compound system effects
- **UI Framework**: Support for complex project creation and management flows
- **Data Validation**: Zod schemas for all JSON configuration fields

---

## 🔍 **CRITICAL SUCCESS FACTORS**

### **Technical Requirements**
- [ ] **Multi-song project system** working end-to-end
- [ ] **Revenue decay calculations** processing monthly
- [ ] **Quality bonus stacking** from producer + time + mood
- [ ] **Reputation-gated progression** unlocking access tiers

### **Player Experience Goals**
- [ ] **Strategic depth**: Every recording session involves meaningful choices
- [ ] **Economic realism**: Revenue decay forces catalog building strategy
- [ ] **Clear progression**: Reputation unlocks better opportunities
- [ ] **Relationship management**: Artist mood affects business success

### **Performance Targets**
- [ ] **Monthly advancement**: < 300ms processing time
- [ ] **Project creation**: Intuitive multi-step workflow
- [ ] **Revenue visualization**: Clear trends and decay patterns
- [ ] **Tier progression**: Visual feedback on unlocks and gates

---

## 🚨 **RISK MITIGATION**

### **Technical Risks**
- **Complexity Creep**: Stick to MVP scope, defer Tier 4+ features
- **Performance Issues**: Optimize monthly calculations, use efficient queries
- **Data Consistency**: Validate all JSON fields with Zod schemas

### **Design Risks**
- **Feature Overwhelm**: Focus on core loop first, add complexity gradually
- **Balance Issues**: Externalize all numbers to JSON for rapid tuning
- **User Experience**: Test each tier thoroughly before adding next

---

## 📊 **SUCCESS METRICS**

### **Week 2 Targets**
- [ ] Music creation workflow functional
- [ ] Revenue decay system processing correctly
- [ ] Basic release and catalog management working

### **Week 4 Targets**  
- [ ] Producer tier system influencing quality
- [ ] Access tier progression unlocking opportunities
- [ ] Strategic time investment choices available

### **Week 6 Targets**
- [ ] Artist mood affecting performance
- [ ] Regional expansion working
- [ ] Complete MVP playable end-to-end

### **Final MVP Success Criteria**
- [ ] 12-month campaign completable
- [ ] Multiple viable strategies (commercial vs artistic)
- [ ] Clear progression from local to global label
- [ ] Sustainable economic model requiring catalog building

---

## 🔄 **CONTINUOUS INTEGRATION**

### **Daily Workflow**
1. **Implement** one JSON system per day
2. **Test** integration with existing systems
3. **Validate** balance and player experience
4. **Document** any schema changes or decisions

### **Weekly Reviews**
- **Monday**: Sprint planning and priority confirmation
- **Wednesday**: Mid-sprint progress check and blocker resolution
- **Friday**: Sprint demo and next week planning

### **Quality Gates**
- All features tested in isolation and integration
- JSON schemas validated and documented
- Performance targets met for monthly processing
- Player feedback incorporated from testing

---

*This roadmap serves as the definitive guide for Claude Code implementation. Each tier builds systematically on the previous, ensuring a solid foundation while adding strategic depth. Focus on the core music creation loop first - all other systems serve this foundation.*