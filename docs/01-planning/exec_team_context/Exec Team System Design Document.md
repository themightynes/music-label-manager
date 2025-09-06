#execteam 
## **1. INITIAL VISION & CONTEXT**

### **Current Implementation Status**

The game currently has a **Roles system** with 8 different industry roles that the player can interact with through monthly meetings. However, there are data inconsistencies between files that need addressing:

  

**Current Roles (8 total):** [[Exec Team - Character Bible]]

1. **Manager** - Strategic planning and resource allocation
2. **A&R (anr)** - Talent scouting and artist development
3. **Producer** - Music production planning and quality control
4. **PR** - Media strategy and publicity
5. **Digital Marketing** - Social media and digital advertising
6. **Streaming** - Playlist placement and streaming optimization
7. **Booking** - Live performance and tour planning
8. **Operations (ops)** - Business operations and efficiency

**Current Monthly Actions (13 total):**

- **Role Meeting Actions (8):** meet_manager, meet_ar, meet_producer, meet_pr, meet_digital, meet_streaming, meet_booking, meet_operations
- **Project Creation Actions (3):** start_single, start_ep, start_tour
- **Marketing Campaign Actions (2):** pr_push, digital_push

**Technical Issues Found:**

1. **actions.json has incorrect role_id values:**

- Line 21: "role_id": "ar" should be "anr"
- Line 75: "role_id": "operations" should be "ops"

2. **MonthPlanner.tsx compensates with hardcoded mappings:**

- Comments show awareness: "Fix: ar -> anr" (line 241)
- Comments show awareness: "Fix: operations -> ops" (line 247)

3. **No validation between files:**

- Component doesn't validate that meeting IDs exist in roles.json
- Default meetings are hardcoded rather than pulled from roles.json
- Role mappings shouldn't be necessary if actions.json had correct role_id values

4. **Current Interaction Flow in MonthPlanner.tsx:**

- Users select up to 3 strategic actions per month from available pool
- When role meeting selected: Maps action ID → role ID → default meeting → opens dialogue
- System provides smart recommendations based on budget, artist count, projects, reputation, access tiers
- Each role has 3 meetings defined in roles.json with different strategic choices

---

## **2. NEW EXECUTIVE TEAM STRUCTURE**
[[Exec Team - Character Bible]]

### **Executive Team Hierarchy**

**CEO (The Player)**

- High-level vision + balancing growth vs survival
- Has 3 focus slots per turn to interact with executive team members
- Each focus slot = one executive interaction that creates boost/enhancement/strategic advantage

### **The Five Executives**

#### **1. Head of A&R (head_ar)**

**Role:** Talent scouting + artist development

  

**Key Responsibilities:**

1. Scout and sign emerging talent, balancing cost vs future star potential
2. Oversee artist development arcs (vocal coaching, image, collaborations)
3. Choose which demos get developed, setting up hit potential or sunk costs
4. Step in on artist disputes, affecting loyalty and creative capital
5. Run showcases to attract hype, new fans, or playlist access

#### **2. Chief Marketing Officer (cmo)**

**Role:** Handles visibility, PR, and brand leverage **Includes:** PR/Publicist and Digital Marketing teams

  

**Key Responsibilities:**

6. Launch major marketing pushes (digital ads, billboards, influencer tie-ins)
7. Approve brand sponsorships, trading money for possible reputation risk
8. Shape press strategies: viral gimmick vs polished narrative
9. Crisis-manage when bad reviews or scandals drop, flipping negatives into boosts
10. Run cross-media campaigns (TikTok challenges, livestream concerts) that impact fan growth

#### **3. Chief Creative Officer (cco)**

**Role:** Oversees music quality and artistic direction **Includes:** Staff producers (in-house producers that help produce songs)

  

**Key Responsibilities:**

11. Greenlight producer assignments that directly affect project quality scores
12. Shape artist branding and genre direction, impacting reputation and playlist access
13. Approve or reject creative risks (experimental EPs, surprise releases)
14. Intervene when artist mood/loyalty dips, protecting long-term creative capital
15. Unlock prestige collabs (guest features, remix deals) tied to creativity/reputation stats

