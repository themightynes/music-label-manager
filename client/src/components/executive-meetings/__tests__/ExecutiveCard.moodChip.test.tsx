/**
 * Exec-meetings-revival PR-9 (C6/D) — ExecutiveCard mood-modifier chip render test.
 *
 * The card surfaces the active mood band as a small v2 chip when non-neutral, using
 * the SAME shared util the engine + preview route through, so the label can't drift.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExecutiveCard } from '../ExecutiveCard';
import type { Executive } from '../../../../../shared/types/gameTypes';

function exec(mood: number, role = 'cco'): Executive {
  return { id: `e-${role}`, role, level: 1, mood, loyalty: 50 } as any;
}

describe('ExecutiveCard — mood-modifier chip', () => {
  it('inspired exec (mood 95) shows an "Inspired +20%" chip', () => {
    render(<ExecutiveCard executive={exec(95)} onSelect={vi.fn()} />);
    expect(screen.getByText('Inspired +20%')).toBeInTheDocument();
  });

  it('content exec (mood 85) shows a "Content −10% costs" chip', () => {
    render(<ExecutiveCard executive={exec(85)} onSelect={vi.fn()} />);
    expect(screen.getByText('Content −10% costs')).toBeInTheDocument();
  });

  it('disgruntled exec (mood 20) shows a "Disgruntled +25% costs" chip', () => {
    render(<ExecutiveCard executive={exec(20)} onSelect={vi.fn()} />);
    expect(screen.getByText('Disgruntled +25% costs')).toBeInTheDocument();
  });

  it('neutral exec (mood 50) shows NO band chip', () => {
    render(<ExecutiveCard executive={exec(50)} onSelect={vi.fn()} />);
    expect(screen.queryByText(/Inspired|Content|Disgruntled/)).not.toBeInTheDocument();
  });

  it('CEO (no exec row) shows no band chip even at extreme mood', () => {
    render(<ExecutiveCard executive={exec(95, 'ceo')} onSelect={vi.fn()} />);
    expect(screen.queryByText(/Inspired|Content|Disgruntled/)).not.toBeInTheDocument();
  });
});
