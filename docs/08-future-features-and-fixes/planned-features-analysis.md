# Planned Features & Missing Workflows Analysis

## Overview
Comprehensive analysis of all `/data/*.json` files to identify features and workflows that are designed but not yet implemented in the MVP codebase.

*Generated from JSON analysis: August 18, 2025*

---

## 🎯 Feature Categories Found in JSON Data

### **1. Advanced Marketing & Campaigns**
*Fields found in `balance.json` and `events.json`*

#### **Radio Push Campaigns** 
- **JSON Evidence**: `balance.json:marketing_costs.radio_push` ($2,500-$10,000)
- **Status**: ❌ Not implemented
- **Missing UI**: RadioCampaignModal, radio campaign action type
- **Missing Backend**: Radio push processing in GameEngine

#### **PR Campaign System**
- **JSON Evidence**: `balance.json:marketing_costs.pr_push` + `project_durations.pr_campaign`
- **Status**: ❌ Not implemented  
- **Missing Workflow**: Dedicated PR campaigns separate from project marketing
- **Expected Duration**: 1-3 months

#### **Digital Marketing ROI Tracking**
- **JSON Evidence**: `balance.json:marketing_costs.digital_ads` + detailed spend tracking
- **Status**: ❌ Not implemented
- **Missing Features**: Campaign performance tracking, A/B testing, audience targeting

### **2. Advanced Talent Management**

#### **Talent Search System**
- **JSON Evidence**: `balance.json:talent_costs.talent_search` (Basic: $5k, Premium: $15k, Extensive: $50k)
- **Status**: ❌ Not implemented
- **Missing UI**: TalentSearchModal with search tier selection
- **Missing Workflow**: Discovery of artists beyond the initial 6

#### **Advanced Artist Economics**
- **JSON Evidence**: `balance.json:talent_costs.signing_bonus` by artist tier
- **Status**: ⚠️ Partially implemented (basic signing costs only)
- **Missing Features**: 
  - Unknown ($1k-$5k), Developing ($5k-$25k), Established ($25k-$100k) artist tiers
  - Dynamic artist discovery based on reputation/budget

#### **Artist Mood & Loyalty Complex Effects**
- **JSON Evidence**: `balance.json:artist_stats.mood_effects` + `loyalty_effects` + extensive dialogue choices
- **Status**: ⚠️ Basic implementation exists
- **Missing Features**:
  - Burnout resistance system (`archetype_modifiers.workhorse.burnout_resistance`)
  - Creative synergy bonuses (`archetype_modifiers.visionary.creative_synergy`)
  - Social reach multipliers (`archetype_modifiers.trendsetter.social_reach`)

### **3. Advanced Project & Quality Systems**

#### **Producer Tier System**
- **JSON Evidence**: `balance.json:quality_system.producer_tier_bonus`
- **Status**: ❌ Not implemented
- **Missing Tiers**: Local (0), Regional (+5), National (+12), Legendary (+20)
- **Missing UI**: Producer selection in ProjectCreationModal

#### **Time Investment Quality System**
- **JSON Evidence**: `balance.json:quality_system.time_investment_bonus`
- **Status**: ❌ Not implemented
- **Missing Options**: Rushed (-10), Standard (0), Extended (+8), Perfectionist (+15)
- **Missing UI**: Time allocation slider in project creation

#### **Artist Synergy Bonus**
- **JSON Evidence**: `balance.json:quality_system.artist_synergy_bonus` (+10)
- **Status**: ❌ Not implemented
- **Missing Logic**: Artist-to-artist collaboration effects

### **4. Advanced Revenue & Market Systems**

#### **Longevity Decay System** 
- **JSON Evidence**: `balance.json:market_formulas.streaming_calculation.longevity_decay` (0.85)
- **Status**: ❌ Not implemented *(This is the exact issue we documented earlier!)*
- **Missing**: Monthly revenue decay for released projects

#### **Regional Market Expansion**
- **JSON Evidence**: `balance.json:reputation_system.regional_barriers`
- **Status**: ❌ Not implemented
- **Missing Markets**: Domestic (0), Neighboring (+15), International (+35), Global (+60)
- **Missing UI**: Market selection for releases and tours

#### **Seasonal Modifiers**
- **JSON Evidence**: `balance.json:time_progression.seasonal_modifiers`
- **Status**: ❌ Not implemented
- **Missing Logic**: Q1 (0.85), Q2 (0.95), Q3 (0.90), Q4 (1.25) revenue adjustments

#### **Sync Licensing Revenue**
- **JSON Evidence**: `events.json:sync_offer` ($20k film deals, $8k non-exclusive)
- **Status**: ⚠️ Events exist but not integrated into main revenue flow
- **Missing**: Proactive sync licensing opportunities, recurring sync revenue

### **5. Advanced Access Tier Progression**

#### **Higher Access Tiers**
- **JSON Evidence**: `balance.json:access_tier_system` shows "flagship" and "national" tiers
- **Current MVP Cap**: Playlist (Mid), Press (Mid-Tier), Venue (Clubs)
- **Missing Tiers**:
  - Playlist: Flagship (60+ rep, 1.5x multiplier, 2.0x cost)
  - Press: National (50+ rep, 85% pickup chance)
  - Venue: Theaters (20+ rep, 500-2k capacity), Arenas (45+ rep, 2k-20k capacity)

#### **Venue Guarantee System**
- **JSON Evidence**: `balance.json:venue_access.guarantee_multiplier`
- **Status**: ❌ Not implemented
- **Missing**: Risk/reward venue booking with guarantees vs. revenue sharing

