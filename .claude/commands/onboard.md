---
description: Get comprehensive project onboarding using the session onboarding document
allowed-tools: Read, Glob, Grep, Bash(npm run check:*), Bash(git status), Bash(lsof:*)
argument-hint: [optional: focus area]
---

# Music Label Manager - Project Onboarding

Welcome! I'll get you up to speed on the Music Label Manager project using our comprehensive onboarding documentation.

First, let me read the complete project onboarding document:

!Read /home/runner/workspace/docs/CLAUDE_SESSION_ONBOARDING.md

Based on the onboarding document, let me provide you with the current project status:

!Read /home/runner/workspace/MVP_STATUS.md

Let me also check the current technical state:

!Read /home/runner/workspace/ai_instructions.md

Now I'll perform a quick project health check:

!Bash npm run check
!Bash git status

Based on the comprehensive onboarding documentation I've just processed, here's your session-ready summary:

## 🎯 Project Overview
**Top Roles: Music Label Manager** is a **98% complete MVP** strategic simulation game where players run their own record label. The game features:

- **Complete 12-month campaign** with turn-based progression
- **Artist discovery and signing** with 6 unique artists
- **Project creation workflow** (Singles, EPs, Mini-Tours)
- **Role-based dialogue system** with 8 industry professionals
- **Resource management** and access tier progression
- **Save/load system** with multiple slots and JSON export

## 🏗️ Technical Architecture
- **Frontend**: React 18 + TypeScript + Vite + Tailwind + Zustand + React Query
- **Backend**: Node.js + Express + PostgreSQL (Neon) + Drizzle ORM
- **Shared**: Unified GameEngine + Zod validation + type-safe API contracts
- **Content**: JSON-based content management in `/data/` directory

## 🚨 Critical Session Rules
1. **Never start background processes** without explicit user permission
2. **Use static analysis tools** (Read, Glob, Grep) for code reviews
3. **Ask before starting dev server**: "Should I start the dev server?"
4. **Always clean up** background processes at session end

## 📁 Key Documentation Locations
- **Strategic Planning**: `docs/01-planning/` - Original vision and requirements
- **Technical Implementation**: `docs/02-07/` - Complete architecture and workflows  
- **Session Rules**: `docs/99-legacy/ClaudeCodeInstructions.md`
- **Current Status**: `MVP_STATUS.md` - Detailed completion assessment

## 🎯 Role-Based Quick Starts

**For Strategic Work**: Read planning docs → understand game vision → align decisions
**For Development**: Read setup docs → check current state → follow established patterns
**For Content**: Read content system docs → edit JSON files → validate changes

## ✅ What's Complete (98% MVP)
- ✅ Complete 12-month campaign with scoring and victory conditions
- ✅ Artist discovery, signing, and management systems
- ✅ Project creation workflow with comprehensive modals
- ✅ Role-based dialogue system with 72+ dialogue choices
- ✅ Resource management with money, reputation, and access tiers
- ✅ Save/load system with multiple slots and JSON export/import
- ✅ Campaign completion screen with restart functionality
- ✅ Professional UI with responsive design

## 🚀 Ready to Work!

I'm now fully oriented on the Music Label Manager project. The game is **98% complete** with excellent documentation and architecture. I understand both the strategic vision from the planning documents and the technical implementation details.

**What would you like to work on?** I can help with:
- Code analysis and reviews
- Feature implementation following established patterns
- Bug fixes and optimizations
- Content modifications in the JSON system
- Architecture discussions and improvements

$ARGUMENTS