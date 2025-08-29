# Game System Workflows

**Music Label Manager - Backend System Flows**  
*Technical Process Documentation*

This document focuses on **system-level processing** and backend workflows. For player experience flows, see [User Interaction Flows](./user-interaction-flows.md).

---

## 🎮 Core Game Loop Processing

The Music Label Manager operates on a **monthly turn-based system** where multiple systems interact to process player actions and advance game state.

### **Monthly Turn Processing Flow**

```
Action Selection → Validation → Processing → State Updates → Results Display
       ↓              ↓           ↓           ↓              ↓
   1. Player      2. System    3. Game     4. Database    5. UI
   chooses up     validates    Engine      transaction    updates
   to 3 actions   constraints  processes   commits        with new
                                all logic   changes        state
```

### **Turn Processing Workflow**

**Phase 1: Action Validation**
```
Selected Actions → Resource Check → Constraint Validation → Action Queue
     ↓                  ↓                 ↓                    ↓
- Role meetings     - Sufficient      - Maximum 3         - Valid actions
- Project starts      money           actions             ready for
- Marketing         - Available       - Artist            processing
  campaigns           focus slots       availability
```

**Phase 2: System Processing**
```
GameEngine Processing → Individual System Updates → Cross-System Effects
         ↓                      ↓                        ↓
1. Project advancement     1. Artist mood changes    1. Reputation affects
2. Revenue calculations    2. Resource deductions       access tiers
3. Relationship updates    3. Progress tracking      2. Quality affects
4. Random events                                        revenue
```

**Phase 3: State Synchronization**
```
Calculated Changes → Database Transaction → Client State Update → UI Refresh
       ↓                    ↓                     ↓                 ↓
- New resources        - Atomic update       - Zustand store   - Dashboard
- Updated projects     - All or nothing      - Game state      - Component
- Changed relations    - Consistent state    - Action reset      refresh
```

---

## 🎤 Artist Management Workflow

### **Artist Discovery Process Flow**

```
Discovery Trigger → Available Artists → Selection → Signing → Integration
       ↓                  ↓              ↓          ↓           ↓
1. Player opens        2. System        3. Player  4. Resource 5. Artist
   discovery modal        filters          reviews    deduction   appears in
                         available         options    & slot      roster
                         artists by        and        allocation
                         reputation        chooses
```

### **Artist Relationship System Flow**

```
Player Actions → Relationship Impact → Mood/Loyalty Changes → Performance Effects
     ↓               ↓                      ↓                     ↓
- Dialogue        - Supportive =         - Improved mood =    - Higher project
  choices           +loyalty              +performance          quality
- Project         - Demanding =          - Decreased mood =   - Lower project
  success           -loyalty              -performance          quality
- Resource        - Success =            - Changed loyalty =  - Contract
  allocation        +mood                 relationship          renewal effects
```

**Artist Mood Impact Workflow**:
```
Artist Mood Level → Project Quality Modifier → Revenue Impact → Relationship Feedback Loop
       ↓                    ↓                     ↓                     ↓
High (80-100)         +15 quality bonus      Higher revenue      Further mood improvement
Good (60-79)          +10 quality bonus      Standard revenue    Maintained relationship  
Low (40-59)           +5 quality bonus       Lower revenue       Risk of mood decline
Poor (0-39)           No bonus/penalty       Poor revenue        Relationship strain
```

---

## 🎵 Project System Workflow

### **Project Lifecycle Flow**

```
Project Creation → Production → Marketing → Release → Revenue Generation
       ↓              ↓           ↓          ↓            ↓
1. Player defines   2. System    3. Auto    4. Songs     5. Monthly
   parameters          generates    advance    marked       revenue
   (type, budget,      songs        through    released     decay
   producer, time)     monthly      stages                  processing
```

### **Multi-Song Project Workflow**

```
Project Start → Song Generation → Quality Calculation → Release Processing → Revenue Tracking
     ↓               ↓                 ↓                    ↓                   ↓
1. Set song      2. Monthly song    3. Individual       4. All songs        5. Each song
   count (1-5)      creation          song quality        automatically       tracked
                    (2-3/month)       calculated          released            separately
```

**Song Generation Process**:
```
Project Parameters → Base Quality → Modifier Application → Final Song → Revenue Potential
       ↓                ↓               ↓                    ↓              ↓
- Producer tier      - Random        - Producer bonus     - Stored in    - Initial streams
- Time investment      base           - Time bonus           database     - Monthly decay
- Budget allocation    (40-60)        - Budget bonus       - Associated   - Revenue calculation
- Artist mood                         - Mood bonus           with project
```

