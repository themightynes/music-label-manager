# Music Industry Sim - UI Workflow Documentation

**Project**: Browser-based Music Industry Management Simulation  
**Generated**: August 17, 2025  
**Source**: ChatGPT 5 Analysis of PRD, MVP Scope, Concept & Vision, MVP Status  
**Next Step**: Generate UIZARD-optimized specifications

---

## Phase 1: Document Analysis Summary

### Core Product Purpose & Value Proposition
- **Purpose**: A browser-based music industry management sim where players run a record label
- **Value Proposition**: Blends strategic resource management with emotionally charged role/artist dialogues. Replayable, light but deep
- **Differentiator**: Balances systems depth (like Music Wars) with narrative investment (like visual novels)

### Primary User Personas & Use Cases
1. **Simulation Gamers**: Tycoon/strategy fans who want to plan budgets, optimize campaigns, and "win" commercially
2. **Music Enthusiasts**: Curious about the behind-the-scenes of the industry; they want accessible drama + authentic feel
3. **Narrative Players**: Seek character-driven stories, meaningful choices, and replayability

### Key Features Prioritized for MVP
- **Campaign Structure**: 12-Month Campaign with monthly turn progression
- **Resource Management**: Focus Slots (3 per month) → choose meetings/projects
- **Artist Management**: Artists (3 archetypes) → manage roster, loyalty, mood
- **Industry Interaction**: Industry Roles (8) → dialogue-driven choices with effects
- **Project Types**: Singles, EPs, Mini-Tours
- **Core Resources**: Money, Reputation, Creative Capital, Focus Slots, Artist Mood/Loyalty
- **Dynamic Content**: Side Stories (12 random events)
- **Essential UI Screens**: Dashboard, Month Planner, Conversation Modal, Project Sheets, End-of-Month Summary, Saves

### Technical Constraints
- **Stack**: React + TS + Vite, Zustand, Tailwind, shadcn/ui, Recharts
- **Performance Targets**: <4s load, <300ms month resolution
- **Compatibility**: Browser-first, min res 1366x768, keyboard navigation required
- **Data Persistence**: LocalStorage only, JSON export/import

### Business Goals & Success Metrics
- ≥ 35% of players finish 12-month campaign
- Average session length: 20–30 minutes
- At least 2 viable strategies (commercial vs artistic)
- No progression-blocking bugs

---

## Phase 2: UI Architecture & Flow

### A. Information Architecture

#### Navigation Hierarchy (Desktop-first)
```
Home / Main Menu
├── New Game
├── Load Game (3 slots + autosave)
└── Settings (seed, accessibility toggles)

In-Game
├── Dashboard (default landing)
├── Month Planner
├── Conversation Modal (overlay)
├── Project Sheets
└── End-of-Month Summary
└── Save/Export Modal
```

#### Content Organization
- **Dashboard**: KPIs hub (resources, roster, projects, access badges)
- **Planner**: Choice hub (focus slots → actions)
- **Conversation Modal**: Microdrama hub (dialogue with roles/artists)
- **Project Sheets**: Tracking hub (costs, progress, deadlines)
- **End-of-Month Summary**: Feedback hub (results + consequences)

#### User Journey
1. Start → Dashboard overview
2. Open Planner → select 3 focus actions
3. Some actions trigger Conversation Modal (choices)
4. Advance Month → see End-of-Month Summary
5. Back to Dashboard → adjust next month
6. Repeat until Month 12 → Scorecard

#### Feature Prioritization
- **Must-Have**: Dashboard, Planner, Dialogue, Summary, Save
- **Should-Have**: Project sheets, Artist signing flow
- **Nice-to-Have**: Side story UI, quick alerts

### B. User Flow Diagrams

#### Primary Workflows
1. **Main Game Loop**: Start New Game → Dashboard → Month Planner → Pick Actions → Conversations (if triggered) → Advance Month → Summary → Back to Dashboard
2. **Project Management**: Project Creation → Select type (Single/EP/Tour) → Assign budget/time → Track in Project Sheet
3. **Save Management**: Save/Load → Open Save Modal → Select slot → Confirm save/load

#### Secondary / Edge Flows
- **Import JSON Save**: Validate → Error toast if invalid
- **Budget Management**: Running out of money → Survival tips modal (not fail state)
- **Event Handling**: Skipping Side Stories → "Ignored event" notification

