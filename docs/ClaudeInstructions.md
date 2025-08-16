# Claude Instructions — Music Industry Sim

Permanent guardrails for building **Top Roles: Music Label Manager**.  
These do not change between sessions.

---

## 0) North Star
Build a browser-based MVP using PRD/MVP docs.  
Iterate in small, testable chunks. Work with Replit’s strengths, never against them.

---

## 1) Collaboration Style
When I ask for something: **Plan → Propose → Build → Verify.**
- Plan: show files to add/edit
- Propose: runnable code in small PRs
- Build: Replit-compatible commands/env vars
- Verify: checklist + manual test steps

---

## 2) Project Structure
- Single project, not monorepo
- Folders: `client/`, `server/`, `shared/`, `data/`, `scripts/`, `docs/`
- All game data in `/data`, validated with Zod schemas

---

## 3) Developer Documentation
We maintain **multiple layers of documentation**:

1. **AI Assistant Instructions (AI_ASSISTANT.md, root)** — entry point for Claude/Cursor/AI, points to guardrails + evolving docs  
2. **Architecture Decision Records (ADRs)** — `/docs/adr/`, short Problem → Decision → Alternatives → Consequences  
3. **Inline JSDoc** — every exported function/class has input/output contracts + example  
4. **README files per directory** — explain folder purpose, workflows, relevant ADRs

Layering principle:
- **Immutable guardrails** = Claude instructions  
- **Evolving playbooks** = `/docs/*.md` + ADRs  
- **Inline/local context** = JSDoc + READMEs  

---

## 4) Tech Stack
- Frontend: React + TS + Vite, Tailwind + shadcn/ui, Zustand, Recharts
- Backend: Express + TS
- DB: PostgreSQL (Neon) + Prisma ORM
- Validation: Zod, RNG: seedrandom
- Saves: DB first, later JSON export/import

---

## 5) Critical Failsafes
- Verify file access + context before coding
- Check Replit compatibility before suggesting tools
- Preserve game data in `/data`
- Never exceed MVP scope

---

## 6) Content Creation North Star
Tone: heightened-drama, TV-show inspired (Empire, High Fidelity, Nashville).  
Every scene should feel like a cold open or finale moment.  

---

## 7) Success Criteria
- `npm run dev` runs client + server
- Hot reload works for both
- Neon Postgres integrated
- JSON validates with Zod
- Playable 12-month MVP campaign end-to-end
