import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Two vitest projects (C50):
 *  - "client": DB-free tests (happy-dom + jest-dom setup only) — runs WITHOUT
 *    the Docker test database. Folder membership is evidence-driven: every
 *    include below was grepped for test-db/createTestDatabase/server-db imports
 *    and found clean (tests/server is mixed, so it is split by subfolder).
 *  - "db": tests that hit the Docker Postgres on localhost:5433 — keeps the
 *    original ./tests/setup.ts with setupDatabase()/closeDatabaseConnection().
 * `vitest run` executes both projects, so `npm run test:run` / CI semantics are
 * unchanged. Root options (environment, pool, aliases) are inherited via
 * `extends: true`.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Run tests sequentially to avoid database concurrency issues
    // Database integration tests can have race conditions when run in parallel
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.config.{ts,js}',
        '**/types/**',
      ],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'client',
          setupFiles: ['./tests/setup.client.ts'],
          include: [
            'tests/client/**/*.{test,spec}.{ts,tsx}',
            'tests/unit/**/*.{test,spec}.{ts,tsx}',
            'tests/shared/**/*.{test,spec}.{ts,tsx}',
            'tests/utils/**/*.{test,spec}.{ts,tsx}',
            'tests/server/utils/**/*.{test,spec}.{ts,tsx}',
            'client/**/*.{test,spec}.{ts,tsx}',
          ],
          exclude: ['**/node_modules/**', '**/dist/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'db',
          setupFiles: ['./tests/setup.ts'],
          include: [
            'tests/engine/**/*.{test,spec}.{ts,tsx}',
            'tests/features/**/*.{test,spec}.{ts,tsx}',
            'tests/endpoints/**/*.{test,spec}.{ts,tsx}',
            'tests/task-0001/**/*.{test,spec}.{ts,tsx}',
            'tests/server/routes/**/*.{test,spec}.{ts,tsx}',
          ],
          exclude: ['**/node_modules/**', '**/dist/**'],
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client', 'src'),
      '@shared': path.resolve(__dirname, 'shared'),
      '@assets': path.resolve(__dirname, 'attached_assets'),
    },
  },
});