#### **4. Head of Distribution/Operations (head_distribution)**

**Role:** Back-end efficiency + access to platforms and venues

  

**Key Responsibilities:**

16. Secure distribution deals with streaming platforms (Spotify, Apple, TikTok sync)
17. Manage tour logistics: venue negotiations, guarantees, sell-through
18. Decide on physical releases/merch distribution, impacting revenue streams
19. Optimize release timing (avoid competition, align with seasons/events)
20. Handle supply chain failures (delayed vinyls, streaming outages) through quick fixes

#### **5. CEO Strategic Actions (ceo)**

**When not delegating to executives:**

21. Approve budget allocation between projects (Singles, EPs, Tours, PR, Marketing)
22. Set the label's strategic focus: Commercial dominance vs. Artistic credibility
23. Negotiate partnerships with rival labels or industry conglomerates
24. Resolve crises or scandals through executive decisions (ignore, spin, settle)
25. Decide on artist signing or dropping, balancing loyalty vs profitability

---

## **3. CORE SYSTEM MECHANICS**

### **Focus Slot System**

- **3 focus slots per month** - CEO can activate 3 executives per turn
- Each focus slot represents CEO's influential power being channeled through an executive
- Focus slots are the primary resource for executive interaction
- The choice of which 3 executives to empower each month is a core strategic decision

### **Executive Interaction Types**

#### **A. Monthly Actions (Primary Interaction)**
[[Exec Team - Actions - COMPLETE MECHANICAL FRAMEWORK]]
- **Immediate Impact:** Effects that occur next month
- **Delayed Impact:** Effects that occur in 2-3+ months
- **Ongoing Impact:** Effects with decay or progression over time
- Each executive offers **narrative meetings** when focused
- Player chooses from multiple strategic options during meeting
- Each option has different costs (money, creative capital, opportunity)
- Options have predefined outcomes based on choice made

#### **B. Random Events (Secondary Interaction)**

- **Independent of monthly actions** - Can occur outside focus slot usage
- **Two types:**

- Opportunities (new artist discovered, sync license offer, etc.)
- Crises (scandal, artist conflict, distribution problem, etc.)

- May require immediate response or decision
- Can interact with ongoing effects from monthly actions

#### **C. Ongoing Bonuses**

- Some monthly actions create persistent effects
- Effects may decay over time (diminishing returns)
- Effects may progress over time (building momentum)
- Stack independently (no complex interactions between executives)

### **Resource Costs & Trade-offs**

- **Each executive action has specific costs:**

