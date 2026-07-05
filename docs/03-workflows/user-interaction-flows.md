# User Interaction Flows

**Music Label Manager - Player Journey Documentation**  
*User Experience Workflows*
*Updated: June 30, 2026 — reflects the weekly (52-week) campaign system*

This document focuses on the **player's perspective** and user experience flows. For system-level processing workflows, see [Game System Workflows](./game-system-workflows.md).

> **Game cadence:** The game runs on **weekly turns** across a **52-week campaign**. Earlier drafts of this document described a monthly/12-turn loop; that is obsolete.

---

## 🚀 Core Player Journeys

### **1. New Player Onboarding Flow**

```
Main Menu → Label Creation → Dashboard Introduction → First Actions → Week 1 Complete
    ↓             ↓              ↓                    ↓                ↓
1. User        2. Player       3. Player sees      4. Player       5. Player
   clicks         names label,    starting           learns basic    advances the
   "New Game"     genre, start    resources          interactions    first week
                  year (weeks)    and UI layout
```

**Detailed Onboarding Steps**:
1. **Label Creation**: `LabelCreationModal` collects label name, description, genre focus, and a starting year (weeks are calendar-based); `createNewGame('standard', labelData)` then opens the game at week 1
2. **Initial Landing**: Dashboard loads with starting resources ($500k, 5 rep, 10 creative capital) and 3 focus slots
3. **First Actions**: Encouraged to discover artists and start first project
4. **Guided Experience**: The week planner ("Week N Focus Strategy") shows available actions with context

### **2. Weekly Gameplay Flow**

```
Week Start → Action Planning → Action Execution → Week Advancement → Results Review
     ↓             ↓               ↓                ↓                  ↓
1. Player      2. Player       3. Player       4. System          5. Player
   reviews        selects         executes        processes          reviews
   current        focus-slot      chosen          all changes        Weekly
   situation      actions         actions         (server)           Results
```

> Players have **3 focus slots** (a 4th unlocks at reputation ≥ 50). The "AUTO" button can smart-fill open slots.

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
- Archetype         - Weekly cost   - Archetype     made       - Money deducted
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

## 📈 Week Advancement Workflow

### **End-of-Week Processing Flow**

```
Advance Trigger → Validation → System Processing → State Update → Summary Display
      ↓             ↓            ↓                  ↓             ↓
Player clicks   Check ≥1       GameEngine         Database      Weekly Results
"Advance Week"  action         processes          transaction   modal shows
                selected       all changes        commits        results
```

The **"Advance Week"** button in `GameHeader` calls the `advanceWeek()` store action, which POSTs to `/api/advance-week`, reloads state, and writes an autosave ("Autosave - Week N").

**Processing Order Workflow** (server-authoritative — see [Game System Workflows](./game-system-workflows.md) for the full ordered list):
```
1. Apply Action Effects → 2. Process Projects → 3. Calculate Revenue → 4. Update Relations → 5. Check Progression
         ↓                       ↓                   ↓                  ↓                    ↓
Dialogue effects         Advance project      Apply weekly           Update artist        Check access
and immediate           stages, generate     streaming decay,       mood/energy and      tier unlocks
resource changes        new songs            process catalog        executive            and campaign end
                                             income                 mood/loyalty          (week 52)
```

---

## 🎪 Campaign Completion User Experience

### **End-Game User Journey**

```
Week 52 → Final Week → Campaign Complete → Score Review → Decision
    ↓          ↓             ↓                ↓              ↓
Player     Player sees   CampaignResults  Player reviews  Choose restart
advances   "Week N/52"   modal opens      final results   or quit game
to week    progress      automatically    and stats
52         indicator
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