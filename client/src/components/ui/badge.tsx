import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // v2 chip recipe: pill, mono-ish tracking, hue-tinted fill + matching border + text
  "inline-flex items-center rounded-pill border px-3 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // lilac accent chip
        default:
          "border-neon-lilac/40 bg-neon-lilac/[0.14] text-neon-lilac hover:bg-neon-lilac/20",
        // neutral glass chip
        secondary:
          "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.07]",
        destructive:
          "border-negative/40 bg-negative/[0.14] text-brand-pink hover:bg-negative/20",
        outline: "text-white/60 border-white/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
