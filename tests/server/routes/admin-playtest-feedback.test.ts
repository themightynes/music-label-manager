// @vitest-environment node
/**
 * Admin playtest-feedback endpoint characterization test.
 *
 * Mirrors the admin-events-config suite (same router, same auth/db mocks):
 * GET returns the saved responses file or the canonical empty default when
 * none exists; POST validates via PlaytestFeedbackResponsesSchema, backs up
 * the previous file, stamps savedAt server-side, and writes pretty-printed
 * JSON with stable key order to
 * docs/01-planning/playtest-feedback-2026-07-11.responses.json.
 *
 * Uses a temp fixture docs/01-planning directory (via process.chdir) so the
 * test never touches the real planning docs.
 */
import { describe, it, expect, beforeAll, afterEach, beforeEach, vi } from 'vitest';
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
import {
  buildEmptyPlaytestFeedbackResponses,
  PLAYTEST_SECTION_IDS,
  PLAYTEST_KNOB_IDS,
} from '@shared/api/contracts';

const RESPONSES_REL_PATH = path.join(
  'docs',
  '01-planning',
  'playtest-feedback-2026-07-11.responses.json'
);

function sampleResponses() {
  const responses = buildEmptyPlaytestFeedbackResponses();
  responses.sections.flop_penalty = {
    exposure: ['natural'],
    feel: 'works',
    anythingOff: 'took a while to find in the Achievements card',
    designerAnswers: ['Connected it to the flop immediately.', 'Yes, it enters the decision now.'],
  };
  responses.knobStrength.flop_reputation_penalty = 'about_right';
  responses.oneKnobChange = 'side-event frequency, up a notch';
  responses.topPriorities = ['make breakthroughs louder', 'tour energy drain', ''];
  responses.gutCheck = 'yes, noticeably';
  return responses;
}

let app: Express;
let originalCwd: string;
let tmpDir: string;

describe('admin playtest-feedback endpoints', () => {
  beforeAll(async () => {
    const adminRouter = (await import('../../../server/routes/admin')).default;
    app = express();
    app.use(express.json());
    app.use(adminRouter);
  });

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'admin-playtest-feedback-test-'));
    await fs.mkdir(path.join(tmpDir, 'docs', '01-planning'), { recursive: true });
    originalCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('GET returns the empty default when no responses file exists', async () => {
    const res = await request(app).get('/api/admin/playtest-feedback');
    expect(res.status).toBe(200);
    expect(res.body.formId).toBe('playtest-feedback-2026-07-11');
    expect(res.body.savedAt).toBeNull();
    expect(Object.keys(res.body.sections)).toEqual([...PLAYTEST_SECTION_IDS]);
    expect(Object.keys(res.body.knobStrength)).toEqual([...PLAYTEST_KNOB_IDS]);
    expect(res.body.topPriorities).toEqual(['', '', '']);
  });

  it('POST writes the file with a server-stamped savedAt and GET round-trips it', async () => {
    const responses = sampleResponses();

    const postRes = await request(app)
      .post('/api/admin/playtest-feedback')
      .send({ responses });

    expect(postRes.status).toBe(200);
    expect(postRes.body.success).toBe(true);
    expect(typeof postRes.body.savedAt).toBe('string');

    const writtenRaw = await fs.readFile(path.join(tmpDir, RESPONSES_REL_PATH), 'utf8');
    const written = JSON.parse(writtenRaw);
    expect(written.savedAt).toBe(postRes.body.savedAt);
    expect(written.sections.flop_penalty.feel).toBe('works');
    // Pretty-printed, stable key order: top-level keys and section keys are
    // in canonical order regardless of what order the client sent.
    expect(writtenRaw).toContain('\n  "formId"');
    expect(Object.keys(written)).toEqual([
      'formId',
      'savedAt',
      'sections',
      'knobStrength',
      'oneKnobChange',
      'topPriorities',
      'pullBack',
      'gutCheck',
    ]);
    expect(Object.keys(written.sections)).toEqual([...PLAYTEST_SECTION_IDS]);
    expect(Object.keys(written.knobStrength)).toEqual([...PLAYTEST_KNOB_IDS]);

    const getRes = await request(app).get('/api/admin/playtest-feedback');
    expect(getRes.status).toBe(200);
    expect(getRes.body.sections.flop_penalty.designerAnswers).toHaveLength(2);
    expect(getRes.body.savedAt).toBe(postRes.body.savedAt);
  });

  it('POST backs up the previous responses file before overwriting', async () => {
    const first = sampleResponses();
    await request(app).post('/api/admin/playtest-feedback').send({ responses: first });

    const second = sampleResponses();
    second.gutCheck = 'revised answer';
    const res = await request(app)
      .post('/api/admin/playtest-feedback')
      .send({ responses: second });

    expect(res.status).toBe(200);
    expect(res.body.backupCreated).toBe(true);

    const backupRaw = await fs.readFile(`${path.join(tmpDir, RESPONSES_REL_PATH)}.backup`, 'utf8');
    const backup = JSON.parse(backupRaw);
    expect(backup.gutCheck).toBe('yes, noticeably');

    const currentRaw = await fs.readFile(path.join(tmpDir, RESPONSES_REL_PATH), 'utf8');
    expect(JSON.parse(currentRaw).gutCheck).toBe('revised answer');
  });

  it('POST with an invalid feel rating returns 400 and does not write', async () => {
    const invalid: any = sampleResponses();
    invalid.sections.flop_penalty.feel = 'transcendent';

    const res = await request(app)
      .post('/api/admin/playtest-feedback')
      .send({ responses: invalid });

    expect(res.status).toBe(400);
    await expect(fs.readFile(path.join(tmpDir, RESPONSES_REL_PATH), 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('POST without responses returns 400', async () => {
    const res = await request(app).post('/api/admin/playtest-feedback').send({});
    expect(res.status).toBe(400);
  });
});
