/**
 * ParticleBurst motion primitive test (Phase 4 PR-5).
 *
 * jsdom can't verify motion quality, so these assert observable states:
 * particles render on a trigger change, nothing renders under reduced motion,
 * and a burst auto-cleans after its lifetime.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

// Mock useReducedMotion so we can flip it per-test.
const mockUseReducedMotion = vi.fn(() => false);
vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof import('motion/react')>('motion/react');
  return {
    ...actual,
    useReducedMotion: () => mockUseReducedMotion(),
  };
});

import { ParticleBurst } from '@/components/motion-primitives/particle-burst';

const countParticles = (container: HTMLElement) =>
  container.querySelectorAll('circle').length;

describe('ParticleBurst', () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('renders particles when mounted with a truthy trigger', () => {
    const { container } = render(<ParticleBurst trigger={true} particleCount={20} />);
    expect(container.querySelector('[data-testid="particle-burst"]')).toBeInTheDocument();
    expect(countParticles(container)).toBe(20);
  });

  it('honors particleCount', () => {
    const { container } = render(<ParticleBurst trigger={true} particleCount={30} />);
    expect(countParticles(container)).toBe(30);
  });

  it('does not render a burst when mounted with a falsy trigger', () => {
    const { container } = render(<ParticleBurst trigger={false} particleCount={20} />);
    expect(container.querySelector('[data-testid="particle-burst"]')).not.toBeInTheDocument();
    expect(countParticles(container)).toBe(0);
  });

  it('fires a new burst when the trigger changes to a new value', () => {
    const { container, rerender } = render(
      <ParticleBurst trigger={false} particleCount={22} />
    );
    expect(countParticles(container)).toBe(0);

    rerender(<ParticleBurst trigger={true} particleCount={22} />);
    expect(countParticles(container)).toBe(22);
  });

  it('renders NOTHING under reduced motion, even with a truthy trigger', () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(<ParticleBurst trigger={true} particleCount={26} />);
    expect(container.querySelector('[data-testid="particle-burst"]')).not.toBeInTheDocument();
    expect(countParticles(container)).toBe(0);
  });

  it('auto-cleans the burst after its lifetime', () => {
    vi.useFakeTimers();
    const { container } = render(<ParticleBurst trigger={true} particleCount={20} />);
    expect(countParticles(container)).toBe(20);

    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(countParticles(container)).toBe(0);
  });
});
