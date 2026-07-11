/**
 * Hype-board UX Task 1 — banked-hype attach preview on the release planning
 * page (BankedHypeAttachPreview).
 *
 * The preview shows, BEFORE the confirm button, which pool(s) will drain onto
 * the release at plan time (selected artist's pool + entire label pool —
 * display mirror of the server attach rule; the server's hypeApplied stays
 * authoritative). Fork E: qualitative strength band, point values allowed,
 * NO multiplier numbers.
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { BankedHypeAttachPreview } from '@/components/BankedHypeAttachPreview';

afterEach(() => cleanup());

const flags = {
  pendingAwarenessBoost: 2,
  pendingAwarenessBoostWeek: 5,
  hypeArtistPools: {
    a1: { amount: 4, week: 6 },
    a2: { amount: 3, week: 7 },
  },
};
const names = { a1: 'Nova Sterling', a2: 'Mars Vega' };

describe('BankedHypeAttachPreview', () => {
  it('lists the converting pools by name with point values and a strength headline', () => {
    render(<BankedHypeAttachPreview flags={flags} artistId="a1" artistNameById={names} />);
    const panel = screen.getByTestId('banked-hype-attach-preview');
    const pools = screen.getAllByTestId('attach-preview-pool');
    expect(pools).toHaveLength(2);
    expect(panel).toHaveTextContent('Label pool');
    expect(panel).toHaveTextContent('+2 Hype');
    expect(panel).toHaveTextContent("Nova Sterling's pool");
    expect(panel).toHaveTextContent('+4 Hype');
    // 2 + 4 = 6 → strong band; qualitative headline, converts-at-plan wording.
    expect(screen.getByTestId('attach-preview-headline')).toHaveTextContent(
      "Banked buzz: strong — converts into this release's launch."
    );
  });

  it("does NOT list another artist's pool (it stays banked)", () => {
    render(<BankedHypeAttachPreview flags={flags} artistId="a1" artistNameById={names} />);
    expect(screen.getByTestId('banked-hype-attach-preview')).not.toHaveTextContent('Mars Vega');
  });

  it('renders nothing when no pool would attach', () => {
    render(<BankedHypeAttachPreview flags={{}} artistId="a1" artistNameById={names} />);
    expect(screen.queryByTestId('banked-hype-attach-preview')).toBeNull();
  });

  it('renders nothing before an artist is selected', () => {
    render(<BankedHypeAttachPreview flags={flags} artistId={null} artistNameById={names} />);
    expect(screen.queryByTestId('banked-hype-attach-preview')).toBeNull();
  });

  it('marks a net-negative attachment as suppression (honesty, not a perk)', () => {
    render(
      <BankedHypeAttachPreview
        flags={{ hypeArtistPools: { a2: { amount: -3, week: 4 } } }}
        artistId="a2"
        artistNameById={names}
      />
    );
    expect(screen.getByTestId('attach-preview-headline')).toHaveTextContent('suppressed');
    expect(screen.getByTestId('banked-hype-attach-preview')).toHaveTextContent('-3 Hype');
  });

  it('never leaks a multiplier number (fork E: qualitative only)', () => {
    render(<BankedHypeAttachPreview flags={flags} artistId="a1" artistNameById={names} />);
    expect(screen.getByTestId('banked-hype-attach-preview').textContent).not.toMatch(/[×x]\s*\d/);
  });
});
