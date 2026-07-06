/**
 * Content changelog helper tests (content-editor slice 1, spec §2.4 fork A3).
 *
 * diffContentById is a pure function (no fs) — tested directly for the
 * added/modified/deleted/empty-skip cases. appendContentChangelogEntry does
 * real fs work; exercised separately against a scratch file.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { diffContentById, appendContentChangelogEntry } from '../../../server/utils/contentChangelog';

describe('diffContentById', () => {
  it('detects added ids', () => {
    const result = diffContentById(
      [{ id: 'a', value: 1 }],
      [{ id: 'a', value: 1 }, { id: 'b', value: 2 }]
    );
    expect(result.added).toEqual(['b']);
    expect(result.modified).toEqual([]);
    expect(result.deleted).toEqual([]);
  });

  it('detects modified ids via deep JSON diff', () => {
    const result = diffContentById(
      [{ id: 'a', value: 1, nested: { x: 1 } }],
      [{ id: 'a', value: 1, nested: { x: 2 } }]
    );
    expect(result.added).toEqual([]);
    expect(result.modified).toEqual(['a']);
    expect(result.deleted).toEqual([]);
  });

  it('detects deleted ids', () => {
    const result = diffContentById(
      [{ id: 'a', value: 1 }, { id: 'b', value: 2 }],
      [{ id: 'a', value: 1 }]
    );
    expect(result.added).toEqual([]);
    expect(result.modified).toEqual([]);
    expect(result.deleted).toEqual(['b']);
  });

  it('returns all-empty arrays when nothing changed', () => {
    const items = [{ id: 'a', value: 1 }];
    const result = diffContentById(items, [{ id: 'a', value: 1 }]);
    expect(result.added).toEqual([]);
    expect(result.modified).toEqual([]);
    expect(result.deleted).toEqual([]);
  });

  it('handles a combination of added, modified, and deleted in one diff', () => {
    const result = diffContentById(
      [{ id: 'a', value: 1 }, { id: 'b', value: 2 }],
      [{ id: 'a', value: 999 }, { id: 'c', value: 3 }]
    );
    expect(result.added).toEqual(['c']);
    expect(result.modified).toEqual(['a']);
    expect(result.deleted).toEqual(['b']);
  });
});

describe('appendContentChangelogEntry', () => {
  let originalCwd: string;
  let tmpDir: string;

  afterEach(async () => {
    if (originalCwd) {
      process.chdir(originalCwd);
    }
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  async function withTempCwd() {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'content-changelog-test-'));
    await fs.mkdir(path.join(tmpDir, 'data'), { recursive: true });
    originalCwd = process.cwd();
    process.chdir(tmpDir);
  }

  it('creates the changelog file with entries array when missing, and appends an entry', async () => {
    await withTempCwd();
    await appendContentChangelogEntry('events.json', { added: ['x'], modified: [], deleted: [] });

    const changelogPath = path.join(tmpDir, 'data', 'content-changelog.json');
    const raw = await fs.readFile(changelogPath, 'utf8');
    const parsed = JSON.parse(raw);
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0]).toMatchObject({
      file: 'events.json',
      added: ['x'],
      modified: [],
      deleted: [],
    });
    expect(typeof parsed.entries[0].timestamp).toBe('string');
  });

  it('appends to existing entries without clobbering them', async () => {
    await withTempCwd();
    const changelogPath = path.join(tmpDir, 'data', 'content-changelog.json');
    await fs.writeFile(
      changelogPath,
      JSON.stringify({ entries: [{ timestamp: 't0', file: 'actions.json', added: [], modified: ['old'], deleted: [] }] }),
      'utf8'
    );

    await appendContentChangelogEntry('events.json', { added: [], modified: [], deleted: ['y'] });

    const parsed = JSON.parse(await fs.readFile(changelogPath, 'utf8'));
    expect(parsed.entries).toHaveLength(2);
    expect(parsed.entries[0].file).toBe('actions.json');
    expect(parsed.entries[1].file).toBe('events.json');
  });

  it('skips appending when the diff is entirely empty', async () => {
    await withTempCwd();
    await appendContentChangelogEntry('actions.json', { added: [], modified: [], deleted: [] });

    const changelogPath = path.join(tmpDir, 'data', 'content-changelog.json');
    await expect(fs.access(changelogPath)).rejects.toThrow();
  });
});
