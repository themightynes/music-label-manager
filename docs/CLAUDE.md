# Music Label Manager - Documentation Guide for AI Assistants

**Quick navigation for project documentation** (Technical details in `../CLAUDE.md`)

---

## 🚀 AI-Assisted Feature Development

For structured feature development, use **ai-dev-tasks** workflow:

1. `@ai-dev-tasks/create-prd.md` - Define feature scope
2. `@ai-dev-tasks/generate-tasks.md` - Break into tasks
3. `@ai-dev-tasks/process-task-list.md` - Implement iteratively

See `@ai-dev-tasks/README.md` for full details.

---

## 🎯 Quick Reference

**Start here**: `../DEVELOPMENT_STATUS.md` + `README.md`

**I need to...**
- Understand project → `02-architecture/system-architecture.md`
- Build feature → `ai-dev-tasks/` workflow
- Edit content → `06-development/content-editing-guide.md`
- Fix bug → `09-troubleshooting/`
- Understand UX → `03-workflows/user-interaction-flows.md`
- Plan work → `01-planning/CORE_FEATURES_sim-v2.0.md`
- Understand executive meetings → constellation, not just one doc (⚠️ temporary signpost for an actively hot topic — mid-revival, unmerged PR #119, live playtest; safe to prune once merged and settled, since the generic 5-bin search recipe in `.claude/commands/onboard.md` covers this without a hand-built entry):
  - As-built canonical reference (code-verified, must stay in sync): `01-planning/implementation-specs/REFERENCES AND ANALYSIS/[REFERENCE] executive-meetings-system-complete-reference.md`
  - Original design vision (frozen historical intent, source for anything "deferred by design"): `01-planning/exec_team_context/Exec Team - Actions - COMPLETE MECHANICAL FRAMEWORK.md`
  - Active/most-recent playtest findings: `98-research/PLAYTEST_NOTES_EXEC_MEETINGS_2026-07-04.md`
  - Durable open bugs/debt: `09-troubleshooting/technical-debt-backlog.md` (search "exec meetings" / relevant C-numbers, e.g. C67–C68)
  - Related/adjacent (exec email personality, not the meetings mechanics themselves): `01-planning/implementation-specs/[FUTURE] Email Narrative Storytelling Guide.md`

---

## 📁 Folder Guide

| Folder | Purpose |
|--------|---------|
| `01-planning/` | Strategic roadmaps |
| `02-architecture/` | System design & schemas |
| `03-workflows/` | Process flows |
| `04-frontend/` | React patterns |
| `05-backend/` | Server implementation |
| `06-development/` | How-to guides |
| `ai-dev-tasks/` | AI workflow templates |
| `08-future-features-and-fixes/` | Roadmap |
| `09-troubleshooting/` | Debugging |
| `98-research/` | Dated research case files / adversarially-verified audits |
| `99-legacy/` | Archived/superseded docs (see `superseded-2026-07/`) |

**Full navigation**: See `README.md`
