import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility helper to merge conditional class names with Tailwind CSS conflicts resolved.
 * Adheres to Section 9.1 of HANDBOOK_CLEANCODE.md
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
