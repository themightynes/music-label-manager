#execteam
## **1. USER FLOW WIREFRAMES**

### **Flow A: Monthly Turn - Executive Selection Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│ MONTH PLANNER (Start of Turn)                                  │
├─────────────────────────────────────────────────────────────────┤
│ Month 3 - March 2025                    Focus Slots: 0/3 Used  │
│                                                                 │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐  │
│ │   FOCUS SLOT 1   │ │   FOCUS SLOT 2   │ │   FOCUS SLOT 3   │  │
│ │                  │ │                  │ │                  │  │
│ │     [EMPTY]      │ │     [EMPTY]      │ │     [EMPTY]      │  │
│ │                  │ │                  │ │                  │  │
│ │  + Select Exec   │ │  + Select Exec   │ │  + Select Exec   │  │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘  │
│                                                                 │
│ Available Executives:                                          │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ 👤 Head of A&R          [Mood: Good] [Lvl: 3]           │  │
│ │ Last Action: Scouted indie rock band (2 months ago)     │  │
│ └─────────────────────────────────────────────────────────┘  │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ 📊 Chief Marketing      [Mood: Excellent] [Lvl: 5]      │  │
│ │ Last Action: Crisis management (last month)             │  │
│ └─────────────────────────────────────────────────────────┘  │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ 🎨 Chief Creative       [Mood: Neutral] [Lvl: 2]        │  │
│ │ Last Action: Quality boost program (3 months ago)       │  │
│ └─────────────────────────────────────────────────────────┘  │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ 🚚 Head of Distribution [Mood: Good] [Lvl: 4]           │  │
│ │ Last Action: Secured streaming deal (last month)        │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│ Other Actions Available: [Start Single] [Start EP] [Tour]      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    [Player clicks Head of A&R]
                              ↓
```

### **Flow B: Executive Meeting Narrative Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│ EXECUTIVE MEETING - HEAD OF A&R                                │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────┐                                                   │
│ │   👤     │  Marcus Rodriguez - Head of A&R                   │
│ │ [Photo]  │  Mood: Good | Level: 3 | Loyalty: 75%            │
│ └──────────┘                                                   │
│                                                                 │
│ "Boss, I've been working my contacts all month. The indie      │
│ scene is buzzing about three opportunities, but we need to     │
│ move fast. Each requires different resources and timelines."   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ Option 1: SIGN RISING INDIE BAND                         │  │
│ │ Cost: $50,000 immediate                                  │  │
│ │ Effect: New artist next month (High potential, low fame) │  │
│ │ Risk: 15% chance they're already talking to rivals       │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ Option 2: TALENT SHOWCASE EVENT                          │  │
│ │ Cost: $30,000 + 2 Creative Capital                       │  │
│ │ Effect: 3 artist options in 2 months (delayed)          │  │
│ │ Bonus: +5% label reputation in region                    │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ Option 3: DEVELOP EXISTING ARTIST                        │  │
│ │ Cost: $15,000 + 1 Creative Capital                       │  │
│ │ Effect: +10 quality to next release (ongoing 3 months)  │  │
│ │ Special: Improves artist loyalty                         │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│ [Cancel Meeting]                          [Need More Info...]  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    [Player selects Option 2]
                              ↓
```

### **Flow C: Action Confirmation & Slot Assignment**

```
┌─────────────────────────────────────────────────────────────────┐
│ CONFIRM ACTION                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ You've selected: TALENT SHOWCASE EVENT                         │
│                                                                 │
│ Summary:                                                        │
│ • Host a showcase to discover multiple new artists             │
│ • Cost: $30,000 + 2 Creative Capital                          │
│ • Timeline: Results in 2 months (May 2025)                    │
│ • Additional: +5% reputation boost in North America            │
│                                                                 │
│ Marcus says: "I'll get the best underground acts. This could   │
│ really put us on the map for finding fresh talent."            │
│                                                                 │
│ ┌────────────────────────────────────────────────────────┐    │
│ │ ⚠️ This will use Focus Slot 1 of 3 for this month      │    │
│ └────────────────────────────────────────────────────────┘    │
│                                                                 │
│     [Cancel]                               [Confirm Action]     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                        [Confirm Action]
                              ↓
```