#### Error States & Recovery
- Invalid save import → error message with retry
- Budget overrun → greyed-out confirm button with tooltip
- Accessibility mismatch → fallback to text mode

#### Onboarding / First-Time Experience
- Month 1 guided tips: "Pick your first meeting" → "Advance Month to see results"
- Subtle tutorial modals, dismissible after first play

### C. Screen-by-Screen Breakdown

#### 1. Dashboard
- **Purpose**: Central hub of current label status
- **Key Elements**: KPI cards (Money, Reputation, Creative Capital), artist roster cards, project cards, access tier badges
- **Layout**: 2-column grid → KPIs on top row, roster/projects below
- **Interactions**: Click artist/project card → detail modal
- **Responsive**: Stacked layout for mobile

#### 2. Month Planner
- **Purpose**: Pick 3 monthly actions
- **Key Elements**: Focus slot tracker, action list (roles, projects, PR, ads, streaming)
- **Layout**: Left panel (slots), right panel (actions)
- **Interactions**: Drag/drop or click-to-assign; role meetings open DialogueModal

#### 3. Conversation Modal
- **Purpose**: Dialogue with roles/artists
- **Key Elements**: Character portrait, dialogue text, 3–4 choice buttons, stat change preview badges
- **Layout**: Modal overlay with card-like dialogue box
- **Interactions**: Select choice → immediate toast + delayed flag preview

#### 4. Project Sheets
- **Purpose**: Track and manage ongoing music projects
- **Key Elements**: Project card (title, stage, budget, quality, due date)
- **Layout**: Grid of cards with expand option
- **Interactions**: Open project detail modal for progress and adjustments

#### 5. End-of-Month Summary
- **Purpose**: Show outcomes and feedback
- **Key Elements**: 5–8 key deltas (e.g., +Reputation, −Money), event outcomes, financial summary
- **Layout**: Vertical list with icons + short explanations
- **Interactions**: "Continue" button returns to Dashboard

#### 6. Save/Export Modal
- **Purpose**: Manage saves
- **Key Elements**: 3 slots with metadata (month, money, date), autosave slot, import/export buttons
- **Layout**: Modal overlay with slots in a row
- **Interactions**: Save, Load, Import (with validation), Export

### D. Component Specifications

#### Design System
- **Buttons**: Primary (filled), Secondary (outlined), Disabled (greyed)
- **Cards**: KPI cards (small), Artist/Project cards (medium)
- **Modals**: Full-screen overlay for Dialogue, centered box for Saves/Projects
- **Toasts**: Top-right, 2–3s display, show stat changes
- **Badges**: Access tier badges (Playlist, Press, Venue)

#### Forms & Validation
- **Project creation modal**: dropdowns (type, producer tier), number fields (budget), validation for budget caps
- **Save import**: JSON validation with field-level errors

#### Navigation Patterns
- Top nav bar (Dashboard, Planner, Projects, Settings)
- In-game modals always have "Close" or "Cancel"

#### Data Visualization
- Recharts for monthly financials, streaming growth charts
- Progress bars for project quality and artist loyalty/mood

#### Media Handling
- Character portraits (static, stylized)
- Role/artist icons (SVG for clarity)
- Backgrounds: minimal, flat color or blurred for readability

---

## Next Steps

### Immediate Actions
1. **Request Phase 3 from ChatGPT**: UIZARD-Optimized Specifications for top 3 screens:
   - Dashboard
   - Month Planner
   - Conversation Modal

2. **Test Initial Screen**: Use Phase 3 output to prototype Dashboard in UIZARD

3. **Iterate and Refine**: Adjust specifications based on UIZARD interpretation

### Future Development Phases
1. **Phase 1 Screens**: Dashboard, Month Planner, Conversation Modal
2. **Phase 2 Screens**: Project Sheets, End-of-Month Summary, Save Modal
3. **Phase 3 Enhancements**: Side story UI, quick alerts, accessibility features

### Quality Assurance Notes
- Ensure all screens meet performance targets (<300ms interactions)
- Validate keyboard navigation on all components
- Test responsive behavior across target resolutions
- Verify save/load functionality with edge cases

---

## Document Status
- ✅ **Phase 1 Complete**: Document analysis and strategic foundation
- ✅ **Phase 2 Complete**: UI architecture and user flows
- ⏳ **Phase 3 Pending**: UIZARD-optimized specifications
- ⏳ **Phase 4 Pending**: Implementation roadmap

**Last Updated**: August 17, 2025  
**Next Review**: After Phase 3 completion