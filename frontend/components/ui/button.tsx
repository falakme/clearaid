import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Puffy clay base: rounded, soft press animation, accessible focus.
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-bold transition-all duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 active:translate-y-0.5 active:shadow-clay-inset",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-clay-primary hover:brightness-105",
        warning:
          "bg-warning text-warning-foreground shadow-clay-warning hover:brightness-105",
        outline:
          "border border-white/70 bg-card text-foreground shadow-clay hover:brightness-[1.02]",
        ghost:
          "text-foreground hover:bg-white/70 active:translate-y-0 active:shadow-none",
        link: "text-primary underline-offset-4 hover:underline active:translate-y-0 active:shadow-none",
      },
      size: {
        // Massive tap targets — min 48px height.
        default: "min-h-tap px-6 py-3 text-lg",
        lg: "min-h-[60px] px-8 py-4 text-xl",
        sm: "min-h-tap px-5 py-2 text-base",
        icon: "min-h-tap min-w-tap",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
