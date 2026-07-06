import { promises as fs } from 'fs';
import path from 'path';

/**
 * Content changelog writer (content-editor slice 1, spec §2.4 fork A3).
 *
 * The admin Content Editor lets a non-dev copywriter edit data/actions.json
 * and data/events.json without touching docs. To satisfy the doc-sync rule
 * (root CLAUDE.md "Documentation Maintenance" — actions.json content changes
 * must update the [REFERENCE] exec-meetings doc) without requiring the
 * copywriter to do that themselves, both admin POST handlers append a
 * machine-readable diff entry to data/content-changelog.json on every
 * successful save. A later dev docs pass consumes these entries to sync the
 * [REFERENCE] doc and prunes consumed entries.
 */

export interface ContentChangelogEntry {
  timestamp: string;
  file: 'actions.json' | 'events.json';
  added: string[];
  modified: string[];
  deleted: string[];
}

interface ContentChangelogFile {
  entries: ContentChangelogEntry[];
}

/**
 * Pure id-level diff between two lists of content items (e.g. weekly_actions
 * or events), keyed by `id`. No fs access — unit-testable in isolation.
 */
export function diffContentById(
  oldItems: Array<{ id: string; [key: string]: unknown }>,
  newItems: Array<{ id: string; [key: string]: unknown }>
): { added: string[]; modified: string[]; deleted: string[] } {
  const oldById = new Map(oldItems.map((item) => [item.id, item]));
  const newById = new Map(newItems.map((item) => [item.id, item]));

  const added: string[] = [];
  const modified: string[] = [];
  const deleted: string[] = [];

  for (const [id, newItem] of Array.from(newById)) {
    const oldItem = oldById.get(id);
    if (!oldItem) {
      added.push(id);
    } else if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
      modified.push(id);
    }
  }

  for (const id of Array.from(oldById.keys())) {
    if (!newById.has(id)) {
      deleted.push(id);
    }
  }

  return { added, modified, deleted };
}

/**
 * Appends a changelog entry to data/content-changelog.json (creating the
 * file with `{ entries: [] }` if missing). Skips appending when the diff is
 * entirely empty. Failures are swallowed (warn-only), mirroring the backup
 * write's failure handling in the admin routes — a changelog write must
 * never fail the underlying content save.
 */
export async function appendContentChangelogEntry(
  file: ContentChangelogEntry['file'],
  diff: { added: string[]; modified: string[]; deleted: string[] }
): Promise<void> {
  if (diff.added.length === 0 && diff.modified.length === 0 && diff.deleted.length === 0) {
    return;
  }

  const changelogPath = path.join(process.cwd(), 'data', 'content-changelog.json');

  try {
    let changelog: ContentChangelogFile;
    try {
      const existing = await fs.readFile(changelogPath, 'utf8');
      changelog = JSON.parse(existing);
      if (!Array.isArray(changelog.entries)) {
        changelog = { entries: [] };
      }
    } catch {
      changelog = { entries: [] };
    }

    changelog.entries.push({
      timestamp: new Date().toISOString(),
      file,
      added: diff.added,
      modified: diff.modified,
      deleted: diff.deleted,
    });

    await fs.writeFile(changelogPath, JSON.stringify(changelog, null, 2), 'utf8');
  } catch (error) {
    console.warn('Failed to write content changelog, continuing:', error);
  }
}
