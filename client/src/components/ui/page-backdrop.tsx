import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * PageBackdrop — the standard v2 page backdrop stack (Design System v2 §9).
 *
 * Layers, bottom→top:
 *   1. #070610 app base (body already paints this; included here for isolation)
 *   2. optional /liquid-chrome-bg.jpg photo (tolerates absence — hidden on error)
 *   3. large soft spectral blooms (CSS-only, `.backdrop-bloom`, drift animation)
 *   4. dark scrim
 *   5. 26px dot grid
 *   6. grain overlay (mix-blend overlay, above content)
 *
 * pointer-events:none, absolutely positioned to inset:0 — drop it as the first child of a
 * `relative` page container and render content in a sibling with a higher z-index.
 */
export interface PageBackdropProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Dim the blooms/photo for content-heavy screens. */
  dimmed?: boolean
}

const PageBackdrop = React.forwardRef<HTMLDivElement, PageBackdropProps>(
  ({ dimmed = false, className, ...props }, ref) => {
    const [hasPhoto, setHasPhoto] = React.useState(true)

    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
        {...props}
      >
        {/* 1. app base */}
        <div className="absolute inset-0 bg-surface-app" />

        {/* 2. optional liquid-chrome photo — tolerate absence */}
        {hasPhoto && (
          <img
            src="/liquid-chrome-bg.jpg"
            alt=""
            aria-hidden="true"
            onError={() => setHasPhoto(false)}
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              opacity: dimmed ? 0.18 : 0.3,
              filter: "saturate(1.1) brightness(0.9)",
            }}
          />
        )}

        {/* 3. spectral blooms (CSS-only) */}
        <div
          className="backdrop-bloom"
          style={dimmed ? { opacity: 0.3 } : undefined}
        />

        {/* 4. dark scrim */}
        <div className="backdrop-scrim" />

        {/* 5. dot grid */}
        <div className="backdrop-dotgrid" />

        {/* 6. grain overlay */}
        <div className="grain-overlay" />
      </div>
    )
  }
)
PageBackdrop.displayName = "PageBackdrop"

export { PageBackdrop }
