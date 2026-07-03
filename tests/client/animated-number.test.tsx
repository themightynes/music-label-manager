/**
 * AnimatedNumber motion primitive test (Phase 4 PR-1).
 *
 * jsdom can't verify motion/spring animation quality, so these tests assert
 * observable states: the final formatted value renders, `skipAnimation` and
 * reduced-motion bypass animation entirely, value changes eventually settle
 * on the new formatted value, and no NaN ever renders across an
 * undefined-ish -> number transition.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock motion/react's useReducedMotion so we can flip it per-test, while
// keeping the real useSpring behavior (jsdom can run its rAF-driven updates).
const mockUseReducedMotion = vi.fn(() => false);
vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof import('motion/react')>('motion/react');
  return {
    ...actual,
    useReducedMotion: () => mockUseReducedMotion(),
  };
});

import { AnimatedNumber } from '@/components/motion-primitives/animated-number';

describe('AnimatedNumber', () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the formatted final value on mount (no count-up on first render)', () => {
    render(<AnimatedNumber value={1234} />);
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('uses the provided format function', () => {
    const format = (n: number) => `$${Math.round(n).toLocaleString()}`;
    render(<AnimatedNumber value={5000} format={format} />);
    expect(screen.getByText('$5,000')).toBeInTheDocument();
  });

  it('skipAnimation renders the final value immediately with no intermediate frames', () => {
    const { container } = render(<AnimatedNumber value={9999} skipAnimation />);
    expect(container.textContent).toBe('9,999');
  });

  it('reduced motion renders the final value immediately', () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(<AnimatedNumber value={42} />);
    expect(container.textContent).toBe('42');
  });

  it('eventually settles on the new formatted value after a value change', async () => {
    const { rerender } = render(<AnimatedNumber value={100} />);
    expect(screen.getByText('100')).toBeInTheDocument();

    rerender(<AnimatedNumber value={500} />);

    await waitFor(() => {
      expect(screen.getByText('500')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('settles instantly on value change when skipAnimation is true', () => {
    const { rerender, container } = render(<AnimatedNumber value={100} skipAnimation />);
    expect(container.textContent).toBe('100');

    rerender(<AnimatedNumber value={750} skipAnimation />);
    expect(container.textContent).toBe('750');
  });

  it('never renders NaN when the value is NaN/undefined-ish then becomes a number', async () => {
    const { rerender, container } = render(
      <AnimatedNumber value={Number.NaN} />
    );
    expect(container.textContent).not.toContain('NaN');
    expect(container.textContent).toBe('0');

    rerender(<AnimatedNumber value={250} />);

    await waitFor(() => {
      expect(screen.getByText('250')).toBeInTheDocument();
    });
    expect(container.textContent).not.toContain('NaN');
  });

  it('handles undefined-like (0) to number transitions without NaN, skip mode', () => {
    const { rerender, container } = render(<AnimatedNumber value={0} skipAnimation />);
    expect(container.textContent).toBe('0');

    rerender(<AnimatedNumber value={1500} skipAnimation />);
    expect(container.textContent).toBe('1,500');
    expect(container.textContent).not.toContain('NaN');
  });
});
