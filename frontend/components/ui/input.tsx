import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "min-h-tap w-full rounded-md border border-white/70 bg-card px-4 py-3 text-lg text-foreground shadow-clay-inset transition-shadow placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/35",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
