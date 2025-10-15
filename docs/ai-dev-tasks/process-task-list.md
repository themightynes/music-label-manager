# Task List Management

Guidelines for managing task lists in markdown files to track progress on completing a PRD

## Task Implementation
- **One sub-task at a time:** Do **NOT** start the next sub‑task until you ask the user for permission and they say "yes" or "y"
- **Completion protocol:**
  1. When you finish a **sub‑task**, immediately mark it as completed by changing `[ ]` to `[x]`.
  2. If **all** subtasks underneath a parent task are now `[x]`, follow this sequence:
    - **First**: Run the full test suite (`npm run test:run` for Vitest, `pytest` for Python, `bin/rails test` for Rails, etc.)
    - **Only if all tests pass**: Stage changes (`git add .`)
    - **Clean up**: Remove any temporary files and temporary code before committing
    - **Commit**: Use a descriptive commit message that:
      - Uses conventional commit format (`feat:`, `fix:`, `refactor:`, etc.)
      - Summarizes what was accomplished in the parent task
      - Lists key changes and additions
      - References the task number and PRD context
      - **Formats the message as a single-line command using `-m` flags**, e.g.:

        ```
        git commit -m "feat: add payment validation logic" -m "- Validates card type and expiry" -m "- Adds unit tests for edge cases" -m "Related to T123 in PRD"
        ```
  3. Once all the subtasks are marked completed and changes have been committed, mark the **parent task** as completed.
  4. After marking a parent task complete, **check if ALL parent tasks** in the document are now `[x]`:
    - If any parent tasks remain incomplete, proceed to the next task as normal.
    - If **all parent tasks are complete**, follow the **PRD Completion Protocol** below.
- Stop after each sub‑task and wait for the user's go‑ahead.

## PRD Completion Protocol

When **all parent tasks** in the task list are marked `[x]`, the feature implementation is complete. Follow these steps:

1. **Final Verification:**
   - Run the full test suite one final time (`npm run test:run`, `pytest`, etc.)
   - Verify all acceptance criteria from the PRD are met
   - Check that all "Relevant Files" are accurately documented

2. **Archive Completed Work:**
   - Create the archive directory if it doesn't exist: `mkdir -p tasks/completed`
   - Move the PRD and task list to the archive:
     - `git mv tasks/[n]-prd-[feature-name].md tasks/completed/`
     - `git mv tasks/tasks-[n]-prd-[feature-name].md tasks/completed/`
   - Move any related verification or testing checklists associated with this PRD (e.g., `tasks/[n]-*.md`)

3. **Final Commit:**
   - Stage the file moves: `git add .`
   - Commit with a completion message:
     ```
     git commit -m "docs: complete PRD [n] - [feature name]" -m "- All tasks completed and verified" -m "- Moved PRD and task list to completed/" -m "- Tests passing: [test count]"
     ```

4. **Report Completion:**
   - Inform the user: "🎉 All tasks for PRD [n] - [feature name] are complete! Files have been archived to `tasks/completed/`."
   - Provide a summary:
     - Total parent tasks completed
     - Total sub-tasks completed
     - Files created/modified
     - Test results

## Task List Maintenance

1. **Update the task list as you work:**
   - Mark tasks and subtasks as completed (`[x]`) per the protocol above.
   - Add new tasks as they emerge.

2. **Maintain the "Relevant Files" section:**
   - List every file created or modified.
   - Give each file a one‑line description of its purpose.

## AI Instructions

When working with task lists, the AI must:

1. Regularly update the task list file after finishing any significant work.
2. Follow the completion protocol:
   - Mark each finished **sub‑task** `[x]`.
   - Mark the **parent task** `[x]` once **all** its subtasks are `[x]`.
   - Check if **all parent tasks** are complete after marking each one.
   - If all parent tasks are complete, follow the **PRD Completion Protocol**.
3. Add newly discovered tasks.
4. Keep "Relevant Files" accurate and up to date.
5. Before starting work, check which sub‑task is next.
6. After implementing a sub‑task, update the file and then pause for user approval.