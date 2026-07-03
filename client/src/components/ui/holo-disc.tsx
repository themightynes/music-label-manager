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
 */
export interface HoloDiscProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Diameter in px. */
  size?: number
  /** Seconds per full rotation. Default 14. */
  spinSeconds?: number
  /** Render the brushed-sheen soft-light second conic layer. Default true. */
  sheen?: boolean
}

const SPECTRUM =
  "repeating-conic-gradient(from 0deg at 50% 50%, #ff3d6e 0deg, #ff9a3d 22deg, #ffe14d 42deg, #57ff8f 66deg, #37d6ff 92deg, #4a6bff 118deg, #b45cff 146deg, #ff3d6e 180deg)"

const HoloDisc = React.forwardRef<HTMLDivElement, HoloDiscProps>(
  ({ size = 40, spinSeconds = 14, sheen = true, className, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative shrink-0 overflow-hidden rounded-full", className)}
        style={{
          width: size,
          height: size,
          boxShadow:
            "0 0 0 1px rgba(160,90,240,0.4), 0 4px 16px rgba(106,47,208,0.4)",
          ...style,
        }}
        {...props}
      >
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
    )
  }
)
HoloDisc.displayName = "HoloDisc"

export { HoloDisc }