---

## 💰 Resource Management Workflow

### **Revenue Generation Flow**

```
Project Releases → Initial Revenue → Monthly Decay → Access Tier Bonuses → Final Revenue
       ↓               ↓                ↓                 ↓                  ↓
Songs released     Quality-based    15% monthly       Reputation-based   Player receives
automatically      initial          decay applied     multipliers        money each
when projects      calculations     to all active     (playlist/press/   month from
complete                           releases          venue access)       catalog
```

### **Expense Processing Workflow**

```
Monthly Expenses → Base Operations → Artist Costs → Project Budgets → Total Deduction
       ↓               ↓               ↓              ↓                ↓
Automatic          $3,000-6,000    $600-2,000      Allocated at     Total monthly
monthly            base burn       per artist      project start    burn applied
processing                         monthly                          to player money
```

---

## 🎵 Song Title Editing Workflow

### **Player-Initiated Song Customization Process**

```
Song Discovery → Edit Trigger → Validation → Update Processing → UI Refresh
      ↓             ↓            ↓            ↓                ↓
1. Player views   2. Hover      3. Client    4. API request   5. Real-time
   song in           reveals       validates    processes       UI updates
   release           edit icon     input        title change    across components
   planning
```

### **Song Title Editing Flow**

**Phase 1: Edit Initiation**
```
Player Interaction → UI State Change → Edit Mode Activation
       ↓                 ↓                   ↓
Hover over song      Edit icon appears    Input field replaces
title in Plan        with pencil          display title with
Release page         symbol               current value
```

**Phase 2: Input Validation & Processing**
```
User Input → Client Validation → API Request → Server Processing → Database Update
    ↓              ↓                 ↓             ↓                 ↓
Player types    Length check       PATCH          Authorization     Title updated
new title       (max 100 chars)   /api/songs/    verification      with timestamp
                Non-empty check    :songId        Game ownership    in songs table
```

**Phase 3: Response Handling & UI Updates**
```
API Response → State Updates → Component Refresh → Visual Feedback
     ↓             ↓              ↓                 ↓
Success/Error   songTitles     Song list          Check mark or
response        state map      Lead single        error message
received        updated        dropdown refresh   displayed
```

### **Validation Chain Workflow**

```
Title Input → Client Checks → Server Validation → Database Constraints → Response
     ↓             ↓              ↓                    ↓                  ↓
"New Title"   Length ≤ 100    Non-empty string     User owns game     Success: {
              Not empty       User authenticated   Song exists        id, title,
              Trim spaces     Game ownership       Valid song ID      previousTitle}
```

### **Error Handling Workflow**

```
Validation Failure → Error Classification → User Feedback → Recovery Options
       ↓                   ↓                    ↓              ↓
Client: Length/Empty    Server: Auth/Not Found   Error message  Cancel edit or
Server: Unauthorized    Database: Constraint     displayed      retry input
Network: Request failed  Unknown: 500 error      to user        
```

**Error Recovery Flow**:
- **Input Errors**: Highlight invalid input, show validation message
- **Authorization Errors**: Display permission message, exit edit mode  
- **Network Errors**: Show retry option, maintain edit state
- **Unknown Errors**: Generic error message, safe fallback to display mode

### **Cross-Component Integration Workflow**

```
Title Update → Song List Refresh → Lead Single Update → State Synchronization
     ↓               ↓                    ↓                    ↓
API success     Updated title        Dropdown options     All components
response        in song cards        reflect new title    display consistent
received        immediately          if song selected     updated title
```

**Integration Points**:
- **Song Selection**: Edited titles immediately available in selection pool
- **Lead Single Dropdown**: Options update in real-time without re-fetch
- **Release Preview**: Updated titles reflected in marketing preview
- **Project Summary**: New titles shown in project overview displays

### **UX Enhancement Features**

**Keyboard Navigation Workflow**:
```
Edit Mode → Key Press Detection → Action Processing → Mode Exit
    ↓           ↓                    ↓               ↓
Input         Enter = Save         API call        Success: exit edit
field         Escape = Cancel      or state        Error: show message
focused       Tab = Next field     reset           Cancel: restore original
```

**Click Interaction Workflow**:
```
Mouse Events → Event Classification → Action Processing → UI Response
     ↓               ↓                    ↓               ↓
Click inside    Continue editing     No action         Input remains
Click outside   Save changes         API call          Edit mode exits
Click buttons   Save/Cancel          API or cancel     Mode change
```

