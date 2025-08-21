# User Interaction Flows

**Music Label Manager - Player Journey Documentation**  
*User Experience Workflows*

This document focuses on the **player's perspective** and user experience flows. For system-level processing workflows, see [Game System Workflows](./game-system-workflows.md).

---

## 🚀 Core Player Journeys

### **1. New Player Onboarding Flow**

```
App Launch → Game Creation → Dashboard Introduction → First Actions → Month 1 Complete
    ↓             ↓              ↓                    ↓                ↓
1. User        2. System       3. Player sees      4. Player       5. Tutorial
   visits         creates         starting           learns basic    complete,
   application    new game        resources          interactions    player ready
                  with defaults   and UI layout                      for gameplay
```

**Detailed Onboarding Steps**:
1. **Initial Landing**: Dashboard loads with starting resources ($75k, 5 rep, 10 creative capital)
2. **UI Orientation**: Player sees KPI cards, empty artist roster, available focus slots
3. **First Actions**: Encouraged to discover artists and start first project
4. **Guided Experience**: Month planner shows available actions with context

### **2. Monthly Gameplay Flow**

```
Month Start → Action Planning → Action Execution → Month Advancement → Results Review
     ↓             ↓               ↓                ↓                  ↓
1. Player      2. Player       3. Player       4. System          5. Player
   reviews        selects         executes        processes          reviews
   current        up to 3         chosen          all changes        month
   situation      actions         actions                            summary
```

**Action Selection Process**:
```
Available Actions → Constraint Check → Selection → Confirmation → Queue
       ↓                 ↓              ↓            ↓              ↓
- Role meetings      - Sufficient      Player      Visual         Actions
- Project starts       resources       chooses     feedback       ready for
- Artist signing     - Focus slots     priority    on choices     processing
- Marketing          - Prerequisites   actions
```

### **3. Artist Discovery & Signing Journey**

```
Discovery Need → Modal Open → Artist Review → Selection → Budget Check → Signing → Integration
      ↓             ↓            ↓             ↓           ↓              ↓           ↓
Player needs    Discovery    Player views   Player      System         Contract    Artist
new artist      modal        available      selects     validates      processed   appears
               shows         artists with   preferred   funds &                    in roster
               options       stats/costs    artist      focus slots
```

**Artist Selection Decision Process**:
```
Artist Stats Review → Cost Analysis → Strategic Fit → Decision → Commitment
        ↓                ↓              ↓             ↓           ↓
- Talent level       - Signing cost  - Genre match  Choice     - Focus slot
- Archetype         - Monthly cost  - Archetype     made       - Money deducted
- Genre specialty   - ROI potential   strategy               - Artist added
```

### **4. Project Creation Flow**

```
Project Trigger → Type Selection → Economic Decisions → Confirmation → Production Start
      ↓               ↓               ↓                  ↓               ↓
Player wants     Choose single/   Set budget,        Review total    Project enters
new project      EP/mini-tour     producer tier,     cost & impact   production queue
                                  time investment
```

**Economic Decision Workflow**:
```
Project Type → Song Count → Budget Per Song → Producer Selection → Time Investment → Total Cost
     ↓             ↓            ↓                 ↓                   ↓                ↓
Single (1)     Set quantity  Choose budget     Local/Regional/     Rushed/Standard/  System
EP (2-5)       for project   allocation        National/          Extended/         calculates
Mini-tour (1)               per song          Legendary          Perfectionist     final cost
```

---

## 🎭 Role Dialogue Interaction Flow

### **Dialogue Engagement Process**

```
Role Selection → Context Display → Choice Presentation → Decision → Effect Application
     ↓               ↓               ↓                   ↓           ↓
Player chooses   System shows     Player sees        Choice      Immediate effects
industry role    current          2-3 contextual     selected    applied to game
to interact      situation        response options              state instantly
with
```

**Dialogue Choice Processing**:
```
Choice Selection → Effect Type Check → Immediate Processing → Delayed Effect Setup
       ↓                ↓                    ↓                     ↓
Player picks        System determines    Apply resource          Schedule future
response option     immediate vs         changes right now       effects if
                    delayed effects                              applicable
```

**Role Interaction Types**:
- **Manager**: Networking, business strategy, reputation building
- **A&R**: Artist relationships, talent scouting, creative direction  
- **Producer**: Project quality, technical decisions, creative enhancement

---

## 📈 Month Advancement Workflow

### **End-of-Month Processing Flow**

```
Advance Trigger → Validation → System Processing → State Update → Summary Display
      ↓             ↓            ↓                  ↓             ↓
Player clicks   Check all      GameEngine         Database      Month summary
"End Month"     actions        processes          transaction   modal shows
                completed      all changes        commits       results
```

**Processing Order Workflow**:
```
1. Apply Action Effects → 2. Process Projects → 3. Calculate Revenue → 4. Update Relations → 5. Check Progression
         ↓                       ↓                   ↓                  ↓                    ↓
Dialogue effects         Advance project      Apply revenue          Update artist        Check access
and immediate           stages, generate     decay, process         mood/loyalty         tier unlocks
resource changes        new songs            catalog income         changes              and campaign end
```

---

## 🎪 Campaign Completion User Experience

### **End-Game User Journey**

```
Month 12 → Final Month → Campaign Complete → Score Review → Decision
    ↓          ↓             ↓                ↓              ↓
Player     Player sees   Achievement      Player reviews  Choose restart
advances   "Final        modal opens      final results   or quit game
to month   Month"        automatically    and stats
12         indicator
```

**Player Decision Points**:
- Review final score and achievements
- Compare performance against goals
- Choose to restart campaign or exit
- Share results (future feature)

---

## 🔄 Save/Load User Experience

### **Saving Progress**

```
Need to Save → Save Option → Name Entry → Confirmation → Success Feedback
     ↓             ↓            ↓            ↓              ↓
Player wants   Click save    Enter save   Confirm save   Visual success
to preserve    button        name         action         confirmation
progress
```

### **Loading Saved Game**

```
Load Desire → Save Selection → Load Confirmation → Game Restored → Continue Play
     ↓             ↓              ↓                 ↓               ↓
Player wants   Choose from    Confirm load      Game state      Resume from
to resume      save slots     decision          restored        saved point
previous game
```

---

## ⚠️ Error Handling Workflows

### **Insufficient Resources Flow**

```
Action Attempt → Resource Check → Insufficient Detection → Error Display → Alternative Options
      ↓              ↓               ↓                     ↓               ↓
Player tries     System           Not enough            Show error      Suggest
expensive        validates        money/slots           message         alternatives
action           requirements     available                             or solutions
```

### **Network Error Recovery**

```
Action Failure → Error Detection → Retry Logic → Success/Failure → User Feedback
     ↓              ↓               ↓              ↓                ↓
API call         System           Automatic      Either           Inform player
fails            detects          retry          succeeds         of outcome
                 failure          attempt        or fails         and options
```

---

*This documentation defines all user interaction patterns and system workflows in the Music Label Manager simulation.*