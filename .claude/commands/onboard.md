---
description: Get comprehensive project onboarding for Music Label Manager development
allowed-tools: Read, Glob, Grep, Bash(npm run check:*), Bash(git status), Bash(lsof:*)
argument-hint: [optional: focus area like 'frontend', 'backend', 'content', or a system name like 'executive meetings']
---

# Music Label Manager - Development Onboarding

Welcome! I'll get you oriented for development work on the Music Label Manager project.

## Essential Project Context
!Read DEVELOPMENT_STATUS.md
!Read docs/README.md
!Read docs/CLAUDE.md

## Core Architecture (Essential for All Development)
!Read docs/02-architecture/system-architecture.md
!Read docs/02-architecture/database-design.md

## Development Standards
!Read docs/06-development/documentation-governance.md

## Project Health Check
!Bash git status
!Bash npm run check

Based on the essential documentation, here's your development-ready summary:

## 🎯 **Music Label Manager** - Strategic Music Industry Simulation
**Status**: See `DEVELOPMENT_STATUS.md`'s most recent session log for current status — it's the single source of truth and changes frequently; don't rely on a cached summary of it.

**Core Game**: 52-week turn-based campaign where players run a record label, managing artists, creating projects (Singles/EPs/Tours), building industry relationships, and progressing through access tiers.

## 🏗️ **Tech Stack** (For Development Context)
- **Frontend**: React 18 + TypeScript + Vite + Tailwind + Zustand + React Query
- **Backend**: Node.js + Express + PostgreSQL (Railway) + Drizzle ORM
- **Database**: Railway PostgreSQL with `pg` driver (migrated from Neon serverless)
- **Game Logic**: Unified GameEngine (shared/) with deterministic calculations
- **Content**: JSON-based (`data/` folder) - separates game content from code

## 🚨 **Critical Development Rules**
1. **Never start background processes** without explicit user permission
2. **Use static analysis tools** (Read, Glob, Grep) for code exploration
3. **Ask before starting dev server**: "Should I start the dev server?"
4. **Follow documentation governance** - check existing docs before creating new ones
5. **Implementation approach** - see root `CLAUDE.md`'s "Implementation Philosophy" section (small increments, stub-and-ship, annotate TODO/STUB/HARDCODED) before suggesting any code
6. **Focus: One feature, one layer, working iteration first**

## 🧭 If a focus area or system was named (in $ARGUMENTS or the conversation)
A system's real context is almost never in one file — it's spread across doc "types" that each live in a predictable bin by convention. Rather than relying on a hand-maintained per-topic index (which drifts stale the moment someone forgets to update it), search these five bins directly for the topic name/keywords:

1. **As-built/canonical reference** (code-verified, current) → `docs/01-planning/implementation-specs/REFERENCES AND ANALYSIS/`
2. **Original design vision** (may predate and exceed what's actually built — treat as historical intent, not present-tense truth) → per-domain `*_context/` planning folders, e.g. `docs/01-planning/exec_team_context/`
3. **Dated research/playtest/analysis notes** (session-dated; may be MORE current than either of the above) → `docs/98-research/`
4. **Deferred/future designs, not yet scheduled** → anything filename-tagged `[FUTURE]`, mostly under `implementation-specs/`
5. **Durable tracked bugs/debt** (survives across sessions) → the single `docs/09-troubleshooting/technical-debt-backlog.md` — search by topic keyword or C-number

Glob/grep these five bins for the topic before assuming you understand its current state — deferred/dead features are common in this codebase and get documented explicitly (see reference docs' "Deferred by design" sections). Also check `docs/CLAUDE.md`'s "Quick navigation" section — it may carry a hand-built shortcut for a topic that's currently hot (e.g. mid-revival, unmerged PR, active playtest), but treat those entries as temporary signposts for active work, not a pattern that needs replicating for every system — the 5-bin search above is the durable, low-maintenance path and works whether or not a shortcut exists yet.

If none of the five bins have anything, fall back to `docs/README.md`'s folder-by-folder structure before assuming nothing exists.

## 📁 **Key Information Sources**

**Immediate Development Needs:**
- **System Architecture**: `docs/02-architecture/system-architecture.md` - GameEngine, data flow
- **API contracts**: `shared/api/contracts.ts` - Zod contracts shared client/server (the prior standalone API Design doc was archived July 2026 as superseded by this + System Architecture)
- **Frontend Patterns**: `client/CLAUDE.md` - Current frontend architecture, state management, navigation (the prior `docs/04-frontend/frontend-architecture.md` was archived July 2026 as stale/superseded by this)
- **Backend Implementation**: `docs/05-backend/backend-architecture.md` - Server setup

**Content Modification:**
- **Content Editing**: `docs/06-development/content-editing-guide.md` - JSON file editing
- **Data Schemas**: `docs/02-architecture/content-data-schemas.md` - JSON structure reference

**Project Understanding:**
- **Current Status**: `DEVELOPMENT_STATUS.md` - What's complete, what's next (session-log format, read the top entries first — most recent first)
- **Active Development**: `docs/01-planning/CORE_FEATURES_sim-v2.0.md` - Current 6-month priorities
- **Completed MVP**: `docs/99-legacy/complete/development_roadmap_2025_sim-v1.0.md` - Historical MVP record
- **User Flows**: `docs/03-workflows/user-interaction-flows.md` - Player experience
- **System Flows**: `docs/03-workflows/game-system-workflows.md` - Backend processing

**Documentation Standards:**
- **Governance**: `docs/06-development/documentation-governance.md` - How we organize documentation, the doc-sync rule, and the archival mechanism for superseded docs
- **Navigation**: `docs/README.md` - Complete documentation map by folder
- **Topic routing**: `docs/CLAUDE.md` - Quick-navigation index (topic → full doc constellation)
- **Tracked debt**: `docs/09-troubleshooting/technical-debt-backlog.md` - Durable C-numbered bug/improvement ledger, survives across sessions

## 🎯 **Ready to Develop!**

I understand the project architecture, development standards, and current status.

**What would you like to work on?**
- 🔍 **Code analysis** - exploring, reviewing, or understanding existing code
- 🛠️ **Feature development** - implementing new functionality following established patterns
- 🐛 **Bug fixes** - troubleshooting and resolving issues
- 📝 **Content modifications** - editing game balance, dialogue, or artist data in JSON files
- 🏗️ **Architecture improvements** - refactoring or optimizing existing systems

**Focus area**: $ARGUMENTS
