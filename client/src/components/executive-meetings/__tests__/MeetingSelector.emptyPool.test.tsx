import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MeetingSelector } from '../MeetingSelector';
import { ExecutiveCard } from '../ExecutiveCard';
import type { Executive } from '../../../../../shared/types/gameTypes';

/**
 * Meeting-relevance Tier 0 (PR-1) — empty-pool sit-out UI.
 *
 * When the server answers `meetings: []` (empty eligible pool), the exec sits
 * out the week: the meeting panel shows a calm "nothing needs your call" state
 * and the exec card is not selectable into a focus slot.
 */

describe('MeetingSelector — empty eligible pool (sit-out)', () => {
  it('renders the calm sit-out state instead of a carousel', () => {
    const onBack = vi.fn();
    render(
      <MeetingSelector
        meetings={[]}
        signedArtists={[]}
        onSelectMeeting={vi.fn()}
        onBack={onBack}
      />
    );

    expect(screen.getByTestId('meeting-pool-empty')).toBeInTheDocument();
    expect(screen.getByText('Nothing needs your call this week')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /back to executives/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('ExecutiveCard — sitOut prop', () => {
  const executive: Executive = {
    id: 'exec-1',
    role: 'head_distribution',
    level: 1,
    mood: 50,
    loyalty: 50,
  };

  it('shows the sit-out notice and blocks selection', () => {
    const onSelect = vi.fn();
    render(<ExecutiveCard executive={executive} sitOut onSelect={onSelect} />);

    expect(screen.getByTestId('sit-out-head_distribution')).toBeInTheDocument();

    // Console redesign: the whole channel strip is the click target.
    fireEvent.click(screen.getByTestId('exec-strip-head_distribution'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('without sitOut the card stays selectable', () => {
    const onSelect = vi.fn();
    render(<ExecutiveCard executive={executive} onSelect={onSelect} />);

    expect(screen.queryByTestId('sit-out-head_distribution')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('exec-strip-head_distribution'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
