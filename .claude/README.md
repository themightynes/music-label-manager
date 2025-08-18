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

This command ensures every Claude Code session starts with complete project context, combining both strategic vision and technical implementation details for optimal assistance.