# Warp Project Context (warp.md)

This file guides Warp AI to work effectively in this repository. It documents your environment, safety rules, and project conventions so tasks can be executed consistently and safely.


## Quick facts
- Project: music-label-manager
- Root: C:\Users\ulyan\music-label-manager
- OS: Windows
- Shell: PowerShell (pwsh 5.1.26100.6725)
- VCS: git (assumed)


## Project rules and domain context
- Authentication: Clerk. Admin access is assigned by setting role "admin" in the user's private metadata on the server side.


## How Warp AI should operate in this repo

1) Determine intent
- Question: Provide concise instructions or explanations. Do not run commands.
- Task: Perform the work. Prefer running the right command directly for simple tasks.

2) Safety and scope
- Never assist with malicious or harmful actions.
- Prefer safe, non-destructive commands. Confirm before doing anything risky or irreversible.
- Never reveal or handle plaintext secrets. If a secret appears as ****** or similar, acknowledge it is redacted and use placeholders like {{FOO_API_KEY}}.

3) Commands and shell specifics
- Use pwsh-compatible syntax.
- Avoid interactive/fullscreen commands (no pagers, shells, REPLs, or TUI modes).
- For git and other CLIs that page by default, disable paging (e.g., git --no-pager log).
- Prefer absolute paths to avoid changing directories. Only cd when explicitly requested or clearly beneficial.

4) Editing files
- For non-trivial code or text changes, make precise edits rather than vague instructions.
- Understand a file’s context before editing. Update upstream/downstream dependencies as needed.
- Respect existing patterns and conventions already used in this repo.

5) Version control etiquette
- Do not assume the user wants to commit/push unless asked.
- When asked to review “recent changes,” inspect the VCS state (without paging) and summarize.
- Use clear, conventional commit messages when requested to commit.

6) Code block formatting (for AI responses)
- Real file excerpts should indicate absolute path and starting line number.
- Hypothetical examples should mark path and start as null.


## Directory, path, and file conventions
- Path formatting:
  - Same directory: relative filename (e.g., main.go)
  - Subdirectory: relative path (e.g., src/components/Button.tsx)
  - Parent: ../path/to/file
  - Outside project tree or system files: absolute path (e.g., C:\\Windows\\System32\\drivers\\etc\\hosts)


## Secrets and environment
- Never print or log secrets. Use environment variables for all secrets.
- Example pattern (PowerShell):
  - $env:API_KEY = (Get-Content -Raw .\.secrets\api_key.txt)
  - Use $env:API_KEY in commands without echoing it.
- If a command needs a secret and it appears redacted in the prompt, replace with {{SECRET_NAME}} and instruct the user to provide it securely.


## Git usage (non-paginated examples)
- Show status: git --no-pager status
- Recent commits: git --no-pager log --oneline -n 20
- Diff working tree: git --no-pager diff
- Diff staged: git --no-pager diff --cached
- Show a file at HEAD: git --no-pager show HEAD:./path/to/file


## Common tasks (templates)
- Install dependencies: [fill in per stack]
- Start dev server: [fill in per stack]
- Run tests: [fill in per test framework]
- Lint/format: [fill in tooling]

Update these once the stack is confirmed (e.g., Node/PNPM, Python/Poetry, Go, etc.).


## Safety checklist before running commands
- Will the command modify or delete files/data? If yes, confirm intent.
- Is the command interactive or paginated? If yes, add flags to avoid it.
- Are there secrets in arguments? If yes, use env vars and avoid printing.
- Is the working directory correct? Prefer absolute paths.


## Troubleshooting
- Windows/Pwsh quirks:
  - Use backticks ` for line continuations in PowerShell or wrap in @""@ here-strings; avoid Unix-specific shells unless WSL is explicitly requested.
  - Some tools require quotes around paths with spaces: "C:\\Users\\ulyan\\music-label-manager".
- Git showing partial output: ensure --no-pager is used.


## Suggested repository sections (expand as the project evolves)
- Architecture overview: [to be added]
- Data model and entities: [to be added]
- Service boundaries and integrations (e.g., Clerk): [to be added]
- Build and release process: [to be added]
- Testing strategy and coverage goals: [to be added]


## Examples and snippets
- Non-paginated git diff of a subpath:
  - git --no-pager diff -- ./src
- PowerShell setting env var for a one-off command:
  - $env:NODE_ENV = "production"; npm run build


## AI behavior recap (short)
- If the user asks “how to,” explain, don’t execute.
- If the user requests an action, do it safely and directly unless complex.
- For complex tasks, clarify only critical unknowns and then proceed.
- Keep edits precise and consistent with project conventions.
- Never expose secrets. Use placeholders and env vars.


---
Maintainers: Update this file as the stack and workflows solidify so Warp AI can assist more effectively.