### **Flow D: Return to Month Planner (Slot Filled)**

```
┌─────────────────────────────────────────────────────────────────┐
│ MONTH PLANNER (Continued)                                      │
├─────────────────────────────────────────────────────────────────┤
│ Month 3 - March 2025                    Focus Slots: 1/3 Used  │
│                                                                 │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐  │
│ │   FOCUS SLOT 1   │ │   FOCUS SLOT 2   │ │   FOCUS SLOT 3   │  │
│ │                  │ │                  │ │                  │  │
│ │   A&R: SHOWCASE  │ │     [EMPTY]      │ │     [EMPTY]      │  │
│ │   -$30k, -2 CC   │ │                  │ │                  │  │
│ │   Results: May   │ │  + Select Exec   │ │  + Select Exec   │  │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘  │
│                                                                 │
│ Remaining Executives Available...                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## **2. SYSTEM INTERCONNECTION WIREFRAMES**

### **Diagram A: Executive Action Timing System**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EXECUTIVE ACTION TIMING FLOW                     │
└─────────────────────────────────────────────────────────────────────┘

MONTH 1          MONTH 2          MONTH 3          MONTH 4          MONTH 5
   │                │                │                │                │
   ▼                ▼                ▼                ▼                ▼
┌──────┐        ┌──────┐        ┌──────┐        ┌──────┐        ┌──────┐
│SELECT│───────►│EFFECT│        │      │        │      │        │      │
│ A&R  │        │STARTS│        │      │        │      │        │      │
│ACTION│        │ +Rep │        │ Fade │        │ End  │        │      │
└──────┘        └──────┘        └──────┘        └──────┘        └──────┘
   │                                                  
   ▼                                                  
┌──────┐                        ┌───────┐        ┌────────┐
│SELECT│───────────────────────►│DELAYED│        │RESULT  │
│ CMO  │                        │ WAIT  │───────►│APPEARS │
│ACTION│                        │       │        │+Artists│
└──────┘                        └───────┘        └────────┘
   │
   ▼
┌──────┐        ┌───────┐        ┌───────┐        ┌────────┐        ┌──────┐
│SELECT│───────►│ONGOING│───────►│CONTINUE│──────►│CONTINUE│───────►│EXPIRE│
│ CCO  │        │ START │        │ -10%  │        │ -20%   │        │ -30% │
│ACTION│        │ +30% Q│        │ +20% Q│        │ +10% Q │        │  0%  │
└──────┘        └───────┘        └───────┘        └────────┘        └──────┘

Legend:
→ Immediate Effect (Next Month)
⟶ Delayed Effect (Future Month)
▬▬► Ongoing Effect (Multiple Months with Decay/Progression)
```

### **Diagram B: Executive Development & Progression System**

```
┌─────────────────────────────────────────────────────────────────────┐
│                 EXECUTIVE PROGRESSION INTERCONNECTIONS              │
└─────────────────────────────────────────────────────────────────────┘

                           ┌─────────────────┐
                           │   EXECUTIVE     │
                           │   BASE STATS    │
                           │ • Level: 1-10   │
                           │ • Mood: 0-100   │
                           │ • Loyalty: 0-100│
                           └────────┬────────┘
                                    │
                ┌───────────────────┼───────────────────┐
                ▼                   ▼                   ▼
        ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
        │  EXPERIENCE  │   │   SUCCESS    │   │   RESOURCE   │
        │   GROWTH     │   │   BONUSES    │   │  INVESTMENT  │
        ├──────────────┤   ├──────────────┤   ├──────────────┤
        │ Each Use:    │   │ Hit #1:      │   │ Training:    │
        │ +10 XP       │   │ +1 Level     │   │ $50k = +Skill│
        │              │   │              │   │              │
        │ 100 XP =     │   │ Award Win:   │   │ Tools:       │
        │ Level Up     │   │ +Prestige    │   │ $25k = +Eff  │
        └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
                │                   │                   │
                └───────────────────┼───────────────────┘
                                    ▼
                        ┌───────────────────────┐
                        │   ACTION MODIFIERS    │
                        ├───────────────────────┤
                        │ Level 1: Base Actions │
                        │ Level 3: +New Options │
                        │ Level 5: Reduced Costs│
                        │ Level 7: Better Odds  │
                        │ Level 10: Legendary   │
                        └───────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │    STORY UNLOCKS      │
                        ├───────────────────────┤
                        │ First #1: Special Act │
                        │ $1M profit: New Deal  │
                        │ 5 Artists: Mass Scout │
                        └───────────────────────┘
```