### **Performance Optimization Workflow**

```
Edit State → Debounced Validation → Optimistic Updates → Error Recovery
     ↓              ↓                     ↓                 ↓
User types    Client validation      UI updates        Rollback on
characters    300ms delay           immediately       API failure
              Prevents spam         Appears saved     Restore previous
```

---

## 🎲 Access Tier Progression Workflow

### **Tier Advancement Process**

```
Reputation Changes → Tier Threshold Check → Unlock Notification → Benefit Application
       ↓                    ↓                     ↓                   ↓
Player actions          System checks         UI notification      Enhanced project
affect reputation       if new tiers          of progression       success rates
(projects, dialogue)    are unlocked                              and multipliers
```

**Access Tier System Flow**:
```
Playlist Access: None → Niche (15 rep) → Mid (30 rep) → Flagship (60 rep)
Press Access:    None → Blogs (20 rep) → Mid-Tier (35 rep) → National (50 rep)
Venue Access:    None → Clubs (25 rep) → Theaters (40 rep) → Arenas (65 rep)
```

Each tier provides:
- **Multiplier bonuses** to project success
- **Enhanced revenue** from released content
- **Increased project** success probability

---

## 🤝 Dialogue System Workflow

### **Role Interaction Process Flow**

```
Role Selection → Dialogue Options → Player Choice → Immediate Effects → Delayed Effects
     ↓              ↓                 ↓              ↓                  ↓
Player selects   System presents   Player makes   Resources         Effects trigger
industry role    context-specific  choice from    updated           in future
from available   dialogue tree     2-3 options    immediately       months
roles                                                               (if applicable)
```

### **Dialogue Effect Processing**

```
Choice Made → Effect Type Check → Application → System Integration
     ↓             ↓                 ↓             ↓
Player         Immediate =         Apply to      Update all
selects        resource change     game state    affected
option         Delayed =           right now     systems
               future trigger      
```

**Effect Types Flow**:
- **Immediate**: Money +/-, reputation +/-, creative capital +/-
- **Delayed**: Flag set for future month processing
- **Conditional**: Effects based on current game state

---

## 🎯 Campaign Completion Workflow

### **Campaign Progression Flow**

```
Month 12 Reached → Final Calculations → Score Generation → Results Display → Restart Option
       ↓                ↓                   ↓                ↓                 ↓
System detects     Calculate final     Generate score    Show completion   Allow new
month 12           money, reputation   based on          modal with        campaign
completion         project success     achievements      final results     creation
```

**Scoring System Flow**:
```
Final Resources → Achievement Points → Bonus Multipliers → Total Score → Ranking
      ↓                ↓                    ↓                ↓            ↓
- Money score       - Hit singles        - Difficulty       Combined    Performance
- Reputation        - Artists signed     - Access tiers     final       classification
- Projects          - Campaign goals     - Special events   score       (Survival/Success/
  completed                                                              Domination)
```

---

## 🔄 Save/Load System Workflow

### **Save Process Flow**

```
Save Trigger → Game State Serialization → Database Storage → Confirmation
     ↓                ↓                       ↓                ↓
Player clicks     Convert complete        Store as JSONB    UI confirms
save or           game state to           in database       save success
autosave          JSON format
```

### **Load Process Flow**

```
Load Selection → State Retrieval → Deserialization → Game Restoration → UI Refresh
     ↓              ↓                 ↓                ↓                 ↓
Player selects   Database query     Parse JSON       Restore all       Dashboard
saved game       retrieves JSONB    back to game     game state        updates with
                 save data          state objects    objects           loaded state
```

---

## 🎪 Cross-System Integration Workflow

### **System Interaction Map**

```
Artist System ←→ Project System ←→ Revenue System
     ↑                ↑                  ↑
     ↓                ↓                  ↓
Dialogue System ←→ Resource System ←→ Progress System
     ↑                ↑                  ↑
     ↓                ↓                  ↓
Access Tiers ←→ Campaign System ←→ Save System
```

**Key Integration Points**:
- **Artist mood** affects **project quality** affects **revenue generation**
- **Reputation changes** affect **access tiers** affect **project success multipliers**
- **Resource management** affects **available actions** affects **strategic choices**
- **Project completion** affects **artist relationships** affects **future project quality**

---

*This workflow documentation defines how all game systems interact and process player actions in the Music Label Manager simulation.*