---
description: Complete session documentation update with current status and changes
allowed-tools: Read, Edit, MultiEdit, Bash(git status:*), Bash(git log:*), Bash(date:*), Bash(npm run check:*)
argument-hint: [short summary of what was done this session]
---

# 🎯 Session End — Documentation Sync

Capturing this session's work so the next session can resume cleanly.

## 1. Snapshot current state
!Bash date "+Session End: %Y-%m-%d %H:%M"
!Bash git status
!Bash git log --oneline -8

## 2. Session summary (from the user)
**Changes this session**: $ARGUMENTS

## 3. Update the running log — `DEVELOPMENT_STATUS.md`
This is the project's single source of truth for current progress. Read it, then update it:
!Read DEVELOPMENT_STATUS.md

Do the following edits:
- Update the `*Updated: <date>*` line near the top to **today's date** (from step 1).
- Add a new dated entry at the top of the status body (just under the header/`---`) titled `## 📅 Session Log — <today's date>` summarizing `$ARGUMENTS`: what changed, any branches/PRs opened, decisions made, and **explicit next steps / open threads** so the next session knows where to pick up.
- If a priority or phase changed, reflect it in the relevant existing section.

## 4. Update AI onboarding context — `ai_instructions.md`
!Read ai_instructions.md

If it has a "Current State" (or similar) section, refresh its date and any status that changed this session. If nothing material changed, leave it.

## 5. Reconcile feature tasks — `tasks/`
!Bash git status
If this session advanced a feature tracked in `tasks/`, check off completed sub-tasks in the relevant `tasks-*.md`, and move any finished PRD + task list into `tasks/completed/`. Skip if no tracked feature progressed.

## 6. Optional: validate before handoff
Offer to run `npm run check` so the next session doesn't start on a red build. Only run if the user agrees.

## 7. Wrap up
- Summarize exactly which files were updated.
- Remind the user these doc updates should be committed (prefer a branch, e.g. `docs/session-<date>`), and offer to do it.
- Confirm: next session should start with `/onboard`.

---
*This command keeps `DEVELOPMENT_STATUS.md` current as the cross-session handoff. Paths are repo-relative so it works on any machine.*
