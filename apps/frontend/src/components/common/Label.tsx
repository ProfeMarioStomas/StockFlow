import type { LabelHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean | undefined;
}

export function Label({ required, className, children, ...props }: LabelProps) {
  return (
    <label
      className={cn("block text-sm font-medium text-[var(--color-foreground)]", className)}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-1 text-[var(--color-destructive)]" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}