### **Diagram C: Executive to Game Systems Integration**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EXECUTIVE IMPACT ON GAME SYSTEMS                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────┐                           ┌─────────────────────────┐
│  HEAD OF    │                           │     GAME SYSTEMS        │
│    A&R      │                           ├─────────────────────────┤
├─────────────┤                           │                         │
│ • Scout     │────────Adds────────────►  │ 📊 ARTIST ROSTER        │
│ • Develop   │────────Improves────────►  │ 🎵 ARTIST QUALITY       │
│ • Showcase  │────────Increases───────►  │ 🏆 REPUTATION           │
└─────────────┘                           │                         │
                                          │                         │
┌─────────────┐                           │                         │
│    CMO      │                           │                         │
├─────────────┤                           │                         │
│ • Campaign  │────────Boosts──────────►  │ 📈 SALES/STREAMS        │
│ • Crisis    │────────Protects────────►  │ 🏆 REPUTATION           │
│ • Viral     │────────Expands─────────►  │ 👥 FAN BASE             │
└─────────────┘                           │                         │
                                          │                         │
┌─────────────┐                           │                         │
│    CCO      │                           │                         │
├─────────────┤                           │                         │
│ • Quality   │────────Enhances────────►  │ 🎵 PROJECT QUALITY      │
│ • Genre     │────────Shifts──────────►  │ 🎸 GENRE POSITION       │
│ • Collab    │────────Creates─────────►  │ 🤝 PARTNERSHIPS         │
└─────────────┘                           │                         │
                                          │                         │
┌─────────────┐                           │                         │
│  HEAD OF    │                           │                         │
│   DISTRO    │                           │                         │
├─────────────┤                           │                         │
│ • Platform  │────────Unlocks─────────►  │ 🌍 MARKET ACCESS        │
│ • Tour      │────────Generates───────►  │ 💰 REVENUE STREAMS      │
│ • Timing    │────────Optimizes───────►  │ 📅 RELEASE SCHEDULE     │
└─────────────┘                           └─────────────────────────┘
```

### **Diagram D: Monthly Turn Decision Tree**

```
┌─────────────────────────────────────────────────────────────────────┐
│                      MONTHLY DECISION FLOW TREE                     │
└─────────────────────────────────────────────────────────────────────┘

                            START OF MONTH
                                  │
                    ┌─────────────┴─────────────┐
                    │   Check Active Effects    │
                    │  • Ongoing bonuses        │
                    │  • Delayed results due    │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   Resolve Random Events   │
                    │  • Crisis? → Handle       │
                    │  • Opportunity? → Decide  │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    FOCUS SLOT DECISIONS   │
                    └─────────────┬─────────────┘
                                  │
                ┌─────────────────┼─────────────────┐
                ▼                 ▼                 ▼
          SLOT 1            SLOT 2            SLOT 3
                │                 │                 │
      ┌─────────┴────┐   ┌───────┴──────┐   ┌─────┴───────┐
      │              │   │              │   │             │
      ▼        ▼     ▼   ▼      ▼       ▼   ▼      ▼      ▼
   Executive  Project Other  Executive  Other  Project  Executive
      │              │         │                  │         │
      ▼              ▼         ▼                  ▼         ▼
   Meeting       Start EP   PR Push           Tour Plan   Meeting
      │                                                      │
      ▼                                                      ▼
   3 Options                                            3 Options
      │                                                      │
   Choose 1                                              Choose 1
      │                                                      │
      └──────────────────┬───────────────────────────────────┘
                         │
                         ▼
                 ┌───────────────┐
                 │ ADVANCE MONTH │
                 │ Apply Effects │
                 │ Update Stats  │
                 └───────────────┘
