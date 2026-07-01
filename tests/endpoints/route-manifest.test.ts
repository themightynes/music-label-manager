/**
 * Route-manifest characterization test (Phase 1, PR-1).
 *
 * The vitest suite has no HTTP-layer tests: nothing fails if a route is
 * dropped or loses its auth middleware while handlers are moved out of
 * server/routes.ts into feature routers. This test walks the Express router
 * stack after registerRoutes() and locks the full {method, path, middleware}
 * manifest in a snapshot, so every extraction PR gets "did the move change
 * the wiring?" answered by CI instead of manual smoke testing.
 *
 * It registers routes only — no HTTP requests, no queries. Express 4
 * internals (`app._router.stack`) are intentionally relied on; if an Express
 * upgrade breaks the walker, rewrite it, not the guarantee.
 */
import { describe, it, expect } from 'vitest';
import express from 'express';

// server/routes.ts transitively imports server/db.ts, which creates a
// (lazy, never-queried here) pg Pool from DATABASE_URL at import time and
// self-loads dotenv. Force the test-DB URL BEFORE the dynamic import so a
// local .env pointing at the real database never even materializes a
// production-pointed pool. dotenv does not overwrite pre-set env vars.
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/music_label_test';

interface RouteEntry {
  method: string;
  path: string;
  middleware: string[];
}

/** Recover a static mount path from an Express 4 layer regexp (no app.use
 *  in this codebase mounts with path params, so simple unescaping works). */
function mountPathFromLayer(layer: any): string {
  if (layer.regexp?.fast_slash) return '';
  const source: string | undefined = layer.regexp?.source;
  if (!source) return '';
  return source
    .replace(/^\^\\\//, '/')
    .replace(/\\\/\?\(\?=\\\/\|\$\)$/, '')
    .replace(/\\\//g, '/');
}

function collectRoutes(stack: any[], prefix = ''): RouteEntry[] {
  const entries: RouteEntry[] = [];
  for (const layer of stack) {
    if (layer.route) {
      const path = prefix + layer.route.path;
      const methods = Object.keys(layer.route.methods).filter((m) => m !== '_all');
      // Named functions in the route's handler chain (requireClerkUser,
      // requireAdmin, handleClerkWebhook, ...). Anonymous inline handlers
      // contribute nothing, which is fine — the names are what must not be
      // silently lost in a move.
      const middleware = layer.route.stack
        .map((l: any) => l.handle?.name)
        .filter((name: string) => name && name !== '<anonymous>');
      for (const method of methods) {
        entries.push({ method: method.toUpperCase(), path, middleware });
      }
    } else if (layer.name === 'router' && layer.handle?.stack) {
      entries.push(...collectRoutes(layer.handle.stack, prefix + mountPathFromLayer(layer)));
    }
  }
  return entries;
}

async function buildManifest(): Promise<RouteEntry[]> {
  const { registerRoutes } = await import('../../server/routes');
  const app = express();
  const server = await registerRoutes(app);
  server.close();
  const manifest = collectRoutes((app as any)._router.stack);
  return manifest.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}

describe('registerRoutes route manifest', () => {
  it('registers the exact set of routes and named middleware (characterization)', async () => {
    const manifest = await buildManifest();
    expect(manifest).toMatchSnapshot();
  });

  it('keeps requireAdmin on every /api/admin route', async () => {
    const manifest = await buildManifest();
    const adminRoutes = manifest.filter((r) => r.path.startsWith('/api/admin'));
    expect(adminRoutes.length).toBeGreaterThan(0);
    for (const route of adminRoutes) {
      expect(route.middleware, `${route.method} ${route.path}`).toContain('requireAdmin');
      expect(route.middleware, `${route.method} ${route.path}`).toContain('requireClerkUser');
    }
  });

  it('keeps requireClerkUser on the game-mutating core loop', async () => {
    const manifest = await buildManifest();
    const mustBeAuthed = [
      ['POST', '/api/advance-week'],
      ['POST', '/api/game'],
      ['POST', '/api/saves'],
      ['POST', '/api/saves/:saveId/restore'],
      ['POST', '/api/game/:gameId/artists'],
      ['POST', '/api/game/:gameId/projects'],
      ['POST', '/api/game/:gameId/releases/plan'],
    ] as const;
    for (const [method, path] of mustBeAuthed) {
      const entry = manifest.find((r) => r.method === method && r.path === path);
      expect(entry, `${method} ${path} missing from manifest`).toBeDefined();
      expect(entry!.middleware, `${method} ${path}`).toContain('requireClerkUser');
    }
  });
});
