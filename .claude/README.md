# Claude Code Configuration

This directory contains Claude Code configuration files for the Music Label Manager project.

## Available Slash Commands

### `/onboard`
**Description**: Get comprehensive project onboarding using the session onboarding document

**Usage**: 
- `/onboard` - Get complete project onboarding
- `/onboard focus-area` - Get onboarding with optional focus area

**What it does**:
1. Reads the comprehensive `CLAUDE_SESSION_ONBOARDING.md` document
2. Checks current project status from `MVP_STATUS.md`
3. Reviews technical state from `ai_instructions.md`
4. Performs project health checks (`npm run check`, `git status`)
5. Provides a session-ready summary with:
   - Project overview and current completion status (98% MVP)
   - Technical architecture details
   - Critical session rules and background process management
   - Key documentation locations
   - Role-based quick start paths
   - Current system status and what's ready to work on

**Key Features**:
- Integrates strategic planning docs with technical implementation docs
- Provides critical session rules for background process management
- Gives role-based guidance for different types of work
- Includes current completion status and next steps
- Ready-to-work orientation for any Claude Code session

**Allowed Tools**: Read, Glob, Grep, project health checks, git status

### `/update-docs`
**Description**: Update all documentation files with current project status and session summary

**Usage**:
- `/update-docs` - Update all docs with current status
- `/update-docs "session summary"` - Update docs with specific session notes

**What it does**:
1. Gathers current project status (git status, npm check, file analysis)
2. Updates MVP_STATUS.md with current completion status
3. Refreshes ai_instructions.md with technical state
4. Updates all Claude-specific documentation files
5. Synchronizes main documentation hub
6. Provides comprehensive session summary with all changes

**Allowed Tools**: Read, Write, Edit, Glob, Grep, git status, npm checks

### `/sync-docs`
**Description**: Sync all documentation with current project status for session end

**Usage**:
- `/sync-docs` - Quick documentation sync
- `/sync-docs "session notes"` - Sync with optional session notes

**What it does**:
1. Quick status check and documentation refresh
2. Updates core documentation files with current date
3. Synchronizes onboarding and handoff documents
4. Provides focused session summary
5. Prepares documentation for next session

**Allowed Tools**: Read, Write, Edit, MultiEdit, git status, npm checks

### `/session-end`
**Description**: Complete session documentation update with current status and changes

**Usage**:
- `/session-end "summary of changes made"`
- `/session-end "implemented user auth system"`

**What it does**:
1. Performs comprehensive end-of-session documentation update
2. Records session changes and current status
3. Updates all key documentation files with timestamps
4. Confirms project status and completion percentage
5. Prepares handoff documentation for next session or team
6. Provides complete session closure with next steps

**Allowed Tools**: Read, Edit, MultiEdit, git status, npm checks

---

This command ensures every Claude Code session starts with complete project context, combining both strategic vision and technical implementation details for optimal assistance.