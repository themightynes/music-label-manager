/**
 * gameState-ownership grep gate (Phase 3.5 PR-7).
 *
 * Acceptance criterion #1 of the phase plan: "gameState exists in exactly one
 * canonical place: the query cache at ['gameState:record', gameId]. Zustand
 * holds no spine object (only gameId + session state). Grep finds no
 * state.gameState selector outside useGameState.ts/gameStore.ts internals."
 *
 * Since PR-6, `useGameStore`'s `gameState` field is a MINIMAL SESSION POINTER
 * (`{ id } | null`), not the spine. Reading it as `useGameStore((s) =>
 * s.gameState)` (or destructuring further into spine fields) from anywhere
 * other than the sanctioned files below is either dead weight (getting just
 * `{ id }`) or a bug waiting to happen if the pointer shape ever changes. The
 * façade (`useGameState()` / `useGameId()` in hooks/useGameState.ts) is the
 * only sanctioned read path for app code.
 *
 * This test greps client/src for the `useGameStore(...s.gameState` selector
 * pattern (in its common forms) and fails if it appears outside the
 * sanctioned files. It is intentionally a plain filesystem grep (not an ESLint
 * rule) to match the plan's "grep-gate" phrasing and keep it dependency-free.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const CLIENT_SRC = join(__dirname, '..', '..', 'client', 'src');

// Files allowed to select `gameState` off the raw Zustand store: the store
// itself (internal writes/reads) and the façade hook (the id-pointer bootstrap
// + the one-line back-compat re-export of the old selector shape).
const SANCTIONED_RELATIVE_PATHS = new Set([
  join('store', 'gameStore.ts'),
  join('hooks', 'useGameState.ts'),
]);

// Matches useGameStore((s) => s.gameState ...), useGameStore((state) =>
// state.gameState ...), useGameStore(s => s.gameState ...), and the no-parens
// arrow form, catching the common call-site spellings used across the repo.
const SELECTOR_PATTERN =
  /useGameStore\(\s*\(?\s*(\w+)\s*\)?\s*=>\s*\1\.gameState\b/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '__tests__') continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('gameState ownership grep gate', () => {
  it('no useGameStore((s) => s.gameState...) selector outside sanctioned files', () => {
    const offenders: { file: string; line: number; text: string }[] = [];

    for (const file of walk(CLIENT_SRC)) {
      const rel = relative(CLIENT_SRC, file);
      if (SANCTIONED_RELATIVE_PATHS.has(rel)) continue;

      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, idx) => {
        if (SELECTOR_PATTERN.test(line)) {
          offenders.push({ file: rel, line: idx + 1, text: line.trim() });
        }
      });
    }

    if (offenders.length > 0) {
      const details = offenders
        .map((o) => `  ${o.file}:${o.line}  ${o.text}`)
        .join('\n');
      throw new Error(
        `Found gameState spine selector(s) reading useGameStore directly. ` +
          `Since Phase 3.5 PR-6, useGameStore's "gameState" field is a minimal ` +
          `{ id } session pointer, not the spine record — use useGameState()/` +
          `useGameId() from '@/hooks/useGameState' instead:\n${details}`,
      );
    }
  });
});
