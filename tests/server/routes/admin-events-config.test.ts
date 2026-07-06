// @vitest-environment node
/**
 * Admin events-config endpoint characterization test (content-editor slice 1).
 *
 * Mirrors the existing actions-config pair (server/routes/admin.ts): GET
 * reads data/events.json, POST validates via EventsConfigSchema, backs up,
 * writes, clears the gameDataLoader cache, and appends a changelog entry.
 * Exercises the real router over supertest with auth + db mocked (db is
 * imported by admin.ts for unrelated routes; this suite never queries it).
 *
 * Uses a temp fixture data/ directory (via process.chdir) so the test never
 * touches the real data/events.json or data/content-changelog.json.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/music_label_test';

vi.mock('../../../server/db', () => ({
  db: {},
  pool: {},
  testDatabaseConnection: async () => true,
}));

vi.mock('../../../server/auth', () => ({
  requireClerkUser: (req: any, _res: any, next: any) => {
    req.userId = 'test-admin-user';
    next();
  },
  requireAdmin: (_req: any, _res: any, next: any) => next(),
  handleClerkWebhook: (_req: any, res: any) => res.status(200).end(),
}));

import express, { type Express } from 'express';
import request from 'supertest';
import { gameDataLoader } from '@shared/utils/dataLoader';

const VALID_EVENTS_CONFIG = {
  version: '0.1.0',
  generated: '2025-08-14',
  events: [
    {
      id: 'sync_offer',
      role_hint: 'Sync Licensing',
      category: 'sync_licensing',
      prompt: 'A blockbuster film wants your upcoming single for a key scene.',
      choices: [
        {
          id: 'take_deal',
          label: 'Take the deal (exclusive)',
          effects_immediate: { money: 20000 },
          effects_delayed: { reputation: 1 },
        },
      ],
    },
  ],
};

let app: Express;
let originalCwd: string;
let tmpDir: string;

describe('admin events-config endpoints', () => {
  beforeAll(async () => {
    const adminRouter = (await import('../../../server/routes/admin')).default;
    app = express();
    app.use(express.json());
    app.use(adminRouter);
  });

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'admin-events-config-test-'));
    await fs.mkdir(path.join(tmpDir, 'data'), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, 'data', 'events.json'),
      JSON.stringify(VALID_EVENTS_CONFIG, null, 2),
      'utf8'
    );
    originalCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('GET returns the current events config', async () => {
    const res = await request(app).get('/api/admin/events-config');
    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(1);
    expect(res.body.events[0].id).toBe('sync_offer');
  });

  it('POST with a valid config writes the file, backs it up, and reports success', async () => {
    const updated = {
      ...VALID_EVENTS_CONFIG,
      events: [
        ...VALID_EVENTS_CONFIG.events,
        {
          id: 'new_event',
          role_hint: 'Test',
          category: 'industry_drama',
          prompt: 'Something happened.',
          choices: [
            {
              id: 'react',
              label: 'React',
              effects_immediate: {},
              effects_delayed: {},
            },
          ],
        },
      ],
    };

    const res = await request(app)
      .post('/api/admin/events-config')
      .send({ config: updated });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.backupCreated).toBe(true);

    const writtenRaw = await fs.readFile(path.join(tmpDir, 'data', 'events.json'), 'utf8');
    const written = JSON.parse(writtenRaw);
    expect(written.events).toHaveLength(2);

    const backupRaw = await fs.readFile(path.join(tmpDir, 'data', 'events.json.backup'), 'utf8');
    const backup = JSON.parse(backupRaw);
    expect(backup.events).toHaveLength(1);
  });

  it('POST with an invalid config (non-canonical category) returns 400 and does not write', async () => {
    const invalid = {
      ...VALID_EVENTS_CONFIG,
      events: [
        {
          ...VALID_EVENTS_CONFIG.events[0],
          category: 'not_a_real_category',
        },
      ],
    };

    const res = await request(app)
      .post('/api/admin/events-config')
      .send({ config: invalid });

    expect(res.status).toBe(400);

    const writtenRaw = await fs.readFile(path.join(tmpDir, 'data', 'events.json'), 'utf8');
    const written = JSON.parse(writtenRaw);
    expect(written.events[0].category).toBe('sync_licensing');
  });

  it('POST appends an id-level diff to data/content-changelog.json', async () => {
    const updated = {
      ...VALID_EVENTS_CONFIG,
      events: [
        {
          id: 'new_event',
          role_hint: 'Test',
          category: 'industry_drama',
          prompt: 'Something happened.',
          choices: [
            { id: 'react', label: 'React', effects_immediate: {}, effects_delayed: {} },
          ],
        },
      ],
    };

    await request(app).post('/api/admin/events-config').send({ config: updated });

    const changelogRaw = await fs.readFile(path.join(tmpDir, 'data', 'content-changelog.json'), 'utf8');
    const changelog = JSON.parse(changelogRaw);
    expect(changelog.entries).toHaveLength(1);
    expect(changelog.entries[0].file).toBe('events.json');
    expect(changelog.entries[0].added).toEqual(['new_event']);
    expect(changelog.entries[0].deleted).toEqual(['sync_offer']);
  });

  it('POST clears the gameDataLoader cache so a re-read picks up the save', async () => {
    const clearCacheSpy = vi.spyOn(gameDataLoader, 'clearCache');

    await request(app).post('/api/admin/events-config').send({ config: VALID_EVENTS_CONFIG });

    expect(clearCacheSpy).toHaveBeenCalled();
    clearCacheSpy.mockRestore();
  });
});
