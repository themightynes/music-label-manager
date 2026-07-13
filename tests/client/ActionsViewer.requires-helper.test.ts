/**
 * Regression test (content-editor slice 2, spec §2.2b): unchecking every relevance
 * tag must OMIT the `requires` field entirely — never save `requires: []`, since the
 * schema requires nonempty-or-absent (WeeklyActionSchema: `z.array(...).nonempty().optional()`).
 */
import { describe, it, expect } from 'vitest';
import { computeRequiresFromChecked } from '@/admin/ActionsViewer';
import { RELEVANCE_TAGS, type RelevanceTag } from '@shared/types/gameTypes';

describe('computeRequiresFromChecked', () => {
  it('returns undefined when nothing is checked (never an empty array)', () => {
    const result = computeRequiresFromChecked(new Set<RelevanceTag>());
    expect(result).toBeUndefined();
  });

  it('returns the checked tags in canonical RELEVANCE_TAGS order', () => {
    const checked = new Set<RelevanceTag>(['tour_active', 'artist_signed']);
    const result = computeRequiresFromChecked(checked);
    expect(result).toEqual(['artist_signed', 'tour_active']);
  });

  it('returns all tags when all are checked', () => {
    const checked = new Set<RelevanceTag>(RELEVANCE_TAGS);
    const result = computeRequiresFromChecked(checked);
    expect(result).toEqual([...RELEVANCE_TAGS]);
  });

  // M16 (requires-gates): threshold/flag object entries have no checkbox UI —
  // toggling a tag checkbox must PRESERVE them verbatim, never drop them.
  it('preserves non-tag entries (threshold/flag objects) after the ordered tags', () => {
    const preserved = [{ stat: 'cash' as const, gte: 20000 }, { flag: 'dante_deal_taken' }];
    const result = computeRequiresFromChecked(new Set<RelevanceTag>(['artist_signed']), preserved);
    expect(result).toEqual(['artist_signed', { stat: 'cash', gte: 20000 }, { flag: 'dante_deal_taken' }]);
  });

  it('returns just the preserved objects when no tags are checked (still nonempty, schema-valid)', () => {
    const preserved = [{ flag: 'k' }];
    const result = computeRequiresFromChecked(new Set<RelevanceTag>(), preserved);
    expect(result).toEqual([{ flag: 'k' }]);
  });
});
