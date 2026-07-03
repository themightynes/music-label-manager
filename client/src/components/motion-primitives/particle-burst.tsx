'use client';
import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

/**
 * ParticleBurst (Phase 4 PR-5) — a lightweight, self-contained SVG confetti
 * emitter for celebrating hero moments (a No. 1 chart update, campaign end).
 *
 * NO new dependency: it renders a handful of small SVG circles animated with
 * `motion/react` (already a project dep) and auto-cleans ~1.5s after each
 * burst. It fires ONCE per change of the `trigger` prop (a truthy toggle or a
 * changing token) — mounting with `trigger` already truthy fires the first
 * burst, and flipping it to a new value fires another.
 *
 * Colors come from props (v2 neon palette, passed by the caller — never random
 * hexes baked in here), mirroring how GlowEffect takes a `colors` prop. The
 * scatter directions are deterministic-per-count (evenly distributed radial
 * angles with a fixed per-index jitter), so there is no RNG and the visual is
 * stable across renders.
 *
 * Accessibility: renders NOTHING under `prefers-reduced-motion` — the
 * reduced-motion bail is baked into the primitive itself, so callers never
 * have to gate it. Purely decorative, so it is `aria-hidden` and
 * `pointer-events-none`.
 */
export interface ParticleBurstProps {
  /**
   * Fires one burst whenever this value changes (and once on mount if truthy).
   * Pass a boolean toggle or an incrementing/changing token.
   */
  trigger: unknown;
  /** Particle colors (v2 neon palette). Cycled across the particles. */
  colors?: string[];
  /** Number of particles per burst (~20–30 recommended). */
  particleCount?: number;
  className?: string;
}

// v2 neon defaults (magenta / purple / cyan / amber). Callers may override.
const DEFAULT_COLORS = ['#ff4fd8', '#a855f7', '#22d3ee', '#fbbf24'];

const BURST_LIFETIME_MS = 1500;

interface Particle {
  id: number;
  color: string;
  angle: number; // radians
  distance: number; // px travelled
  size: number; // radius px
}

// Deterministic per-index scatter: even radial spread plus a small fixed
// jitter derived from the index (no RNG, stable across renders).
function buildParticles(count: number, colors: string[], seed: number): Particle[] {
  const safeCount = Math.max(1, Math.floor(count));
  const palette = colors.length > 0 ? colors : DEFAULT_COLORS;
  const particles: Particle[] = [];
  for (let i = 0; i < safeCount; i++) {
    const base = (i / safeCount) * Math.PI * 2;
    // Fixed, index-derived jitter so bursts vary a touch without RNG.
    const jitter = ((i * 2654435761) % 1000) / 1000; // 0..1, hashed from index
    const angle = base + (jitter - 0.5) * 0.6;
    const distance = 42 + (jitter * 34); // 42..76px
    const size = 2 + ((i % 3)); // 2..4px radius
    particles.push({
      id: seed * 1000 + i,
      color: palette[i % palette.length],
      angle,
      distance,
      size,
    });
  }
  return particles;
}

export function ParticleBurst({
  trigger,
  colors = DEFAULT_COLORS,
  particleCount = 24,
  className,
}: ParticleBurstProps) {
  const prefersReducedMotion = useReducedMotion();

  // Each burst is a keyed generation of particles. `burstSeed` increments per
  // trigger change; when it is 0 no burst has fired yet.
  const [burstSeed, setBurstSeed] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const prevTrigger = useRef<unknown>(undefined);
  const firstRun = useRef(true);
  const cleanupRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reduced motion: never emit particles.
    if (prefersReducedMotion) return;

    const changed = firstRun.current
      ? !!trigger // on mount, only fire if trigger is truthy
      : trigger !== prevTrigger.current;

    prevTrigger.current = trigger;
    firstRun.current = false;

    if (!changed) return;

    setBurstSeed((s) => {
      const next = s + 1;
      setParticles(buildParticles(particleCount, colors, next));
      return next;
    });

    if (cleanupRef.current) clearTimeout(cleanupRef.current);
    cleanupRef.current = setTimeout(() => {
      setParticles([]);
    }, BURST_LIFETIME_MS);

    // colors/particleCount are treated as stable config; the trigger drives it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, prefersReducedMotion]);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) clearTimeout(cleanupRef.current);
    };
  }, []);

  // Reduced motion or nothing to show → render nothing.
  if (prefersReducedMotion || particles.length === 0) return null;

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-visible',
        className
      )}
      aria-hidden="true"
      data-testid="particle-burst"
    >
      <svg
        className="overflow-visible"
        width="1"
        height="1"
        viewBox="0 0 1 1"
        style={{ overflow: 'visible' }}
      >
        {particles.map((p) => {
          const dx = Math.cos(p.angle) * p.distance;
          const dy = Math.sin(p.angle) * p.distance;
          return (
            <motion.circle
              key={p.id}
              cx={0.5}
              cy={0.5}
              r={p.size}
              fill={p.color}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: dx, y: dy, opacity: 0, scale: 0.4 }}
              transition={{ duration: BURST_LIFETIME_MS / 1000, ease: 'easeOut' }}
            />
          );
        })}
      </svg>
    </div>
  );
}

export default ParticleBurst;