- Money (direct financial cost)
- Creative Capital (artistic resources)
- Opportunity Cost (what you can't do by choosing this)

- **Cost varies by:**

- Which executive you're focusing on
- Which specific action you choose from their options
- Current game state and context

- **No executive energy/burnout system** - Can focus same executive repeatedly if desired

---

## **4. EXECUTIVE DEVELOPMENT SYSTEMS**

### **Progression Mechanics**

#### **Experience-Based Progression**

- The more you use an executive, the better their actions become
- Each successful interaction increases experience
- Experience unlocks improved versions of actions or reduced costs

#### **Success-Based Progression**

- Successful campaigns increase executive confidence/reputation
- Failed actions may temporarily reduce effectiveness
- Major wins unlock new strategic options

#### **Resource-Based Progression**

- Can invest money in training or tools for executives
- Upgrades improve base effectiveness of their actions
- Investment is optional optimization, not required

#### **Story-Based Progression**

- Narrative milestones unlock new executive capabilities
- Tied to label growth and achievement markers
- Provides sense of progression and development

### **Executive Stats & Relationships**

#### **Persistent Stats**

- Each executive has individual stats that persist across games
- Stats affect success rates and action effectiveness
- Stats improve through use and success

#### **Mood/Loyalty System**

- Executives have moods that affect performance
- Loyalty to CEO impacts effectiveness
- Can be influenced by player actions and choices
- **NO resignation/quitting** - Executives won't leave

#### **Relationships with CEO**

- Each executive develops relationship with player over time
- Better relationships may unlock special options
- Poor relationships reduce effectiveness but don't cause departure

### **Executive Independence**

- **No inter-executive relationships** - Each operates independently
- **No executive-artist relationships** - Executives affect systems, not individuals
- Effects simply stack when multiple executives are used
- No combo bonuses or conflicts between executives

---

## **5. MEETING STRUCTURE & UI FLOW**

### **Narrative Meeting System**

- Uses existing dialogue system from current implementation
- Each executive has unique personality and voice
- Meetings present situation narratively with strategic choices
- **Meeting Flow:**

1. Player selects executive to focus on (uses 1 focus slot)
2. Narrative dialogue opens describing current situation
3. Executive presents 3-4 strategic options
4. Each option shows costs and immediate effects
5. Player selects option
6. Confirmation of choice and preview of effects
7. Effects apply based on timing (immediate/delayed/ongoing)

### **Integration with Current System**

- Replaces current 8-role meeting system
- Uses same dialogue modal and choice mechanics
- Maintains narrative focus while adding strategic depth
- Leverages existing infrastructure (no new UI systems needed)

---

## **6. DESIGN PHILOSOPHY & CONSTRAINTS**

### **Core Design Principles**

1. **Focus on optimization over management** - Executives are tools to optimize, not people to manage
2. **Strategic depth through choice** - Each focus slot usage should present meaningful decisions
3. **Narrative-driven interactions** - Maintain story and personality in mechanical systems
4. **Independent systems** - Avoid complex interdependencies that are hard to balance
5. **Clear cause and effect** - Players should understand impact of their choices

### **Simplification Decisions**

- **All executives available from start** - No unlocking/hiring progression
- **No executive-artist relationships** - Keeps system focused on operations
- **No inter-executive dynamics** - Each executive operates independently
- **No retention mechanics** - Executives won't quit or need salary management
- **No complex victory ties** - Executives are tools for success, not victory conditions

### **Risk & Randomization**

- **Controlled randomization** in action outcomes - Some chance of backfire/mistakes
- **No catastrophic failures** - Bad outcomes are setbacks, not game-enders
- **Predictable enough for strategy** - Random elements add variety, not chaos

---

## **7. IMPLEMENTATION MIGRATION PATH**

### **From 8 Roles to 5 Executives**

**Current Roles → New Executive Mapping:**

- Manager → CEO (direct player actions)
- A&R → Head of A&R
- Producer → Chief Creative Officer
- PR → Chief Marketing Officer
- Digital Marketing → Chief Marketing Officer
- Streaming → Head of Distribution/Operations
- Booking → Head of Distribution/Operations
- Operations → Head of Distribution/Operations

### **Data Structure Changes Needed**

1. Fix role_id inconsistencies in actions.json
2. Create new executives.json with 5 executive definitions
3. Update dialogue content for executive meetings
4. Modify MonthPlanner.tsx to use executive system
5. Add progression tracking for executive stats
6. Implement effect timing system (immediate/delayed/ongoing)

### **Backwards Compatibility**

- Consider keeping role meeting actions as aliases during transition
- Map old role meetings to appropriate executive
- Preserve existing dialogue content where applicable
- Maintain save game compatibility if possible

---

## **8. FUTURE CONSIDERATIONS**

### **Potential Expansions (Not for Initial Implementation)**

- Executive skill trees or specializations
- Legendary executives as unlockables
- Executive rivalries or power struggles
- Board of directors oversight layer
- Executive poaching from competitors
- Custom executive creation/hiring

### **Balancing Considerations**

- Cost scaling to prevent focus slot spam on one executive
- Diminishing returns on repeated use
- Ensure all executives remain valuable throughout game
- Balance immediate vs long-term strategic value
- Prevent dominant strategies that ignore certain executives

---

## **9. SUCCESS METRICS**

### **System Success Indicators**

- Players use all 5 executives regularly (no ignored executives)
- Meaningful decisions each turn about focus slot allocation
- Clear progression felt through executive development
- Random events create memorable moments without frustration
- Strategic depth without overwhelming complexity

### **Player Experience Goals**

- Feel like a CEO making high-level strategic decisions
- Experience growth in executive team capabilities
- Navigate interesting trade-offs in resource allocation
- Build a successful label through smart executive utilization
- Enjoy narrative flavor without it obscuring mechanics

---

## **APPENDIX: Technical Integration Notes**

### **File Structure Requirements**

```
/data/
  executives.json       (new - executive definitions)
  executive_actions.json (new - action definitions per executive)
  executive_dialogue.json (new - narrative content)

/client/src/components/
  ExecutiveMeeting.tsx  (modified from DialogueModal)
  ExecutiveStatus.tsx   (new - shows executive stats/mood)

/shared/schemas/
  executive.ts          (new - Zod schemas for validation)
```

### **Key Systems to Implement**

1. Effect timing system (immediate/delayed/ongoing)
2. Executive progression tracking
3. Random event generator
4. Cost calculation system
5. Executive stat persistence
6. Mood/loyalty calculations
7. Success rate modifications

### **Database Considerations**

- Add executives table for persistent stats
- Add executive_actions table for tracking usage
- Add executive_effects table for ongoing effects
- Consider indexing for performance on lookups

[[Exec Team - Wireframe Design Specifications]]

  

# **CEO**

_High-level vision + balancing growth vs survival_

1. Approve **budget allocation** between projects (Singles, EPs, Tours, PR, Marketing).
2. Set the **label’s strategic focus**: Commercial dominance vs. Artistic credibility.
3. Negotiate **partnerships with rival labels** or industry conglomerates.
4. Resolve **crises or scandals** through executive decisions (ignore, spin, settle).
5. Decide on **artist signing or dropping**, balancing loyalty vs profitability.

# **Head of A&R**

_Talent scouting + artist development_

6. Scout and **sign emerging talent**, balancing cost vs future star potential.
7. Oversee **artist development arcs** (vocal coaching, image, collaborations).
8. Choose **which demos get developed**, setting up hit potential or sunk costs.
9. Step in on **artist disputes**, affecting loyalty and creative capital.
10. Run **showcases** to attract hype, new fans, or playlist access.

  

# **Chief Marketing Officer**

_Handles visibility, PR, and brand leverage_

(includes the PR/Publicist and Digital Marketing)

11. Launch **major marketing pushes** (digital ads, billboards, influencer tie-ins).
12. Approve **brand sponsorships**, trading money for possible reputation risk.
13. Shape **press strategies**: viral gimmick vs polished narrative.
14. Crisis-manage when **bad reviews** or scandals drop, flipping negatives into boosts.
15. Run **cross-media campaigns** (TikTok challenges, livestream concerts) that impact fan growth.

# **Chief Creative Officer**

_Oversees music quality and artistic direction_

16. Greenlight **producer assignments** that directly affect project quality scores.
17. Shape **artist branding and genre direction**, impacting reputation and playlist access.
18. Approve or reject **creative risks** (experimental EPs, surprise releases).
19. Intervene when **artist mood/loyalty dips**, protecting long-term creative capital.
20. Unlock **prestige collabs** (guest features, remix deals) tied to creativity/reputation stats.

  

# **Head of Distributor/Operations**

_Back-end efficiency + access to platforms and venues_

21. Secure **distribution deals** with streaming platforms (Spotify, Apple, TikTok sync).
22. Manage **tour logistics**: venue negotiations, guarantees, sell-through.
23. Decide on **physical releases/merch distribution**, impacting revenue streams.
24. Optimize **release timing** (avoid competition, align with seasons/events).
25. Handle **supply chain failures** (delayed vinyls, streaming outages) through quick fixes.