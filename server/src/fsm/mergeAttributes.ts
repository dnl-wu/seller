import type { ItemAttributes } from "@seller/shared";

/**
 * Merges an extractor's proposed patch into known attributes. Only
 * non-null/non-undefined/non-empty-string values overwrite existing ones.
 * Arrays are replaced when present; for the current item attributes this lets
 * a later explicit defects list correct the previous one.
 */
function assignIfPresent<K extends keyof ItemAttributes>(
  target: ItemAttributes,
  key: K,
  value: ItemAttributes[K] | undefined | null,
): void {
  if (value === undefined || value === null) return;
  if (typeof value === "string" && value.trim() === "") return;
  target[key] = value;
}

export function mergeAttributes(
  current: ItemAttributes,
  patch: ItemAttributes,
): ItemAttributes {
  const merged: ItemAttributes = { ...current };
  for (const key of Object.keys(patch) as (keyof ItemAttributes)[]) {
    assignIfPresent(merged, key, patch[key]);
  }
  return merged;
}
