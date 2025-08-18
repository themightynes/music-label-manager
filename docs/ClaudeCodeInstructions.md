# Claude Code Instructions - Music Label Manager

## Session Management & Background Processes

### 🚨 Critical: Port Management
**NEVER start background processes without explicit user permission**

Common mistake pattern:
```bash
# DON'T DO THIS during codebase reviews:
npm run dev --run_in_background=true
```

**Why this causes problems:**
- Leaves processes running on port 5000
- Blocks subsequent `npm run dev` attempts  
- Causes `EADDRINUSE` errors
- User has to manually kill processes

### ✅ Correct Approach for Codebase Reviews

**For analysis/planning sessions:**
1. Use static analysis tools only:
   - `Read` for examining files
   - `Glob` for finding files by pattern
   - `Grep` for searching code
   - `npm run check` for TypeScript validation

2. **Ask before starting servers:**
   - "Would you like me to start the dev server to test functionality?"
   - "This analysis can be done statically - should I start the app to verify?"

**For active development:**
1. Ask user to start their own dev server
2. If I need to start it, use foreground processes and clean up immediately
3. Always kill background processes before ending session

### 🔧 Process Management Commands

**Check for running processes:**
```bash
# Check what's using port 5000
lsof -i :5000

# Kill specific processes
pkill -f "tsx server"
pkill -f "npm run dev"
```

**Safe background process pattern (when approved):**
```bash
# Start background process
npm run dev --run_in_background=true

# Always clean up at end of session
pkill -f "tsx server"
```

### 📋 Session Types & Appropriate Tools

**1. Codebase Review/Planning:**
- ✅ Read, Glob, Grep, npm run check
- ❌ Background servers, npm run dev
- Goal: Understand code structure, create plans

**2. Active Development:**
- ✅ Edit, Write, MultiEdit  
- ✅ Foreground npm commands for testing
- Ask before starting background processes

**3. Testing/Debugging:**
- ✅ Background processes (with user permission)
- ✅ BashOutput for monitoring
- ✅ Always clean up processes at session end

### 🎯 Implementation Guidelines

**Before starting any server process:**
1. Ask user: "Should I start the dev server for testing?"
2. Explain what I'm about to do: "I'll run npm run dev in the background to test this feature"
3. If doing a review/analysis, stick to static tools

**During development:**
1. Use foreground processes when possible
2. If background needed, document the shell ID
3. Monitor with BashOutput appropriately

**End of session:**
1. Kill any background processes I started
2. Verify ports are free: `lsof -i :5000`

### 💡 User Experience Principles

**Respect user's development workflow:**
- Don't break their ability to run `npm run dev`
- Don't leave zombie processes
- Ask permission before starting servers
- Clean up after myself

**Be explicit about intent:**
- "I'm analyzing the codebase structure" (static tools only)
- "I'm testing this feature" (may need server)
- "I'm implementing this change" (active development)

### 🔍 Common Scenarios

**Scenario: User asks for "codebase review"**
- Use: Read, Glob, Grep, npm run check
- Avoid: Starting servers
- Deliverable: Analysis and plan

**Scenario: User asks to "implement feature X"**  
- Ask: "Should I start the dev server to test this?"
- Use: Edit/Write + targeted testing
- Clean up: Kill any processes at end

**Scenario: User asks to "fix this bug"**
- May need server for reproduction
- Ask permission first
- Use minimal testing approach

### 📝 Documentation Integration

This file complements:
- `ClaudeInstructions.md` - permanent guardrails
- `ClaudeProject.md` - project-specific workflow  
- `ai_instructions.md` - current development context

Focus: Claude Code specific session management and background process handling.