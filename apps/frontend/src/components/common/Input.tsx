import type { InputHTMLAttributes } from "react";
import { useId } from "react";
import { cn } from "../../lib/cn";
import { Label } from "./Label";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({
  label,
  error,
  helperText,
  required,
  className,
  id: externalId,
  ...props
}: InputProps) {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}

      <input
        id={id}
        required={required}
        aria-invalid={!!error}
        aria-describedby={
          [error ? errorId : "", helperText ? helperId : ""].filter(Boolean).join(" ") || undefined
        }
        className={cn(
          "h-9 w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3 text-sm",
          "text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error
            ? "border-[var(--color-destructive)] focus-visible:ring-[var(--color-destructive)]"
            : "border-[var(--color-input)] hover:border-[var(--color-secondary)]",
          className,
        )}
        {...props}
      />

      {error && (
        <p id={errorId} role="alert" className="text-xs text-[var(--color-error-text)]">
          {error}
        </p>
      )}

      {!error && helperText && (
        <p id={helperId} className="text-xs text-[var(--color-muted-foreground)]">
          {helperText}
        </p>
      )}
    </div>
  );
}
