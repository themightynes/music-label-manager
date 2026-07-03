import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * HoloDisc — the spinning holographic vinyl disc brand mark (Design System v2 §4.6 / §7).
 *
 * A full-spectrum repeating-conic-gradient rotates behind a dark spindle center, with an
 * optional soft-light brushed-sheen second conic layer. The brand mark at every scale
 * (sidebar 40px, dock center 60px, splash 360px).
 *
 * Respects prefers-reduced-motion (the spin animation is disabled via the shared
 * `.animate-ds-spin` reduced-motion rule in index.css).
 *
 * Phase 4 PR-7: an optional `pulse` prop renders a `ds-ring`-style pulsing halo
 * around the disc — pure ambient garnish for "something notable happened"
 * moments. This primitive only renders the halo when `pulse` is true; it owns
 * no timers or duration logic — the CALLER decides how long `pulse` stays true
 * (e.g. CommandDock flips it on for ~6s after a hero/notable week). The halo is
 * absolutely positioned so it never affects layout. Like the spin animation,
 * `.animate-ds-ring` is disabled under `prefers-reduced-motion: reduce` by the
 * shared rule in index.css (§10) — no extra guard is needed here.
 */
export interface HoloDiscProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Diameter in px. */
  size?: number
  /** Seconds per full rotation. Default 14. */
  spinSeconds?: number
  /** Render the brushed-sheen soft-light second conic layer. Default true. */
  sheen?: boolean
  /** Vinyl dressing: concentric groove rings + specular highlight + inner darkening
   *  (splash-disc.html recipe). For large hero discs; too fine to read below ~100px. */
  grooves?: boolean
  /** Render a pulsing halo ring around the disc (Phase 4 PR-7 ambient feedback).
   *  Purely presentational on/off — the caller owns the duration. Default false. */
  pulse?: boolean
}

const SPECTRUM =
  "repeating-conic-gradient(from 0deg at 50% 50%, #ff3d6e 0deg, #ff9a3d 22deg, #ffe14d 42deg, #57ff8f 66deg, #37d6ff 92deg, #4a6bff 118deg, #b45cff 146deg, #ff3d6e 180deg)"

const HoloDisc = React.forwardRef<HTMLDivElement, HoloDiscProps>(
  (
    { size = 40, spinSeconds = 14, sheen = true, grooves = false, pulse = false, className, style, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn("relative shrink-0 overflow-visible rounded-full", className)}
        style={{
          width: size,
          height: size,
          boxShadow:
            "0 0 0 1px rgba(160,90,240,0.4), 0 4px 16px rgba(106,47,208,0.4)",
          ...style,
        }}
        {...props}
      >
        {/* pulsing halo ring (Phase 4 PR-7) — absolutely positioned outside the
            disc's own bounds, bounded by the caller's `pulse` prop; no layout
            shift (the halo overflows visually only, never affects flow), no
            internal timer. Rendered first so it sits behind the disc content. */}
        {pulse && (
          <span
            aria-hidden="true"
            data-testid="holo-disc-pulse"
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 animate-ds-ring rounded-full blur-[10px]"
            style={{
              width: size * 1.8,
              height: size * 1.8,
              marginLeft: -(size * 0.9),
              marginTop: -(size * 0.9),
              background:
                "radial-gradient(circle, rgba(160,90,240,0.55) 0%, rgba(160,90,240,0.28) 42%, rgba(160,90,240,0) 72%)",
            }}
          />
        )}
        <div className="absolute inset-0 overflow-hidden rounded-full">
          {/* spectral spinning layer */}
          <div
            className="animate-ds-spin absolute inset-0"
            style={{
              background: SPECTRUM,
              animationDuration: `${spinSeconds}s`,
            }}
          />
          {/* optional brushed-sheen soft-light layer, slightly slower + reversed feel */}
          {sheen && (
            <div
              className="animate-ds-spin absolute inset-0"
              style={{
                mixBlendMode: "soft-light",
                opacity: 0.5,
                background:
                  "conic-gradient(from 90deg at 50% 50%, rgba(255,255,255,0.6), rgba(255,255,255,0) 30%, rgba(255,255,255,0.5) 55%, rgba(255,255,255,0) 80%, rgba(255,255,255,0.6))",
                animationDuration: `${spinSeconds * 1.6}s`,
              }}
            />
          )}
          {/* vinyl dressing: grooves + specular highlight + inner darkening */}
          {grooves && (
            <>
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "repeating-radial-gradient(circle at 50% 50%, rgba(0,0,0,0.16) 0px, rgba(0,0,0,0) 1.5px, rgba(0,0,0,0) 4px, rgba(0,0,0,0.1) 5.5px)",
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  mixBlendMode: "screen",
                  background:
                    "radial-gradient(circle at 40% 34%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 34%)",
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 50% 50%, rgba(5,3,8,0.65) 0%, rgba(5,3,8,0) 30%)",
                }}
              />
            </>
          )}
          {/* dark spindle center */}
          <div
            className="absolute rounded-full"
            style={{
              top: "50%",
              left: "50%",
              width: "32%",
              height: "32%",
              margin: "-16% 0 0 -16%",
              background: "#0a0814",
              boxShadow: "inset 0 0 0 1px rgba(160,90,240,0.5)",
            }}
          />
        </div>
      </div>
    )
  }
)
HoloDisc.displayName = "HoloDisc"

export { HoloDisc }
