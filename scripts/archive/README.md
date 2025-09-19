# Archived Demo Scripts

These scripts interacted with the legacy demo authentication flow and are retained for historical reference only. They are **not** compatible with the current Clerk-based auth stack.

- `fix-demo-password.ts`
- `seed-demo-user.ts`
- `test-demo-login.ts`
- `test-executive-updates.ts`
- `test-game-update.ts`
- `check-demo-user.ts`

If a future migration requires any of the original logic, port the relevant pieces to use Clerk sessions and server-issued tokens before reintroducing them to the active `scripts/` directory.
