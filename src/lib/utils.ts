import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const environmentVariablesDefault = {
  VITE_CONVEX_URL: "https://clean-tortoise-490.convex.cloud",
  VITE_CONVEX_SITE_URL: "https://app.crownpharmacy.co.zw",
};
