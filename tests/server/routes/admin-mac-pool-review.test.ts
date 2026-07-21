// @vitest-environment node
/**
 * Admin mac-pool-review endpoint characterization test.
 *
 * The v3 Mac pool CONTENT-REVIEW form rides the SAME
 * GET/POST /api/admin/playtest-feedback endpoint pair as the playtest rounds
 * (admin-playtest-feedback.test.ts) — the server-side formId allowlist was
 * widened by exactly one id ('v3-mac-pool-review'), persisting to its own
 * responses file (docs/01-planning/v3-mac-pool-review.responses.json).
 * Proven here:
 * - GET ?formId=v3-mac-pool-review returns the empty review default (every
 *   canonical meeting key, reading order) when no file exists.
 * - POST of a review document writes ONLY the review file — all three
 *   playtest-round files stay byte-identical (and vice versa: a v3 round
 *   save never creates the review file).
 * - Verdicts outside the closed enum and formIds outside the allowlist are
 *   rejected with 400 and nothing is written.
 *
 * Same auth/db mocks and temp-cwd fixture as the playtest suite.
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
  buildEmptyMacPoolReviewResponses,
  buildEmptyPoolReviewResponsesFor,
  buildEmptyPlaytestFeedbackResponses,
  buildEmptyPlaytestFeedbackResponsesV2,
  buildEmptyPlaytestFeedbackResponsesV3,
  MAC_POOL_REVIEW_FORM_ID,
  MAC_POOL_REVIEW_MEETING_IDS,
  POOL_REVIEW_FORM_IDS,
  POOL_REVIEW_MEETING_IDS,
  SAM_POOL_REVIEW_FORM_ID,
  ESCALATIONS_POOL_REVIEW_FORM_ID,
  PLAYTEST_FEEDBACK_FORM_ID_V3,
  type PoolReviewFormId,
} from '@shared/api/contracts';

const REVIEW_RESPONSES_REL_PATH = path.join(
  'docs',
  '01-planning',
  'v3-mac-pool-review.responses.json'
);
const V1_RESPONSES_REL_PATH = path.join(
  'docs',
  '01-planning',
  'playtest-feedback-2026-07-11.responses.json'
);
const V2_RESPONSES_REL_PATH = path.join(
  'docs',
  '01-planning',
  'playtest-feedback-2026-07-12.responses.json'
);
const V3_RESPONSES_REL_PATH = path.join(
  'docs',
  '01-planning',
  'playtest-feedback-2026-07-12-r3.responses.json'
);

function poolResponsesRelPath(formId: PoolReviewFormId): string {
  // Mirrors PLAYTEST_RESPONSES_FILENAMES: v3-<pool>-pool-review.responses.json
  return path.join('docs', '01-planning', `${formId}.responses.json`);
}

function sampleReviewResponses() {
  const responses = buildEmptyMacPoolReviewResponses();
  responses.meetings.wall_of_misses = { verdict: 'approve', notes: 'baseline holds' };
  responses.meetings.poaching_season = {
    verdict: 'approve_with_edits',
    notes: 'soften the fence cost',
  };
  responses.overallNotes = 'tier spread feels right';
  responses.voiceConsistency = 'Mac holds across all rooms';
  return responses;
}

let app: Express;
let originalCwd: string;
let tmpDir: string;

describe('admin mac-pool-review via the playtest-feedback endpoint pair', () => {
  beforeAll(async () => {
    const adminRouter = (await import('../../../server/routes/admin')).default;
    app = express();
    app.use(express.json());
    app.use(adminRouter);
  });

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'admin-mac-pool-review-test-'));
    await fs.mkdir(path.join(tmpDir, 'docs', '01-planning'), { recursive: true });
    originalCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('GET ?formId=v3-mac-pool-review returns the empty review default when no file exists', async () => {
    const res = await request(app).get(
      `/api/admin/playtest-feedback?formId=${MAC_POOL_REVIEW_FORM_ID}`
    );
    expect(res.status).toBe(200);
    expect(res.body.formId).toBe(MAC_POOL_REVIEW_FORM_ID);
    expect(res.body.savedAt).toBeNull();
    expect(Object.keys(res.body.meetings)).toEqual([...MAC_POOL_REVIEW_MEETING_IDS]);
    expect(res.body.overallNotes).toBe('');
    expect(res.body.voiceConsistency).toBe('');
  });

  it('POST writes the review file with server-stamped savedAt and GET round-trips it', async () => {
    const responses = sampleReviewResponses();

    const postRes = await request(app)
      .post('/api/admin/playtest-feedback')
      .send({ responses });

    expect(postRes.status).toBe(200);
    expect(postRes.body.success).toBe(true);
    expect(typeof postRes.body.savedAt).toBe('string');

    const writtenRaw = await fs.readFile(path.join(tmpDir, REVIEW_RESPONSES_REL_PATH), 'utf8');
    const written = JSON.parse(writtenRaw);
    expect(written.formId).toBe(MAC_POOL_REVIEW_FORM_ID);
    expect(written.savedAt).toBe(postRes.body.savedAt);
    expect(written.meetings.wall_of_misses.verdict).toBe('approve');
    // Stable key order: meetings in canonical reading order, review shape.
    expect(Object.keys(written)).toEqual([
      'formId',
      'savedAt',
      'meetings',
      'overallNotes',
      'voiceConsistency',
    ]);
    expect(Object.keys(written.meetings)).toEqual([...MAC_POOL_REVIEW_MEETING_IDS]);

    const getRes = await request(app).get(
      `/api/admin/playtest-feedback?formId=${MAC_POOL_REVIEW_FORM_ID}`
    );
    expect(getRes.status).toBe(200);
    expect(getRes.body.meetings.poaching_season.notes).toBe('soften the fence cost');
    expect(getRes.body.savedAt).toBe(postRes.body.savedAt);
  });

  it('POST backs up the previous review file before overwriting', async () => {
    await request(app)
      .post('/api/admin/playtest-feedback')
      .send({ responses: sampleReviewResponses() });

    const second = sampleReviewResponses();
    second.overallNotes = 'revised overall read';
    const res = await request(app)
      .post('/api/admin/playtest-feedback')
      .send({ responses: second });

    expect(res.status).toBe(200);
    expect(res.body.backupCreated).toBe(true);

    const backup = JSON.parse(
      await fs.readFile(`${path.join(tmpDir, REVIEW_RESPONSES_REL_PATH)}.backup`, 'utf8')
    );
    expect(backup.overallNotes).toBe('tier spread feels right');
    const current = JSON.parse(
      await fs.readFile(path.join(tmpDir, REVIEW_RESPONSES_REL_PATH), 'utf8')
    );
    expect(current.overallNotes).toBe('revised overall read');
  });

  it('POST of a review document NEVER touches any playtest-round responses file', async () => {
    // Seed all three round files exactly as the owner's machine has them.
    const v1Path = path.join(tmpDir, V1_RESPONSES_REL_PATH);
    const v1Raw = JSON.stringify(
      { ...buildEmptyPlaytestFeedbackResponses(), savedAt: '2026-07-11T21:47:07.073Z' },
      null,
      2
    );
    await fs.writeFile(v1Path, v1Raw, 'utf8');

    const v2Path = path.join(tmpDir, V2_RESPONSES_REL_PATH);
    const v2Raw = JSON.stringify(
      { ...buildEmptyPlaytestFeedbackResponsesV2(), savedAt: '2026-07-12T10:00:00.000Z' },
      null,
      2
    );
    await fs.writeFile(v2Path, v2Raw, 'utf8');

    const v3Path = path.join(tmpDir, V3_RESPONSES_REL_PATH);
    const v3Raw = JSON.stringify(
      { ...buildEmptyPlaytestFeedbackResponsesV3(), savedAt: '2026-07-12T18:00:00.000Z' },
      null,
      2
    );
    await fs.writeFile(v3Path, v3Raw, 'utf8');

    const res = await request(app)
      .post('/api/admin/playtest-feedback')
      .send({ responses: sampleReviewResponses() });
    expect(res.status).toBe(200);

    // All three round files byte-identical, no backups created near any.
    expect(await fs.readFile(v1Path, 'utf8')).toBe(v1Raw);
    expect(await fs.readFile(v2Path, 'utf8')).toBe(v2Raw);
    expect(await fs.readFile(v3Path, 'utf8')).toBe(v3Raw);
    for (const roundPath of [v1Path, v2Path, v3Path]) {
      await expect(fs.readFile(`${roundPath}.backup`, 'utf8')).rejects.toMatchObject({
        code: 'ENOENT',
      });
    }
    // And the review landed in its own slot.
    await expect(
      fs.readFile(path.join(tmpDir, REVIEW_RESPONSES_REL_PATH), 'utf8')
    ).resolves.toContain(MAC_POOL_REVIEW_FORM_ID);
  });

  it('POST of a v3 ROUND document does not create the review file (and vice versa is proven above)', async () => {
    const res = await request(app)
      .post('/api/admin/playtest-feedback')
      .send({ responses: buildEmptyPlaytestFeedbackResponsesV3() });
    expect(res.status).toBe(200);

    await expect(
      fs.readFile(path.join(tmpDir, REVIEW_RESPONSES_REL_PATH), 'utf8')
    ).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(
      fs.readFile(path.join(tmpDir, V3_RESPONSES_REL_PATH), 'utf8')
    ).resolves.toContain(PLAYTEST_FEEDBACK_FORM_ID_V3);
  });

  it('POST with an out-of-enum verdict returns 400 and does not write', async () => {
    const invalid: any = sampleReviewResponses();
    invalid.meetings.wall_of_misses.verdict = 'ship_it';

    const res = await request(app)
      .post('/api/admin/playtest-feedback')
      .send({ responses: invalid });

    expect(res.status).toBe(400);
    await expect(
      fs.readFile(path.join(tmpDir, REVIEW_RESPONSES_REL_PATH), 'utf8')
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('GET/POST with a formId outside the widened allowlist still returns 400', async () => {
    const getRes = await request(app).get(
      '/api/admin/playtest-feedback?formId=v3-nobody-pool-review'
    );
    expect(getRes.status).toBe(400);

    const foreign: any = sampleReviewResponses();
    foreign.formId = 'v3-nobody-pool-review';
    const postRes = await request(app)
      .post('/api/admin/playtest-feedback')
      .send({ responses: foreign });
    expect(postRes.status).toBe(400);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Seven-pool extension: every pool loads its own empty default and saves to
  // its own file, unreachable from every other pool's save (and from rounds).
  // ───────────────────────────────────────────────────────────────────────────

  it('GET returns each pool’s empty default with that pool’s canonical meeting keys', async () => {
    for (const formId of POOL_REVIEW_FORM_IDS) {
      const res = await request(app).get(`/api/admin/playtest-feedback?formId=${formId}`);
      expect(res.status, formId).toBe(200);
      expect(res.body.formId, formId).toBe(formId);
      expect(res.body.savedAt, formId).toBeNull();
      expect(Object.keys(res.body.meetings), formId).toEqual([
        ...POOL_REVIEW_MEETING_IDS[formId],
      ]);
    }
  });

  it('POST of one pool’s review writes ONLY that pool’s file — every other pool file stays absent', async () => {
    const sam = buildEmptyPoolReviewResponsesFor(SAM_POOL_REVIEW_FORM_ID);
    sam.meetings.the_dossier = { verdict: 'approve', notes: 'leverage reads true' };
    const res = await request(app)
      .post('/api/admin/playtest-feedback')
      .send({ responses: sam });
    expect(res.status).toBe(200);

    const samPath = path.join(tmpDir, poolResponsesRelPath(SAM_POOL_REVIEW_FORM_ID));
    const written = JSON.parse(await fs.readFile(samPath, 'utf8'));
    expect(written.formId).toBe(SAM_POOL_REVIEW_FORM_ID);
    expect(written.meetings.the_dossier.verdict).toBe('approve');
    // Stable key order: meetings in Sam's canonical reading order.
    expect(Object.keys(written.meetings)).toEqual([
      ...POOL_REVIEW_MEETING_IDS[SAM_POOL_REVIEW_FORM_ID],
    ]);

    for (const other of POOL_REVIEW_FORM_IDS) {
      if (other === SAM_POOL_REVIEW_FORM_ID) continue;
      await expect(
        fs.readFile(path.join(tmpDir, poolResponsesRelPath(other)), 'utf8')
      ).rejects.toMatchObject({ code: 'ENOENT' });
    }
  });

  it('POST of one pool’s review never touches another pool’s EXISTING file (byte-identical)', async () => {
    // Seed the mac and escalations files as if previously saved.
    const macSeedRaw = JSON.stringify(
      { ...sampleReviewResponses(), savedAt: '2026-07-12T20:00:00.000Z' },
      null,
      2
    );
    const macPath = path.join(tmpDir, REVIEW_RESPONSES_REL_PATH);
    await fs.writeFile(macPath, macSeedRaw, 'utf8');
    const escSeed = buildEmptyPoolReviewResponsesFor(ESCALATIONS_POOL_REVIEW_FORM_ID);
    const escSeedRaw = JSON.stringify({ ...escSeed, savedAt: '2026-07-12T20:05:00.000Z' }, null, 2);
    const escPath = path.join(tmpDir, poolResponsesRelPath(ESCALATIONS_POOL_REVIEW_FORM_ID));
    await fs.writeFile(escPath, escSeedRaw, 'utf8');

    const sam = buildEmptyPoolReviewResponsesFor(SAM_POOL_REVIEW_FORM_ID);
    const res = await request(app).post('/api/admin/playtest-feedback').send({ responses: sam });
    expect(res.status).toBe(200);

    expect(await fs.readFile(macPath, 'utf8')).toBe(macSeedRaw);
    expect(await fs.readFile(escPath, 'utf8')).toBe(escSeedRaw);
    for (const seeded of [macPath, escPath]) {
      await expect(fs.readFile(`${seeded}.backup`, 'utf8')).rejects.toMatchObject({
        code: 'ENOENT',
      });
    }
    // And the sam save round-trips through GET.
    const getRes = await request(app).get(
      `/api/admin/playtest-feedback?formId=${SAM_POOL_REVIEW_FORM_ID}`
    );
    expect(getRes.status).toBe(200);
    expect(getRes.body.formId).toBe(SAM_POOL_REVIEW_FORM_ID);
  });

  it('a pool save never touches the playtest-round files either', async () => {
    const v3Path = path.join(tmpDir, V3_RESPONSES_REL_PATH);
    const v3Raw = JSON.stringify(
      { ...buildEmptyPlaytestFeedbackResponsesV3(), savedAt: '2026-07-12T18:00:00.000Z' },
      null,
      2
    );
    await fs.writeFile(v3Path, v3Raw, 'utf8');

    const esc = buildEmptyPoolReviewResponsesFor(ESCALATIONS_POOL_REVIEW_FORM_ID);
    esc.meetings.escalation_cco_erased_masters = { verdict: 'rework', notes: 'too brutal?' };
    const res = await request(app).post('/api/admin/playtest-feedback').send({ responses: esc });
    expect(res.status).toBe(200);

    expect(await fs.readFile(v3Path, 'utf8')).toBe(v3Raw);
    const escWritten = JSON.parse(
      await fs.readFile(
        path.join(tmpDir, poolResponsesRelPath(ESCALATIONS_POOL_REVIEW_FORM_ID)),
        'utf8'
      )
    );
    expect(escWritten.meetings.escalation_cco_erased_masters.verdict).toBe('rework');
  });
});
