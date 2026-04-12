import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export function TableWrapper({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Table({ className, children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn("w-full caption-bottom border-collapse text-sm", className)} {...props}>
      {children}
    </table>
  );
}

export function TableHead({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn("border-b border-[var(--color-border)] bg-[var(--color-muted)]", className)}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn("divide-y divide-[var(--color-border)] bg-[var(--color-surface)]", className)}
      {...props}
    >
      {children}
    </tbody>
  );
}

export function TableRow({ className, children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("transition-colors hover:bg-[var(--color-muted)]", className)} {...props}>
      {children}
    </tr>
  );
}

export function TableHeader({
  className,
  children,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({
  className,
  children,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-3 text-sm text-[var(--color-foreground)]", className)} {...props}>
      {children}
    </td>
  );
}

export function TableEmpty({
  colSpan,
  message = "No results found.",
}: {
  colSpan: number;
  message?: string;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-12 text-center text-sm text-[var(--color-muted-foreground)]"
      >
        {message}
      </td>
    </tr>
  );
}
