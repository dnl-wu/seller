import type { ExtractionContext } from "../services/context/context.types.js";
import type { ItemAttributeDelta, ItemAttributeExtractor } from "./types.js";

const CORE_FIELDS = ["category", "condition", "size", "brand"] as const;

function hasDelta(delta: ItemAttributeDelta): boolean {
  return Object.keys(delta).length > 0;
}

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

function missesCoreField(context: ExtractionContext, delta: ItemAttributeDelta): boolean {
  return CORE_FIELDS.some((field) => isMissing(delta[field] ?? context.currentAttributes[field]));
}

export class FallbackItemAttributeExtractor implements ItemAttributeExtractor {
  constructor(
    private readonly primary: ItemAttributeExtractor,
    private readonly fallback: ItemAttributeExtractor,
  ) {}

  async extract(context: ExtractionContext): Promise<ItemAttributeDelta> {
    const primaryDelta = await this.primary.extract(context);
    if (!missesCoreField(context, primaryDelta)) {
      return primaryDelta;
    }

    try {
      const fallbackDelta = await this.fallback.extract(context);
      return { ...fallbackDelta, ...primaryDelta };
    } catch (err) {
      if (hasDelta(primaryDelta)) {
        return primaryDelta;
      }
      throw err;
    }
  }
}
