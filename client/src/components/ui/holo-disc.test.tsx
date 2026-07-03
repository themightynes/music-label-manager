/**
 * HoloDisc pulse prop (Phase 4 PR-7 — ambient feedback).
 *
 * The primitive itself owns no timers: `pulse` is a pure on/off render prop.
 * These tests only assert the halo element's presence/absence — duration and
 * caller-driven timing are exercised in CommandDock.test.tsx.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HoloDisc } from './holo-disc';

describe('HoloDisc pulse halo', () => {
  it('renders the pulse halo element when pulse=true', () => {
    render(<HoloDisc pulse />);
    expect(screen.getByTestId('holo-disc-pulse')).toBeInTheDocument();
  });

  it('does not render the pulse halo when pulse=false', () => {
    render(<HoloDisc pulse={false} />);
    expect(screen.queryByTestId('holo-disc-pulse')).not.toBeInTheDocument();
  });

  it('does not render the pulse halo by default (prop omitted)', () => {
    render(<HoloDisc />);
    expect(screen.queryByTestId('holo-disc-pulse')).not.toBeInTheDocument();
  });

  it('halo is aria-hidden (pure decoration, no a11y noise)', () => {
    render(<HoloDisc pulse />);
    expect(screen.getByTestId('holo-disc-pulse')).toHaveAttribute('aria-hidden', 'true');
  });

  it('halo uses the animate-ds-ring utility (disabled globally under prefers-reduced-motion)', () => {
    render(<HoloDisc pulse />);
    expect(screen.getByTestId('holo-disc-pulse').className).toContain('animate-ds-ring');
  });
});
