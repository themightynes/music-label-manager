# Music Label Manager - Claude Session Instructions

## 🚨 Replit Environment Specifics
**Critical for Replit sessions:**
- Default port: The main application runs on port 5000 for Replit's webview preview
- Port conflicts: Avoid starting servers on port 5000 if the main app is already running
- Alternative ports: Use ports like 3000, 8000, or 8080 for testing/development servers
- Server logs: Check running processes with `ps aux` or `lsof -i :5000` to see what's on port 5000

## 🎵 Content Philosophy
**Tone**: Heightened drama (Empire, Nashville, High Fidelity inspiration)  
**Every scene should feel like a TV show cold open or finale**

## 📋 Special Implementation Notes
- Must preserve `/data/` JSON files - these are the game's content source
- All JSON data must validate with Zod schemas
- Use small, incremental changes: Plan → Propose → Build → Verify

## ✅ Validation Commands
- `npm run check` - Run TypeScript compilation check
- `npm run dev` - Starts both client and server with hot reload
- `pkill -f "tsx server"` - Clean up any lingering server processes

---
*For project overview, current status, and documentation references, use the `/onboard` command*