import type {
  DescriptionLength,
  GeneratedListing,
  ItemAttributes,
  ItemCondition,
  PricingStrategy,
  ToneOfVoice,
} from "@seller/shared";
import type {
  ListingGenerationContext,
  ListingPreferenceContext,
} from "../services/context/context.types.js";
import type { ListingGenerator } from "./types.js";

/**
 * Deterministic, template-based stand-in for real listing generation. Like
 * KeywordItemAttributeExtractor, this does not understand language; it only
 * states facts already present in the structured attributes, plus explicit
 * seller preferences that control style and strategy.
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

const PRICE_STRATEGY_MULTIPLIER: Record<PricingStrategy, number> = {
  sell_fast: 0.9,
  balanced: 1,
  maximize_price: 1.12,
};

const FALLBACK_PRICE = 20;

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function estimatePrice(attributes: ItemAttributes, pricingStrategy: PricingStrategy): number {
  const base =
    attributes.originalPrice === undefined
      ? FALLBACK_PRICE
      : attributes.originalPrice *
        (attributes.condition ? CONDITION_DISCOUNT[attributes.condition] : 0.5);
  return Math.round(base * PRICE_STRATEGY_MULTIPLIER[pricingStrategy] * 100) / 100;
}

function toneIntro(toneOfVoice: ToneOfVoice, subject: string, size: string | undefined): string {
  const sizeText = size ? `, size ${size}` : "";
  if (toneOfVoice === "professional") {
    return `${subject}${sizeText}, prepared for a straightforward resale listing.`;
  }
  if (toneOfVoice === "friendly") {
    return `Easygoing ${subject}${sizeText} ready for its next owner.`;
  }
  return `${subject}${sizeText}.`;
}

function strategyLine(pricingStrategy: PricingStrategy): string | undefined {
  if (pricingStrategy === "sell_fast") {
    return "Price is set competitively for a quicker sale.";
  }
  if (pricingStrategy === "maximize_price") {
    return "Price is set as a higher initial ask.";
  }
  return undefined;
}

function applyDescriptionLength(
  lines: string[],
  descriptionLength: DescriptionLength,
): string[] {
  if (descriptionLength === "short") {
    return lines.slice(0, 2);
  }
  if (descriptionLength === "detailed") {
    return lines;
  }
  return lines.slice(0, Math.min(lines.length, 4));
}

function buildTitle(attributes: ItemAttributes): string {
  const parts = [
    attributes.brand ? capitalize(attributes.brand) : undefined,
    attributes.category ? capitalize(attributes.category) : "Item",
    attributes.size ? `Size ${attributes.size}` : undefined,
  ].filter((part): part is string => Boolean(part));
  return parts.join(" ");
}

function buildDescription(
  attributes: ItemAttributes,
  preferences: ListingPreferenceContext,
): string {
  const lines: string[] = [];

  const subject = [
    attributes.brand ? capitalize(attributes.brand) : undefined,
    attributes.category ?? "item",
  ]
    .filter(Boolean)
    .join(" ");
  lines.push(toneIntro(preferences.toneOfVoice, subject, attributes.size));

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

  const pricingLine = strategyLine(preferences.pricingStrategy);
  if (pricingLine) lines.push(pricingLine);
  if (preferences.shippingPreference) {
    lines.push(preferences.shippingPreference);
  }

  return applyDescriptionLength(lines, preferences.descriptionLength).join(" ");
}

export class TemplateListingGenerator implements ListingGenerator {
  async generate({ attributes, preferences }: ListingGenerationContext): Promise<GeneratedListing> {
    return {
      title: buildTitle(attributes),
      description: buildDescription(attributes, preferences),
      suggestedPrice: estimatePrice(attributes, preferences.pricingStrategy),
      currency: preferences.defaultCurrency,
    };
  }
}

export const templateListingGenerator = new TemplateListingGenerator();
