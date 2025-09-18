# Repository Guidelines

## Project Structure & Module Organization
- `client/`: React UI under `src/` (components, pages, store) with Vite entry `index.html`.
- `server/`: Express API, Vite middleware, Passport auth, and Drizzle persistence helpers.
- `shared/`: Drizzle schemas (`schema.ts`), cross-tier types, and utility modules.
- `data/`: Canonical game JSON; keep immutable unless schema-validated content updates are required.
- `tests/`: Feature-level TypeScript suites run directly with `tsx`.

## Build, Test, and Development Commands
- `npm run dev` – Launches client + server hot reload stack on port 5000.
- `npm run build` – Bundles the React client and emits the server to `dist/`.
- `npm run start` – Serves the bundled backend (run `build` first).
- `npm run check` – TypeScript project check; catches drift before commits.
- `npm run db:push` – Applies Drizzle migrations to the configured PostgreSQL instance.
- `npm run compile-balance` – Recomputes balance data consumed by gameplay logic.

## Coding Style & Naming Conventions
- Stick to TypeScript ES modules with two-space indentation and the existing import ordering.
- Use `camelCase` for locals, `PascalCase` for React components/classes, reserving `snake_case` for SQL columns only.
- Mark temporary logic with `TODO:`, `STUB:`, `HARDCODED:`, or `MISSING:` so later passes can grep gaps quickly.
- Favor Tailwind utility classes and `index.css` for styling; avoid ad-hoc inline styles.

## Testing Guidelines
- Run scenarios via `npx tsx tests/features/<file>`; many suites hit PostgreSQL directly.
- Set `DATABASE_URL` and `rejectUnauthorized: false` to mirror the Railway environment before executing tests.
- Remove fixtures you create inside tests to keep the shared database clean.

## Commit & Pull Request Guidelines
- Follow Conventional Commit prefixes (`feat:`, `fix:`, `refactor:`, etc.) observed in current history.
- Group related changes per commit and mention any follow-up TODO markers you introduced.
- PRs should include a brief summary, linked issue, UI captures when relevant, and evidence of `npm run check` plus targeted tests.
- Call out database or `/data` alterations explicitly for reviewer validation.

## Content & Deployment Notes
- `/data/*.json` must stay aligned with Drizzle + Zod schemas; validate locally before merging.
- Prefer port 5000 for local dev; reserve 3000/8000/8080 for temporary tooling or debugging.
