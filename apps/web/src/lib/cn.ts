/**
 * apps/web/src/lib/cn.ts
 * Joins class names the way shadcn components do, so conditional styles stay readable.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes, letting later classes win.
 * @param values - Class names, arrays, or falsey flags
 * @returns A single class string
 */
export function cn(...values: ClassValue[]): string {
  return twMerge(clsx(values));
}
