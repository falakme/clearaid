import * as React from "react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FieldProps extends InputProps {
  label: string;
  icon?: React.ReactNode;
}

/** Labelled input with an optional leading icon, styled for the auth pages. */
export const Field = React.forwardRef<HTMLInputElement, FieldProps>(
  ({ label, icon, className, ...props }, ref) => (
    <label className="block">
      <span className="mb-1 block font-semibold">{label}</span>
      <span className="relative block">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
        )}
        <Input ref={ref} className={cn(icon && "pl-11", className)} {...props} />
      </span>
    </label>
  ),
);
Field.displayName = "Field";
