import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // v2: 13px button radius, Inter 500/600, light-driven depth
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-button text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary action — d14a7a→7a2fb0 gradient + colored cast glow + white rim
        default:
          "font-semibold text-white bg-gradient-to-br from-action-pink to-action-purple shadow-action border-t border-white/25 hover:brightness-110",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // Cyan accent outline (spec §6)
        outline:
          "border border-neon-cyan/40 bg-neon-cyan/[0.08] text-neon-cyan hover:bg-neon-cyan/[0.14] hover:text-neon-cyan",
        // Glass secondary
        secondary:
          "border border-white/10 bg-white/[0.03] text-white/85 hover:bg-white/[0.06]",
        // Ghost (spec §6)
        ghost: "text-white/75 hover:bg-white/[0.045] hover:text-white",
        link: "text-neon-lilac underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-chip px-3",
        lg: "h-11 rounded-button px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
