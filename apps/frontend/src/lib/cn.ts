import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS class names, resolving conflicts intelligently.
 *
 * Use for conditional or potentially conflicting classes:
 *   cn("px-4 py-2", isActive && "bg-primary", className)
 *
 * Do NOT use for static class strings — just use className directly.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
