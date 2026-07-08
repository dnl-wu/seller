import type { ItemAttributes, ItemCondition } from "@seller/shared";

/** Fixed display order for the item facts panel. */
export const ITEM_ATTRIBUTE_FIELDS: readonly (keyof ItemAttributes)[] = [
  "category",
  "brand",
  "model",
  "condition",
  "size",
  "color",
  "material",
  "defects",
  "originalPrice",
  "ageOrYear",
  "notes",
];

const FIELD_LABELS: Record<keyof ItemAttributes, string> = {
  category: "Category",
  brand: "Brand",
  model: "Model",
  condition: "Condition",
  size: "Size",
  color: "Color",
  material: "Material",
  defects: "Defects",
  originalPrice: "Original price",
  ageOrYear: "Age / year",
  notes: "Notes",
};

const CONDITION_LABELS: Record<ItemCondition, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

/** Also used to render backend-provided `missingFields` strings consistently. */
export function formatFieldLabel(field: string): string {
  const known = FIELD_LABELS[field as keyof ItemAttributes];
  if (known) return known;
  return field.charAt(0).toUpperCase() + field.slice(1);
}

const NOT_PROVIDED = "Not provided";

/** Never renders a raw object/array — every field has an explicit, safe format. */
export function formatAttributeValue(
  field: keyof ItemAttributes,
  attributes: ItemAttributes,
): string {
  const value = attributes[field];

  if (value === undefined || value === null || value === "") {
    return NOT_PROVIDED;
  }

  if (field === "condition") {
    return CONDITION_LABELS[value as ItemCondition] ?? String(value);
  }

  if (field === "defects") {
    const defects = value as string[];
    return defects.length > 0 ? defects.join(", ") : "None reported";
  }

  if (field === "originalPrice") {
    const price = value as number;
    return Number.isFinite(price) ? `$${price.toFixed(2)}` : NOT_PROVIDED;
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return NOT_PROVIDED;
}

/** Safely formats a listing draft price without trusting raw numeric input. */
export function formatPrice(amount: number, currency: string): string {
  if (!Number.isFinite(amount) || amount < 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
