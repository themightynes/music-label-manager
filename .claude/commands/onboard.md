---
description: Get comprehensive project onboarding for Music Label Manager development
allowed-tools: Read, Glob, Grep, Bash(npm run check:*), Bash(git status), Bash(lsof:*)
argument-hint: [optional: focus area like 'frontend', 'backend', 'content']
---

# Music Label Manager - Development Onboarding

Welcome! I'll get you oriented for development work on the Music Label Manager project.

## Essential Project Context
!Read /home/runner/workspace/DEVELOPMENT_STATUS.md
!Read /home/runner/workspace/docs/README.md

## Core Architecture (Essential for All Development)
!Read /home/runner/workspace/docs/02-architecture/system-architecture.md
!Read /home/runner/workspace/docs/02-architecture/database-design.md

## Development Standards
!Read /home/runner/workspace/docs/06-development/documentation-governance.md

## Project Health Check
!Bash git status
!Bash npm run check

Based on the essential documentation, here's your development-ready summary:

## 🎯 **Music Label Manager** - Strategic Music Industry Simulation
**Status**: MVP Complete (August 2025) - Post-MVP Enhancement Phase

**Core Game**: 12-month turn-based campaign where players run a record label, managing artists, creating projects (Singles/EPs/Tours), building industry relationships, and progressing through access tiers.

## 🏗️ **Tech Stack** (For Development Context)
- **Frontend**: React 18 + TypeScript + Vite + Tailwind + Zustand + React Query  
- **Backend**: Node.js + Express + PostgreSQL (Neon) + Drizzle ORM
- **Game Logic**: Unified GameEngine (shared/) with deterministic calculations
- **Content**: JSON-based (`data/` folder) - separates game content from code

## 🚨 **Critical Development Rules**
1. **Never start background processes** without explicit user permission
2. **Use static analysis tools** (Read, Glob, Grep) for code exploration  
3. **Ask before starting dev server**: "Should I start the dev server?"
4. **Follow documentation governance** - check existing docs before creating new ones

## 📁 **Key Information Sources**

**Immediate Development Needs:**
- **System Architecture**: `docs/02-architecture/system-architecture.md` - GameEngine, data flow
- **API Design**: `docs/02-architecture/api-design.md` - Endpoint specifications
- **Frontend Patterns**: `docs/04-frontend/frontend-architecture.md` - React component structure
- **Backend Implementation**: `docs/05-backend/backend-architecture.md` - Server setup

**Content Modification:**
- **Content Editing**: `docs/06-development/content-editing-guide.md` - JSON file editing
- **Data Schemas**: `docs/02-architecture/content-data-schemas.md` - JSON structure reference

**Project Understanding:**
- **Current Status**: `DEVELOPMENT_STATUS.md` - What's complete, what's next
- **Strategic Vision**: `docs/01-planning/development_roadmap_2025.md` - Project direction
- **User Flows**: `docs/03-workflows/user-interaction-flows.md` - Player experience
- **System Flows**: `docs/03-workflows/game-system-workflows.md` - Backend processing

**Documentation Standards:**
- **Governance**: `docs/06-development/documentation-governance.md` - How we organize documentation
- **Navigation**: `docs/README.md` - Complete documentation map

## 🎯 **Ready to Develop!**

I understand the project architecture, development standards, and current status. 

**What would you like to work on?**
- 🔍 **Code analysis** - exploring, reviewing, or understanding existing code
- 🛠️ **Feature development** - implementing new functionality following established patterns  
- 🐛 **Bug fixes** - troubleshooting and resolving issues
- 📝 **Content modifications** - editing game balance, dialogue, or artist data in JSON files
- 🏗️ **Architecture improvements** - refactoring or optimizing existing systems

**Focus area**: $ARGUMENTS