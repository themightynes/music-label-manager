import { describe, it, expect } from 'vitest';
import { formatWhyNow } from '../../client/src/utils/reactiveContextCopy';

/**
 * Tier 2 (PR-2) — "why now" copy formatter unit tests.
 *
 * Shared by MeetingSelector + AutoSelectReviewPanel (see their respective
 * tests for render-site coverage). This suite pins the exact copy per
 * trigger, including the name-absent fallback branch (server-side name
 * resolution can miss — the line must still read naturally).
 */
describe('formatWhyNow', () => {
  it('chart_debut with songTitle', () => {
    expect(formatWhyNow({ trigger: 'chart_debut', songTitle: 'Neon Nights' })).toBe(
      'Because "Neon Nights" hit the charts last week'
    );
  });

  it('chart_debut without songTitle falls back to generic phrasing', () => {
    expect(formatWhyNow({ trigger: 'chart_debut' })).toBe(
      'Because a song hit the charts last week'
    );
  });

  it('mood_crater with artistName', () => {
    expect(formatWhyNow({ trigger: 'mood_crater', artistName: 'Aurora' })).toBe(
      'Because Aurora is in crisis'
    );
  });

  it('mood_crater without artistName falls back to generic phrasing', () => {
    expect(formatWhyNow({ trigger: 'mood_crater' })).toBe('Because an artist is in crisis');
  });

  it('recent_signing with artistName', () => {
    expect(formatWhyNow({ trigger: 'recent_signing', artistName: 'Jaxon' })).toBe(
      'Because Jaxon signed last week'
    );
  });

  it('recent_signing without artistName falls back to generic phrasing', () => {
    expect(formatWhyNow({ trigger: 'recent_signing' })).toBe(
      'Because a new artist signed last week'
    );
  });

  it('release_out with artistName', () => {
    expect(formatWhyNow({ trigger: 'release_out', artistName: 'Aurora' })).toBe(
      "Because Aurora's release went out last week"
    );
  });

  it('release_out without artistName falls back to generic phrasing', () => {
    expect(formatWhyNow({ trigger: 'release_out' })).toBe(
      'Because a release went out last week'
    );
  });
});
