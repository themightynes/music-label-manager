# Music Label Manager - Documentation Hub

**Documentation Navigation Center**

---

## 📊 **Project Status & Onboarding**

- [**📈 DEVELOPMENT_STATUS.md**](../DEVELOPMENT_STATUS.md) - **SINGLE SOURCE OF TRUTH** for project status, onboarding, and development progress

---

## 🎯 **Quick Start by Role**

### **Developers**
- [**System Architecture**](./02-architecture/system-architecture.md) - Technical overview

### **Content Creators**
- [**Content Editing Guide**](./06-development/content-editing-guide.md) - Edit game content without coding

### **Project Managers**
- [**Active Development (v2.0)**](./01-planning/CORE_FEATURES_sim-v2.0.md) - Current priorities & roadmap

---

## 📁 **Documentation Structure**

### **01-Planning** - Strategic Documents
- [**Active Development (v2.0)**](./01-planning/CORE_FEATURES_sim-v2.0.md) - Current 6-month priorities
- [Development Roadmap 2025 (v1.0) - COMPLETE](./99-legacy/complete/development_roadmap_2025_sim-v1.0.md) - Historical MVP record
- [Music Creation Future Phases](<./01-planning/implementation-specs/[FUTURE] music-creation-release-cycle-phases-3-4.md>)
- [Music Game System Map](./01-planning/music_game_system_map.html)
- [Desktop GUI Migration Strategy](./01-planning/desktop-gui-migration-strategy.md) - Tauri vs. Electron vs. web-native pathways (Planning phase)
- [Artist Contract System - Dependency Analysis](./01-planning/implementation-specs/artist-contract-system-dependencies.md) - Dependency map for A&R scouting/discovery/signing/cost systems

**`[FUTURE]`-tagged specs** (deferred designs, not yet scheduled):
- [Awareness System Design](<./01-planning/implementation-specs/[FUTURE] awareness-system-design.md>) - Sustained-streaming awareness mechanic
- [Email Narrative Storytelling Guide](<./01-planning/implementation-specs/[FUTURE] Email Narrative Storytelling Guide.md>) - Voice/personality guide for exec email content
- [Release Experience Improvement Plan](<./01-planning/implementation-specs/[FUTURE] release-experience-improvement-plan.md>) - Deferred behind Phase 1 service extractions; companion to the tour plan below
- [Tour Experience Improvement Plan](<./01-planning/implementation-specs/[FUTURE] tour-experience-improvement-plan.md>) - Deferred behind the server-routes refactor
- [XState Modal Orchestrator Plan](<./01-planning/implementation-specs/[FUTURE] xstate-modal-orchestrator-plan.md>) - Fixes stacked-modal race (Campaign Results vs. Week Summary)

### **02-Architecture** - Technical Design
- [System Architecture](./02-architecture/system-architecture.md)
- [Database Design](./02-architecture/database-design.md)
- [Content Data Schemas](./02-architecture/content-data-schemas.md)
- API Design and Music Creation Architecture were archived July 4, 2026 (see `99-legacy/superseded-2026-07/`) — superseded by System Architecture + `shared/api/contracts.ts`, and by the engine processors, respectively

### **03-Workflows** - User & Game Systems
- [User Interaction Flows](./03-workflows/user-interaction-flows.md)
- [Game System Workflows](./03-workflows/game-system-workflows.md)

### **04-Frontend** - React Application
- [Client Frontend Rules](../client/CLAUDE.md) - Current frontend architecture, state management, navigation
- [Design System v2](./04-frontend/design/v2/design-system-v2.md) - Neo-Cyber HUD visual system

### **05-Backend** - Server Architecture
- [Backend Architecture](./05-backend/backend-architecture.md)

### **06-Development** - Development Guides
- [Content Editing Guide](./06-development/content-editing-guide.md)
- [Documentation Governance](./06-development/documentation-governance.md)

### **ai-dev-tasks** - Structured AI Feature Development
- [AI Dev Tasks](./ai-dev-tasks/README.md) - Workflow templates for PRD creation, task generation, and implementation

### **08-Future Features** - Roadmap
- [Comprehensive Roadmap (v3.0+)](./08-future-features-and-fixes/comprehensive-roadmap_sim-v3.0.md) - Long-term vision
- [Content Management Features](./08-future-features-and-fixes/content-management-features.md)

### **09-Troubleshooting** - Issues & Solutions
- [Consolidated Troubleshooting](./09-troubleshooting/consolidated-system-troubleshooting.md)