```

---

## **3. UI COMPONENT WIREFRAMES**

### **Component A: Executive Status Dashboard**

```
┌─────────────────────────────────────────────────────────────────┐
│ EXECUTIVE TEAM STATUS                                    [?]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌──────────────┬──────────────┬──────────────┬──────────────┐   │
│ │   A&R HEAD   │     CMO      │     CCO      │  DISTRO HEAD │   │
│ ├──────────────┼──────────────┼──────────────┼──────────────┤   │
│ │ Level: 3     │ Level: 5     │ Level: 2     │ Level: 4     │   │
│ │ ■■■□□□□□□□    │ ■■■■■□□□□□   │ ■■□□□□□□□□    │ ■■■■□□□□□□   │   │
│ │              │              │              │              │   │
│ │ Mood: 😊     │ Mood: 😄    │ Mood: 😐     │ Mood: 😊     │   │
│ │ [########]   │ [##########] │ [######]     │ [########]   │   │
│ │ Loyal: 80%   │ Loyal: 95%   │ Loyal: 50%   │ Loyal: 75%   │   │
│ │              │              │              │              │   │
│ │ Last: 2mo ago│ Last: 1mo ago│ Last: 3mo ago│ Last: 1mo ago│   │
│ │ ✅ Available │ ✅ Available │ ⏳ Busy     │ ✅ Available │   │
│ └──────────────┴──────────────┴──────────────┴──────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Marcus "Mac" Rodriguez - Head of A&R                    [X]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [PORTRAIT]    Level 3 A&R Executive                            │
│   😊           ████████████████████░░░░░░░░░░░  280/300 XP      │
│                                                                 │
│ Core Stats:                                                     │
│ • Mood: ████████░░ (80/100) - Good                           │
│ • Loyalty: ████████░░ (80/100) - Strong                      │
│ • Experience: Level 3 (280/300 XP)                            │
│                                                                 │
│ Recent Activity:                                               │
│ • Last Focused: 2 months ago                                  │
│ • Last Success: Signed "The Velvet Ghosts"                    │
│ • Status: ✅ Available for focus                              │
│                                                                 │
│ Current Capabilities:                                          │
│ • Standard Scouting (Cost: $20-40k)                           │
│ • Talent Showcase (Cost: $30k + 2CC) [ENHANCED AT L3]         │
│ • Artist Development (Cost: $15k + 1CC)                       │
│ 🔒 Poach from Rivals (Unlocks at Level 5)                     │
│                                                                 │
│ [Focus This Month]  [View Full History]  [Invest in Training]  │
└─────────────────────────────────────────────────────────────────┘
```

### **Component B: Focus Slot Selection Modal**

```
┌─────────────────────────────────────────────────────────────────┐
│ SELECT ACTION FOR FOCUS SLOT 2                            [X] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ EXECUTIVE MEETINGS                                      │   │
│ ├─────────────────────────────────────────────────────────┤   │
│ │ 👤 Head of A&R         💰 Varies    ⏱️ Varies         │   │
│ │ 📊 Chief Marketing     💰 Varies    ⏱️ Varies         │   │
│ │ 🎨 Chief Creative      💰 Varies    ⏱️ Varies         │   │
│ │ 🚚 Head of Distribution 💰 Varies    ⏱️ Varies         │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ PROJECT ACTIONS                                         │   │
│ ├─────────────────────────────────────────────────────────┤   │
│ │ 🎵 Start Single        💰 $5-15k    ⏱️ 1-2 months     │   │
│ │ 💿 Start EP            💰 $15-35k   ⏱️ 2-3 months     │   │
│ │ 🎤 Plan Tour           💰 $10-50k   ⏱️ 2-4 months     │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ MARKETING ACTIONS                                       │   │
│ ├─────────────────────────────────────────────────────────┤   │
│ │ 📰 PR Campaign         💰 $3-8k     ⏱️ Immediate      │   │
│ │ 📱 Digital Push        💰 $1-8k     ⏱️ Immediate      │   │
│ └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### **Component C: Effect Timeline Visualization**

```
┌─────────────────────────────────────────────────────────────────┐
│ ACTIVE EFFECTS & TIMELINE                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Current Month: March 2025                                      │
│                                                                 │
│         MAR      APR      MAY      JUN      JUL      AUG      │
│         │        │        │        │        │        │        │
│ A&R:    ●========★                                            │
│         └Showcase └Results                                     │
│                                                                │
│ CMO:    ●▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬►                               │
│         └─────PR Campaign─────┘                                │
│                                                                │
│ CCO:    ●■■■■■■■■■■▥▥▥▥▥▥▥░░░░                               │
│         └Quality+30%└+20%└+10%└End                            │
│                                                                │
│ Random: 🎲                🎲                                   │
│         └Crisis?          └Opportunity?                        │
│                                                                │
│ Legend: ● Action Start  ★ Delayed Result  ▬ Ongoing           │
│         ■ Full Effect   ▥ Reduced Effect  ░ Expired           │
└─────────────────────────────────────────────────────────────────┘
```

---

## **4. RESPONSIVE STATES & ERROR HANDLING**

### **State A: Not Enough Resources**

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ INSUFFICIENT RESOURCES                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ This action requires:                                          │
│ • Money: $50,000 (You have: $32,000) ❌                       │
│ • Creative Capital: 2 (You have: 3) ✓                         │
│                                                                 │
│ Options:                                                        │
│ [Choose Different Action]  [Take Loan]  [Skip This Slot]       │
└─────────────────────────────────────────────────────────────────┘
```

### **State B: Executive Unavailable**

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ EXECUTIVE UNAVAILABLE                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Head of A&R is still managing the talent showcase from last    │
│ month. They will be available again in Month 5.                │
│                                                                 │
│ [Select Different Executive]            [View Timeline]         │
└─────────────────────────────────────────────────────────────────┘
```

---

## **5. MOBILE/TABLET RESPONSIVE WIREFRAMES**

### **Mobile: Executive Selection (Vertical Stack)**

```
┌─────────────────────┐
│ MONTH 3 - MARCH     │
│ Focus: 0/3          │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │  FOCUS SLOT 1   │ │
│ │    [EMPTY]      │ │
│ │  + Select       │ │
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │  FOCUS SLOT 2   │ │
│ │    [EMPTY]      │ │
│ │  + Select       │ │
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │  FOCUS SLOT 3   │ │
│ │    [EMPTY]      │ │
│ │  + Select       │ │
│ └─────────────────┘ │
│                     │
│ [View Executives ▼] │
└─────────────────────┘
```

---

## **IMPLEMENTATION NOTES**

### **Technical Considerations for Wireframes:**

1. **State Management**: Each focus slot needs to track its assigned action and executive
2. **Timeline System**: Need a calendar/timeline component to visualize effects over months
3. **Modal System**: Reuse existing dialogue modal with modifications for executive meetings
4. **Validation**: Real-time checking of resources before allowing action selection
5. **Progress Tracking**: Visual indicators for executive progression and mood
6. **Effect Queue**: System to process immediate/delayed/ongoing effects at month advancement

### **UI/UX Priorities:**

1. **Clear Cost/Benefit**: Always show what actions cost and what they provide
2. **Timeline Visibility**: Players need to see when delayed effects will trigger
3. **Executive Status**: At-a-glance view of all executive states
4. **Slot Management**: Clear indication of used/available focus slots
5. **Undo Capability**: Allow changing focus slot assignments before month advancement

These wireframes provide the foundation for implementing the executive team system while maintaining consistency with the existing game UI and leveraging current components where possible.