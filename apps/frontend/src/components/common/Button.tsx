import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import { Spinner } from "./Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variantClasses = {
  primary:
    "bg-[var(--color-accent)] text-[var(--color-on-accent)] hover:bg-[var(--color-accent-hover)] focus-visible:ring-[var(--color-accent)]",
  secondary:
    "bg-[var(--color-surface)] text-[var(--color-foreground)] border border-[var(--color-border)] hover:bg-[var(--color-muted)] focus-visible:ring-[var(--color-ring)]",
  ghost:
    "bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-muted)] focus-visible:ring-[var(--color-ring)]",
  destructive:
    "bg-[var(--color-destructive)] text-[var(--color-on-destructive)] hover:bg-[var(--color-destructive-hover)] focus-visible:ring-[var(--color-destructive)]",
};

const sizeClasses = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-6 text-base gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-md)] font-medium transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading && <Spinner size="sm" className="shrink-0" />}
      {children}
    </button>
  );
}