### **6. Side Events & Random Opportunities**

#### **Comprehensive Event System**
- **JSON Evidence**: 12 detailed events in `events.json` with multiple choice branches
- **Status**: ⚠️ Events exist but not fully integrated
- **Missing Features**:
  - Monthly event probability (20% chance)
  - Event cooldown system (2 months)
  - Event weight distribution by category
  - Long-term consequences from event choices

#### **Industry Drama & Relationship Management**
- **JSON Evidence**: Multiple events involving relationships (`events.json`)
- **Status**: ❌ Not implemented
- **Missing**: Reputation effects with specific industry professionals

### **7. Advanced Dialogue & Relationship System**

#### **Artist-Specific Dialogue Branching**
- **JSON Evidence**: `dialogue.json` with 6 detailed artist scenarios by archetype
- **Status**: ⚠️ Basic dialogue exists, complex scenarios not implemented
- **Missing Scenarios**:
  - Visionary pressure dilemmas (art vs. commercial)
  - Workhorse burnout management  
  - Trendsetter authenticity challenges

#### **Complex Delayed Effects**
- **JSON Evidence**: Extensive `effects_delayed` throughout `dialogue.json` and `events.json`
- **Status**: ⚠️ Basic delayed effects work, complex ones missing
- **Missing Effects**: 
  - `creative_breakthrough`, `commercial_risk`, `artistic_frustration`
  - `trendsetter_credibility`, `brand_strength`, `crossover_potential`
  - `innovation_bonus`, `fan_retention`, `market_relevance`

### **8. Difficulty & Game Mode Systems**

#### **Difficulty Modifiers**
- **JSON Evidence**: `balance.json:difficulty_modifiers` (Easy, Normal, Hard)
- **Status**: ❌ Not implemented
- **Missing Features**:
  - Starting money multipliers (0.7x to 1.5x)
  - Goal time extensions (0.8x to 1.5x)
  - Market variance adjustments (0.8x to 1.3x)

#### **Campaign Types Beyond Standard**
- **JSON Evidence**: References to different campaign approaches
- **Status**: ❌ Single "standard" campaign only
- **Missing**: Commercial-focused, Critical-focused, Balanced campaign modes

### **9. Advanced Save & Export Systems**

#### **Enhanced Save Features**
- **JSON Evidence**: `balance.json:save_system` configuration
- **Status**: ⚠️ Basic save/load works
- **Missing Features**:
  - Autosave frequency (monthly)
  - Compression for save files
  - Strict validation on import
  - Version migration support

---

## 🚀 Implementation Priority Matrix

### **🔥 High Impact, Medium Effort (Next Sprint)**

1. **Streaming Revenue Decay** - Already documented, critical for realism
2. **Producer Tier System** - Add quality depth to project creation
3. **Advanced Artist Discovery** - Extend beyond initial 6 artists
4. **Seasonal Modifiers** - Easy economic balance improvement
5. **Time Investment Quality** - Add strategic depth to project planning

### **⚡ High Impact, High Effort (Major Feature)**

6. **Regional Market System** - Major expansion of market complexity
7. **Advanced Event Integration** - Comprehensive random event system
8. **Complex Artist Relationships** - Full mood/loyalty consequence system
9. **Marketing Campaign ROI** - Dedicated marketing campaign system
10. **Higher Access Tiers** - Extend progression beyond MVP caps

### **🎨 Medium Impact, Low Effort (Polish)**

11. **Difficulty Modes** - Player accessibility options
12. **Enhanced Save Features** - Quality of life improvements
13. **Sync Licensing Integration** - Proactive revenue opportunities
14. **Advanced Dialogue Scenarios** - Richer artist interaction depth

---

## 📊 JSON Coverage Analysis

### **Fully Implemented** ✅
- Basic artist signing and management
- Project creation (Singles, EPs, Mini-Tours)
- Basic access tier progression (to MVP caps)
- Save/load with export
- Basic marketing (as part of projects)
- Monthly turn system with resource management

### **Partially Implemented** ⚠️
- Artist mood/loyalty (basic effects only)
- Side events (events exist, not fully integrated)
- Dialogue system (basic choices, missing complex scenarios)
- Revenue calculations (missing decay and longevity)
- Access tiers (limited to MVP tiers)

### **Not Implemented** ❌
- Producer tier system
- Time investment quality bonuses
- Radio marketing campaigns
- Talent search tiers
- Regional market barriers
- Seasonal revenue modifiers
- Advanced artist archetypes bonuses
- Venue guarantee systems
- Difficulty modes
- Advanced save features

---

## 🎯 Strategic Recommendations

### **For Next Major Version (2.0)**
Focus on **revenue depth** and **strategic complexity**:
1. Implement streaming revenue decay (documented)
2. Add producer tier and time investment systems
3. Enable regional market expansion
4. Integrate comprehensive side events

### **For Long-term Expansion (3.0+)**
Focus on **relationship complexity** and **market realism**:
1. Advanced artist mood/loyalty consequences
2. Marketing campaign ROI tracking
3. Industry relationship management
4. Sync licensing proactive system

### **For Accessibility (1.5)**
Focus on **player experience** improvements:
1. Difficulty mode selection
2. Enhanced autosave and import
3. Tutorial integration for complex systems
4. Performance optimization for larger datasets

---

*This analysis reveals that the JSON data contains a remarkably comprehensive design for a deep music industry simulation. The current MVP implements approximately 40% of the designed features, with significant room for strategic expansion while maintaining the excellent foundation already built.*