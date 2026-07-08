import { describe, expect, it, vi } from "vitest";
import { FallbackItemAttributeExtractor } from "./fallbackExtractor.js";
import type { ItemAttributeExtractor } from "./types.js";

function extractor(delta: Awaited<ReturnType<ItemAttributeExtractor["extract"]>>) {
  return {
    extract: vi.fn(async () => delta),
  };
}

const context = {
  latestMessage: "beat up",
  currentAttributes: {},
  recentMessages: [],
};

describe("FallbackItemAttributeExtractor", () => {
  it("returns the primary delta without calling fallback when core fields are covered", async () => {
    const primary = extractor({ category: "clothing", condition: "fair", size: "M", brand: "nike" });
    const fallback = extractor({ condition: "poor" });
    const combined = new FallbackItemAttributeExtractor(primary, fallback);

    await expect(combined.extract(context)).resolves.toEqual({
      category: "clothing",
      condition: "fair",
      size: "M",
      brand: "nike",
    });
    expect(fallback.extract).not.toHaveBeenCalled();
  });

  it("uses fallback to fill core fields the primary extractor missed", async () => {
    const primary = extractor({ condition: "fair" });
    const fallback = extractor({ category: "clothing", size: "L", brand: "patagonia" });
    const combined = new FallbackItemAttributeExtractor(primary, fallback);

    await expect(combined.extract(context)).resolves.toEqual({
      category: "clothing",
      condition: "fair",
      size: "L",
      brand: "patagonia",
    });
    expect(fallback.extract).toHaveBeenCalledWith(context);
  });

  it("keeps useful primary fields when fallback fails", async () => {
    const primary = extractor({ condition: "fair" });
    const fallback = {
      extract: vi.fn(async () => {
        throw new Error("llm unavailable");
      }),
    };
    const combined = new FallbackItemAttributeExtractor(primary, fallback);

    await expect(combined.extract(context)).resolves.toEqual({ condition: "fair" });
  });

  it("throws fallback errors when no primary fields were extracted", async () => {
    const primary = extractor({});
    const fallback = {
      extract: vi.fn(async () => {
        throw new Error("llm unavailable");
      }),
    };
    const combined = new FallbackItemAttributeExtractor(primary, fallback);

    await expect(combined.extract(context)).rejects.toThrow("llm unavailable");
  });
});
