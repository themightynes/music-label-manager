'use client';
import React, { useEffect, useRef, useState } from 'react';
import {
  useReducedMotion,
  useSpring,
  type SpringOptions,
} from 'motion/react';

export type AnimatedNumberProps = {
  /** The target numeric value to display. */
  value: number;
  /** Formats the (possibly fractional, mid-animation) number for display. Defaults to a plain integer via toLocaleString. */
  format?: (n: number) => string;
  /** Spring configuration passed to motion's useSpring. */
  spring?: SpringOptions;
  /** When true, renders the final formatted value with no animation. */
  skipAnimation?: boolean;
  className?: string;
};

const defaultFormat = (n: number) => Math.round(n).toLocaleString();

const defaultSpring: SpringOptions = {
  stiffness: 120,
  damping: 20,
  mass: 1,
};

/**
 * Count-up/count-down number display. On first mount it renders the final
 * value statically (no animation) so page load never triggers a count-up.
 * On subsequent value changes it animates from the previous value to the
 * new one via a motion spring. Honors `skipAnimation` and
 * `prefers-reduced-motion` by rendering the final value immediately.
 */
export function AnimatedNumber({
  value,
  format = defaultFormat,
  spring: springOptions,
  skipAnimation = false,
  className,
}: AnimatedNumberProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldSkip = skipAnimation || !!prefersReducedMotion;

  const safeValue = Number.isFinite(value) ? value : 0;

  const hasMounted = useRef(false);
  const springValue = useSpring(safeValue, springOptions ?? defaultSpring);
  const [displayText, setDisplayText] = useState(() => format(safeValue));

  // Keep the spring's target in sync with the incoming value.
  useEffect(() => {
    if (!hasMounted.current) {
      // First mount: render statically, don't animate from 0.
      hasMounted.current = true;
      springValue.jump(safeValue);
      setDisplayText(format(safeValue));
      return;
    }

    if (shouldSkip) {
      springValue.jump(safeValue);
      setDisplayText(format(safeValue));
      return;
    }

    springValue.set(safeValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeValue, shouldSkip]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      const safeLatest = Number.isFinite(latest) ? latest : safeValue;
      setDisplayText(format(safeLatest));
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, springValue]);

  if (shouldSkip) {
    return <span className={className}>{format(safeValue)}</span>;
  }

  return <span className={className}>{displayText}</span>;
}

export default AnimatedNumber;
