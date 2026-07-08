import type { ItemAttributes, ItemCondition } from "@seller/shared";
import type { ExtractionInput, ItemAttributeDelta, ItemAttributeExtractor } from "./types.js";

/**
 * Deterministic, keyword-based stand-in for real extraction. This is NOT
 * an NLP model and does not understand language — it is a small,
 * fixed-vocabulary parser scoped to the "clothing" demo flow, isolated
 * behind ItemAttributeExtractor so it can be swapped for LlmItemAttributeExtractor
 * without touching the FSM or service layer. Used as the default in tests
 * and as a no-AI-configured fallback (ATTRIBUTE_EXTRACTOR=keyword).
 */

const CLOTHING_KEYWORDS = [
  "jacket",
  "coat",
  "shirt",
  "t-shirt",
  "tshirt",
  "jeans",
  "pants",
  "dress",
  "sweater",
  "hoodie",
  "skirt",
  "shorts",
];

// Order matters: earlier entries win when multiple phrases are present
// (e.g. "like new" must be checked before the bare substring "new").
const CONDITION_KEYWORDS: ReadonlyArray<readonly [string, ItemCondition]> = [
  ["like new", "like_new"],
  ["new", "new"],
  ["good", "good"],
  ["fair", "fair"],
  ["worn", "fair"],
  ["poor", "poor"],
  ["damaged", "poor"],
];

const SIZE_KEYWORDS = ["xs", "s", "m", "l", "xl", "xxl", "small", "medium", "large"];

const SIZE_NORMALIZATION: Record<string, string> = {
  xs: "XS",
  s: "S",
  small: "S",
  m: "M",
  medium: "M",
  l: "L",
  large: "L",
  xl: "XL",
  xxl: "XXL",
};

const BRAND_KEYWORDS = [
  "nike",
  "adidas",
  "zara",
  "gucci",
  "levis",
  "the north face",
  "north face",
  "uniqlo",
  "gap",
  "h&m",
  "patagonia",
];

function includesWord(haystack: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(haystack);
}

function findWordKeyword(haystack: string, keywords: string[]): string | undefined {
  return keywords.find((keyword) => includesWord(haystack, keyword));
}

export class KeywordItemAttributeExtractor implements ItemAttributeExtractor {
  async extract(input: ExtractionInput): Promise<ItemAttributeDelta> {
    // Strip apostrophes so contractions like "it's" don't create a false
    // word-boundary match for single-letter size tokens (the "s" in "it's").
    const text = input.message.toLowerCase().replace(/['’]/g, "");
    const patch: Partial<ItemAttributes> = {};

    if (findWordKeyword(text, CLOTHING_KEYWORDS)) {
      patch.category = "clothing";
    }

    const conditionMatch = CONDITION_KEYWORDS.find(([phrase]) =>
      includesWord(text, phrase),
    );
    if (conditionMatch) {
      patch.condition = conditionMatch[1];
    }

    const sizeKeyword = findWordKeyword(text, SIZE_KEYWORDS);
    if (sizeKeyword) {
      const normalized = SIZE_NORMALIZATION[sizeKeyword];
      if (normalized) {
        patch.size = normalized;
      }
    }

    const brandKeyword = findWordKeyword(text, BRAND_KEYWORDS);
    if (brandKeyword) {
      patch.brand = brandKeyword;
    }

    return patch;
  }
}

export const keywordItemAttributeExtractor = new KeywordItemAttributeExtractor();
