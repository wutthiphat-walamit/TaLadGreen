import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS class names safely.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format an ISO timestamp or Date into Thai Buddhist/short date-time string.
 */
export function formatThaiDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

/**
 * Format an ISO timestamp or Date into Thai short date string.
 */
export function formatThaiDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

/**
 * Compute up to 2 initials from first and last names for avatar display.
 */
export function getInitials(firstName: string, lastName?: string): string {
  const first = firstName.trim().charAt(0);
  const last = (lastName ?? "").trim().charAt(0);
  const combined = `${first}${last}`.trim();
  return combined || "?";
}
