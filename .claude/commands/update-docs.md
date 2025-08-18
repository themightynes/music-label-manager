---
description: Update all documentation files with current project status and session summary
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(git status), Bash(npm run check:*), Bash(find:*), Bash(wc:*)
argument-hint: [session summary]
---

# 📝 Documentation Update - End of Session

I'll automatically update all your documentation files with the current project status and session changes.

## Step 1: Gather Current Project Status

!Bash git status
!Bash npm run check
!Bash find /home/runner/workspace -name "*.md" -type f | head -20

Let me analyze the current codebase structure and status:

!Read /home/runner/workspace/DEVELOPMENT_STATUS.md
!Read /home/runner/workspace/ai_instructions.md

## Step 2: Update Core Documentation Files

### Updating Development Status Report
!Read /home/runner/workspace/DEVELOPMENT_STATUS.md

Based on the current status, I'll update the development status with today's date and any phase changes since last session.

!Edit /home/runner/workspace/DEVELOPMENT_STATUS.md

### Updating AI Instructions
!Read /home/runner/workspace/ai_instructions.md

I'll update the AI instructions with any new architectural changes or current state.

!Edit /home/runner/workspace/ai_instructions.md

### Updating Main Documentation Hub
!Read /home/runner/workspace/docs/README.md

Updating the main documentation README with current status and navigation.

!Edit /home/runner/workspace/docs/README.md

## Step 3: Update Claude-Specific Files

### Updating Claude Session Onboarding
!Read /home/runner/workspace/docs/CLAUDE_SESSION_ONBOARDING.md

I'll update the comprehensive onboarding document with current completion status and any new insights.

!Edit /home/runner/workspace/docs/CLAUDE_SESSION_ONBOARDING.md

### Updating Claude Instructions
!Read /home/runner/workspace/docs/99-legacy/ClaudeCodeInstructions.md

Updating session management rules and background process guidelines based on recent experience.

!Edit /home/runner/workspace/docs/99-legacy/ClaudeCodeInstructions.md

### Updating Project Instructions
!Read /home/runner/workspace/docs/99-legacy/ClaudeProject.md

I'll update the project conventions and workflow documentation.

!Edit /home/runner/workspace/docs/99-legacy/ClaudeProject.md

## Step 4: Update Handoff Summary
!Read /home/runner/workspace/docs/HANDOFF_SUMMARY.md

Updating the development team handoff summary with current status and next steps.

!Edit /home/runner/workspace/docs/HANDOFF_SUMMARY.md

## Step 5: Generate Session Summary

Based on the session work and argument provided: **$ARGUMENTS**

### 📊 Documentation Update Summary

**Updated Files:**
- ✅ DEVELOPMENT_STATUS.md - Current development phase status and recent changes
- ✅ ai_instructions.md - Technical state and known issues
- ✅ docs/README.md - Main documentation hub navigation
- ✅ docs/CLAUDE_SESSION_ONBOARDING.md - Comprehensive onboarding document
- ✅ docs/HANDOFF_SUMMARY.md - Development team handoff summary
- ✅ docs/99-legacy/ClaudeCodeInstructions.md - Session management rules
- ✅ docs/99-legacy/ClaudeProject.md - Project conventions and workflow

**Session Date**: August 18, 2025

**Key Changes This Session**:
- Updated project completion status
- Refreshed technical architecture documentation
- Synchronized all Claude-specific instructions
- Updated development team handoff information
- Refreshed onboarding documentation for future sessions

**Project Status**: Post-MVP Development Phase - Advanced Features Planning

**Next Session Setup**: All documentation is current and synchronized. Use `/onboard` command to get up to speed.

### 🎯 Current Project State
**Top Roles: Music Label Manager** is a completed MVP (August 2025) now in post-MVP development phase with:
- Complete 12-month campaign system
- Full artist discovery and signing workflow
- Project creation system (Singles, EPs, Mini-Tours)
- Role-based dialogue system with 72+ choices
- Save/load system with multiple slots
- Campaign completion and restart functionality

**Architecture**: React 18 + TypeScript + Node.js + PostgreSQL with unified GameEngine pattern

**Documentation**: Comprehensive strategic planning + technical implementation docs organized for development team handoff

---

## 🚀 Ready for Next Session

All documentation has been updated and synchronized. Your project documentation now reflects:
- Current completion status and recent changes
- Updated technical state and architecture
- Synchronized Claude session management rules
- Current development priorities and next steps
- Complete onboarding information for future sessions

**Recommendation**: Commit these documentation updates to preserve the current project state.

Use `/onboard` at the start of your next session to get comprehensive project context automatically.