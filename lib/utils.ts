import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Make raw user text safe to embed in a PostgREST `.or("...ilike...")` filter.
 * Commas separate conditions and parentheses group them in that syntax, so a
 * search term containing them corrupts the whole filter (a thrown query error
 * on the shop page). They're replaced with spaces, not escaped — PostgREST
 * offers no escaping inside `.or()` strings.
 */
export function sanitizeSearchTerm(input: string): string {
  return input.replace(/[,()]/g, " ").replace(/\s+/g, " ").trim();
}

/** Turn an arbitrary label into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
