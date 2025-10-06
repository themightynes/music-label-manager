"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const GlowDialog = DialogPrimitive.Root
const GlowDialogTrigger = DialogPrimitive.Trigger
const GlowDialogClose = DialogPrimitive.Close

const GlowDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
GlowDialogOverlay.displayName = DialogPrimitive.Overlay.displayName

interface GlowDialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  glowColors?: string[];
  glowMode?: 'rotate' | 'pulse' | 'breathe' | 'colorShift' | 'flowHorizontal' | 'static';
  glowBlur?: 'softest' | 'soft' | 'medium' | 'strong' | 'stronger' | 'strongest' | 'none';
  glowDuration?: number;
}

const GlowDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  GlowDialogContentProps
>(({ className, children, glowColors, glowMode, glowBlur, glowDuration, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <GlowDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-transparent data-[state=open]:text-white hover:bg-brand-burgundy/20 z-50">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
GlowDialogContent.displayName = DialogPrimitive.Content.displayName

const GlowDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
GlowDialogHeader.displayName = "GlowDialogHeader"

const GlowDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
GlowDialogFooter.displayName = "GlowDialogFooter"

const GlowDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
GlowDialogTitle.displayName = DialogPrimitive.Title.displayName

const GlowDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
GlowDialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  GlowDialog,
  GlowDialogTrigger,
  GlowDialogContent,
  GlowDialogHeader,
  GlowDialogFooter,
  GlowDialogTitle,
  GlowDialogDescription,
  GlowDialogClose,
}
