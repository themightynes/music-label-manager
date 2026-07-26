/**
 * Vitest Setup — DB project.
 *
 * Layers the Docker test-database lifecycle (localhost:5433) on top of the
 * shared DB-free setup in ./setup.client.ts. Only the "db" vitest project uses
 * this file; DB-free client/unit tests use ./setup.client.ts directly and no
 * longer require the Docker container (C50).
 */

import { beforeAll, afterAll } from 'vitest';
import './setup.client';
import { setupDatabase, closeDatabaseConnection } from './helpers/test-db';

// Set up database before all tests
beforeAll(async () => {
  console.log('[Test Setup] Initializing database...');
  await setupDatabase();
  console.log('[Test Setup] Database ready!');
});

// Clean up database after all tests
afterAll(async () => {
  console.log('[Test Cleanup] Closing database connection...');
  await closeDatabaseConnection();
  console.log('[Test Cleanup] Done!');
});
