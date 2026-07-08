import type { GeneratedListing, ItemAttributes, ItemCondition } from "@seller/shared";
import type { ListingGenerationInput, ListingGenerator } from "./types.js";

/**
 * Deterministic, template-based stand-in for real listing generation. Like
 * KeywordItemAttributeExtractor, this does not understand language — it
 * only ever states facts already present in the structured attributes, so
 * it's a safe default (LISTING_GENERATOR=template) for dev/tests without
 * any AI configured.
 */

const CONDITION_LABELS: Record<ItemCondition, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

const CONDITION_DISCOUNT: Record<ItemCondition, number> = {
  new: 0.7,
  like_new: 0.6,
  good: 0.5,
  fair: 0.35,
  poor: 0.2,
};

const FALLBACK_PRICE = 20;

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function estimatePrice(attributes: ItemAttributes): number {
  if (attributes.originalPrice === undefined) {
    return FALLBACK_PRICE;
  }
  const discount = attributes.condition ? CONDITION_DISCOUNT[attributes.condition] : 0.5;
  return Math.round(attributes.originalPrice * discount * 100) / 100;
}

function buildTitle(attributes: ItemAttributes): string {
  const parts = [
    attributes.brand ? capitalize(attributes.brand) : undefined,
    attributes.category ? capitalize(attributes.category) : "Item",
    attributes.size ? `Size ${attributes.size}` : undefined,
  ].filter((part): part is string => Boolean(part));
  return parts.join(" ");
}

function buildDescription(attributes: ItemAttributes): string {
  const lines: string[] = [];

  const subject = [
    attributes.brand ? capitalize(attributes.brand) : undefined,
    attributes.category ?? "item",
  ]
    .filter(Boolean)
    .join(" ");
  lines.push(`${subject}${attributes.size ? `, size ${attributes.size}` : ""}.`);

  if (attributes.condition) {
    lines.push(`Condition: ${CONDITION_LABELS[attributes.condition]}.`);
  }
  if (attributes.color) {
    lines.push(`Color: ${attributes.color}.`);
  }
  if (attributes.material) {
    lines.push(`Material: ${attributes.material}.`);
  }

  if (attributes.defects && attributes.defects.length > 0) {
    lines.push(`Known defects: ${attributes.defects.join(", ")}.`);
  } else if (attributes.condition === "new") {
    lines.push("No known defects.");
  }

  return lines.join(" ");
}

export class TemplateListingGenerator implements ListingGenerator {
  async generate({ attributes, currency }: ListingGenerationInput): Promise<GeneratedListing> {
    return {
      title: buildTitle(attributes),
      description: buildDescription(attributes),
      suggestedPrice: estimatePrice(attributes),
      currency,
    };
  }
}

export const templateListingGenerator = new TemplateListingGenerator();
