import type { ItemAttributes } from "@seller/shared";

/**
 * Merges an extractor's proposed patch into known attributes. Only
 * non-null/non-undefined values overwrite existing ones — this is what
 * keeps a later empty or "unknown" extraction from erasing a fact that
 * was already established earlier in the conversation.
 */
function assignIfPresent<K extends keyof ItemAttributes>(
  target: ItemAttributes,
  key: K,
  value: ItemAttributes[K] | undefined | null,
): void {
  if (value !== undefined && value !== null) {
    target[key] = value;
  }
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
