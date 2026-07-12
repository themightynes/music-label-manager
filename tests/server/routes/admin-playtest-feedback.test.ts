// @vitest-environment node
/**
 * Admin playtest-feedback endpoint characterization test — versioned (round 3).
 *
 * Mirrors the admin-events-config suite (same router, same auth/db mocks).
 * The single GET/POST pair now serves THREE forms, keyed by a validated
 * formId from the fixed three-entry allowlist:
 * - GET defaults to the active (v3, 2026-07-12-delegation) form; ?formId=
 *   selects a round; unknown ids are rejected with 400.
 * - POST validates via the union schema, keys the target file off the
 *   validated responses.formId, backs up the previous file, stamps savedAt
 *   server-side, and writes pretty-printed JSON with stable key order.
 * - The round-1 and round-2 responses files are HISTORICAL RECORDS: a v3
 *   save must never touch either (proven byte-for-byte below for round 2,
 *   the more recent/likely-live one).
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
  buildEmptyPlaytestFeedbackResponsesV2,
  buildEmptyPlaytestFeedbackResponsesV3,
  PLAYTEST_FEEDBACK_FORM_ID,
  PLAYTEST_FEEDBACK_FORM_ID_V2,
  PLAYTEST_FEEDBACK_FORM_ID_V3,
  PLAYTEST_SECTION_IDS,
  PLAYTEST_KNOB_IDS,
  PLAYTEST_SECTION_IDS_V2,
  PLAYTEST_KNOB_IDS_V2,
  PLAYTEST_SECTION_IDS_V3,
  PLAYTEST_KNOB_IDS_V3,
} from '@shared/api/contracts';

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

function sampleV3Responses() {
  const responses = buildEmptyPlaytestFeedbackResponsesV3();
  responses.sections.autonomous_spend_feel = {
    exposure: ['saw_money_spent', 'saw_while_you_were_out'],
    feel: 'works',
    anythingOff: '',
    designerAnswers: [
      'Feels like the team, mostly.',
      'One surprise spend but understandable in hindsight.',
    ],
  };
  responses.knobStrength.escalation_frequency = 'about_right';
  responses.oneKnobChange = 'loyalty band thresholds, widen the committed band';
  responses.topPriorities = ['buzz hidden-at-zero still open', 'more archetype flavor', ''];
  responses.gutCheck = 'feels like a team now';
  return responses;
}

function sampleV2Responses() {
  const responses = buildEmptyPlaytestFeedbackResponsesV2();
  responses.sections.mandatory_crisis_events = {
    exposure: ['crisis_card', 'advance_blocked', 'handled_beat'],
    feel: 'sings',
    anythingOff: '',
    designerAnswers: [
      'Yes — this is the OH MY.',
      'Fair price, real tension.',
      'One in five feels right now that it costs a slot.',
    ],
  };
  responses.knobStrength.crisis_frequency = 'about_right';
  responses.oneKnobChange = 'mood swing size, up a touch';
  responses.topPriorities = ['audio audition', 'more crisis variety', ''];
  responses.gutCheck = 'round two has the drama';
  return responses;
}

function sampleV1Responses() {
  const responses = buildEmptyPlaytestFeedbackResponses();
  responses.sections.flop_penalty = {
    exposure: ['never'],
    feel: 'works',
    anythingOff: 'historical answer',
    designerAnswers: ['N/A', 'In theory yes.'],
  };
  responses.knobStrength.flop_reputation_penalty = 'too_weak';
  responses.gutCheck = 'yes, noticeably';
  return responses;
}

let app: Express;
let originalCwd: string;
let tmpDir: string;

describe('admin playtest-feedback endpoints (versioned)', () => {
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

  it('GET without formId returns the empty ACTIVE (v3) default when no file exists', async () => {
    const res = await request(app).get('/api/admin/playtest-feedback');
    expect(res.status).toBe(200);
    expect(res.body.formId).toBe(PLAYTEST_FEEDBACK_FORM_ID_V3);
    expect(res.body.savedAt).toBeNull();
    expect(Object.keys(res.body.sections)).toEqual([...PLAYTEST_SECTION_IDS_V3]);
    expect(Object.keys(res.body.knobStrength)).toEqual([...PLAYTEST_KNOB_IDS_V3]);
    expect(res.body.topPriorities).toEqual(['', '', '']);
  });

  it('GET ?formId=<v1> returns the empty round-1 default when no file exists', async () => {
    const res = await request(app).get(
      `/api/admin/playtest-feedback?formId=${PLAYTEST_FEEDBACK_FORM_ID}`
    );
    expect(res.status).toBe(200);
    expect(res.body.formId).toBe(PLAYTEST_FEEDBACK_FORM_ID);
    expect(Object.keys(res.body.sections)).toEqual([...PLAYTEST_SECTION_IDS]);
    expect(Object.keys(res.body.knobStrength)).toEqual([...PLAYTEST_KNOB_IDS]);
  });

  it('GET ?formId=<v2> returns the empty round-2 default when no file exists', async () => {
    const res = await request(app).get(
      `/api/admin/playtest-feedback?formId=${PLAYTEST_FEEDBACK_FORM_ID_V2}`
    );
    expect(res.status).toBe(200);
    expect(res.body.formId).toBe(PLAYTEST_FEEDBACK_FORM_ID_V2);
    expect(Object.keys(res.body.sections)).toEqual([...PLAYTEST_SECTION_IDS_V2]);
    expect(Object.keys(res.body.knobStrength)).toEqual([...PLAYTEST_KNOB_IDS_V2]);
  });

  it('GET with a formId outside the allowlist returns 400', async () => {
    const res = await request(app).get(
      '/api/admin/playtest-feedback?formId=playtest-feedback-2027-01-01'
    );
    expect(res.status).toBe(400);
  });

  it('POST writes the v3 file with a server-stamped savedAt and GET round-trips it', async () => {
    const responses = sampleV3Responses();

    const postRes = await request(app)
      .post('/api/admin/playtest-feedback')
      .send({ responses });

    expect(postRes.status).toBe(200);
    expect(postRes.body.success).toBe(true);
    expect(typeof postRes.body.savedAt).toBe('string');

    const writtenRaw = await fs.readFile(path.join(tmpDir, V3_RESPONSES_REL_PATH), 'utf8');
    const written = JSON.parse(writtenRaw);
    expect(written.formId).toBe(PLAYTEST_FEEDBACK_FORM_ID_V3);
    expect(written.savedAt).toBe(postRes.body.savedAt);
    expect(written.sections.autonomous_spend_feel.feel).toBe('works');
    // Pretty-printed, stable key order: top-level keys and section keys are
    // in canonical V3 order regardless of what order the client sent.
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
    expect(Object.keys(written.sections)).toEqual([...PLAYTEST_SECTION_IDS_V3]);
    expect(Object.keys(written.knobStrength)).toEqual([...PLAYTEST_KNOB_IDS_V3]);

    const getRes = await request(app).get('/api/admin/playtest-feedback');
    expect(getRes.status).toBe(200);
    expect(getRes.body.sections.autonomous_spend_feel.designerAnswers).toHaveLength(2);
    expect(getRes.body.savedAt).toBe(postRes.body.savedAt);
  });

  it('POST backs up the previous v3 responses file before overwriting', async () => {
    const first = sampleV3Responses();
    await request(app).post('/api/admin/playtest-feedback').send({ responses: first });

    const second = sampleV3Responses();
    second.gutCheck = 'revised answer';
    const res = await request(app)
      .post('/api/admin/playtest-feedback')
      .send({ responses: second });

    expect(res.status).toBe(200);
    expect(res.body.backupCreated).toBe(true);

    const backupRaw = await fs.readFile(
      `${path.join(tmpDir, V3_RESPONSES_REL_PATH)}.backup`,
      'utf8'
    );
    const backup = JSON.parse(backupRaw);
    expect(backup.gutCheck).toBe('feels like a team now');

    const currentRaw = await fs.readFile(path.join(tmpDir, V3_RESPONSES_REL_PATH), 'utf8');
    expect(JSON.parse(currentRaw).gutCheck).toBe('revised answer');
  });

  it('POST of a v3 document NEVER touches the round-1 or round-2 historical files', async () => {
    // Seed round-1 and round-2 files exactly as the owner's machine has them.
    const v1Path = path.join(tmpDir, V1_RESPONSES_REL_PATH);
    const v1HistoricalRaw = JSON.stringify(
      { ...sampleV1Responses(), savedAt: '2026-07-11T21:47:07.073Z' },
      null,
      2
    );
    await fs.writeFile(v1Path, v1HistoricalRaw, 'utf8');

    const v2Path = path.join(tmpDir, V2_RESPONSES_REL_PATH);
    const v2HistoricalRaw = JSON.stringify(
      { ...sampleV2Responses(), savedAt: '2026-07-12T10:00:00.000Z' },
      null,
      2
    );
    await fs.writeFile(v2Path, v2HistoricalRaw, 'utf8');

    const res = await request(app)
      .post('/api/admin/playtest-feedback')
      .send({ responses: sampleV3Responses() });
    expect(res.status).toBe(200);

    // Both historical files byte-identical, and no backup was created near either.
    expect(await fs.readFile(v1Path, 'utf8')).toBe(v1HistoricalRaw);
    expect(await fs.readFile(v2Path, 'utf8')).toBe(v2HistoricalRaw);
    await expect(fs.readFile(`${v1Path}.backup`, 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expect(fs.readFile(`${v2Path}.backup`, 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    });
    // And the v3 file landed in its own slot.
    await expect(fs.readFile(path.join(tmpDir, V3_RESPONSES_REL_PATH), 'utf8')).resolves.toContain(
      PLAYTEST_FEEDBACK_FORM_ID_V3
    );
  });

  it('POST of a v1 document still writes the v1 file (history stays editable) and not the v3 file', async () => {
    const res = await request(app)
      .post('/api/admin/playtest-feedback')
      .send({ responses: sampleV1Responses() });
    expect(res.status).toBe(200);

    const writtenRaw = await fs.readFile(path.join(tmpDir, V1_RESPONSES_REL_PATH), 'utf8');
    const written = JSON.parse(writtenRaw);
    expect(written.formId).toBe(PLAYTEST_FEEDBACK_FORM_ID);
    expect(Object.keys(written.sections)).toEqual([...PLAYTEST_SECTION_IDS]);

    await expect(
      fs.readFile(path.join(tmpDir, V3_RESPONSES_REL_PATH), 'utf8')
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('POST of a v2 document still writes the v2 file (history stays editable) and not the v3 file', async () => {
    const res = await request(app)
      .post('/api/admin/playtest-feedback')
      .send({ responses: sampleV2Responses() });
    expect(res.status).toBe(200);

    const writtenRaw = await fs.readFile(path.join(tmpDir, V2_RESPONSES_REL_PATH), 'utf8');
    const written = JSON.parse(writtenRaw);
    expect(written.formId).toBe(PLAYTEST_FEEDBACK_FORM_ID_V2);
    expect(Object.keys(written.sections)).toEqual([...PLAYTEST_SECTION_IDS_V2]);

    await expect(
      fs.readFile(path.join(tmpDir, V3_RESPONSES_REL_PATH), 'utf8')
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('POST with an invalid feel rating returns 400 and does not write', async () => {
    const invalid: any = sampleV3Responses();
    invalid.sections.autonomous_spend_feel.feel = 'transcendent';

    const res = await request(app)
      .post('/api/admin/playtest-feedback')
      .send({ responses: invalid });

    expect(res.status).toBe(400);
    await expect(
      fs.readFile(path.join(tmpDir, V3_RESPONSES_REL_PATH), 'utf8')
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('POST with a formId outside the allowlist returns 400 and does not write', async () => {
    const foreign: any = sampleV3Responses();
    foreign.formId = 'playtest-feedback-2027-01-01';

    const res = await request(app)
      .post('/api/admin/playtest-feedback')
      .send({ responses: foreign });

    expect(res.status).toBe(400);
    await expect(
      fs.readFile(path.join(tmpDir, V3_RESPONSES_REL_PATH), 'utf8')
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('POST without responses returns 400', async () => {
    const res = await request(app).post('/api/admin/playtest-feedback').send({});
    expect(res.status).toBe(400);
  });
});