### **98-Research** - Dated Research & Audits
- Dated case files and adversarially-verified system audits (e.g. gap analyses, code reviews). Point-in-time snapshots, not living docs.
- [Executive Meetings System - Complete Reference](./01-planning/implementation-specs/REFERENCES%20AND%20ANALYSIS/%5BREFERENCE%5D%20executive-meetings-system-complete-reference.md) - Canonical as-built reference for the executive meetings system (see `docs/CLAUDE.md` for the full doc constellation: vision doc, backlog)

### **99-Legacy** - Archived Content
- `99-legacy/superseded-2026-07/` - Docs archived July 4, 2026: (1) during the Phase 0-4 staleness cleanup (pre-refactor API design, music creation architecture, frontend architecture, plan-release API spec); (2) the exec-meetings-revival playtest notes (`PLAYTEST_NOTES_EXEC_MEETINGS_2026-07-04.md`), closed once all findings were fixed (commits on PR #119), logged (C67/C68/C69), or elevated to `[FUTURE]` planning docs (effect-legibility, relevance-and-reactivity)

---

## 📋 **Documentation Best Practices**

### **🎯 Folder Purpose Guidelines**

**Before adding documentation, ask:**
1. **Does this content belong in an existing folder?**
2. **Does this create redundancy with existing docs?**
3. **Is this the right audience for this folder?**

### **📁 Folder Boundaries**

| Folder | Purpose | Audience | What Goes Here | What Doesn't Go Here |
|--------|---------|----------|----------------|---------------------|
| `01-planning/` | Strategic vision & roadmaps | PMs, Leadership | Business requirements, roadmaps | Implementation details, code |
| `02-architecture/` | System design & schemas | Developers | Technical architecture, data schemas | User guides, implementation steps |
| `03-workflows/` | Process flows | Developers, PMs | User journeys, system processes | Code examples, debugging |
| `04-frontend/` | React app architecture | Frontend devs | Component design, UI patterns | Backend details, content editing |
| `05-backend/` | Server implementation | Backend devs | Server setup, API implementation | Architecture theory, user guides |
| `06-development/` | Practical dev guides | All developers | Setup guides, how-to content | Architectural theory, future plans |
| `ai-dev-tasks/` | AI-assisted development workflow | Developers using AI tools | PRD templates, task planning prompts | Completed features, code examples |
| `08-future-features/` | Roadmap & ideas | PMs, Developers | Future enhancements, research | Current implementation, user guides |
| `09-troubleshooting/` | Problem solving | All roles | Debugging, fixes, known issues | General documentation, tutorials |

### **🚫 Anti-Patterns to Avoid**

1. **Content Duplication**: If it exists elsewhere, link to it instead
2. **Wrong Audience**: Don't put technical details in user-facing docs
3. **Scope Creep**: Keep folder purposes narrow and distinct
4. **Future Bloat**: Don't document unimplemented features in current docs

### **✅ Documentation Review Checklist**

**Before adding new documentation:**
- [ ] **Unique Value**: Does this provide information not available elsewhere?
- [ ] **Right Location**: Does this match the folder's purpose and audience?
- [ ] **Cross-References**: Are links to related docs included?
- [ ] **Maintenance**: Will this stay current with code changes?
- [ ] **Clarity**: Can the target audience understand and act on this?

**Before editing existing documentation:**
- [ ] **Scope Check**: Are you changing the document's intended purpose?
- [ ] **Consistency**: Does this match the style and depth of the folder?
- [ ] **Dependencies**: Will this break links in other documents?

### **🔄 Maintenance Guidelines**

1. **Link Validation**: Check that all internal links work when moving/renaming files
2. **Audience Consistency**: Don't mix technical and non-technical content in the same document
3. **Length Control**: Split documents over 500 lines into focused sub-documents
4. **Regular Review**: Remove outdated information rather than letting it accumulate

### **📝 Adding New Content**

**Step 1**: Determine if new content is needed
- Search existing docs for similar information
- Consider updating existing docs instead of creating new ones

**Step 2**: Choose the right location
- Match content purpose to folder purpose
- Consider the primary audience who will use this content
- Avoid creating new folders unless absolutely necessary

**Step 3**: Write with focus
- Address one specific need or question
- Link to related information rather than duplicating it
- Use the minimum viable documentation approach

**Need help deciding where documentation belongs?** Reference this folder purpose table or consult the detailed [Documentation Governance](./06-development/documentation-governance.md) guide.