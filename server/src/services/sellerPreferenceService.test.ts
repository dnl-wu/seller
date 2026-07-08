import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SellerPreferences } from "@seller/shared";

vi.mock("../models/SellerPreference.js", () => ({
  findSellerPreferenceBySellerId: vi.fn(),
  upsertSellerPreference: vi.fn(),
}));

import {
  findSellerPreferenceBySellerId,
  upsertSellerPreference,
} from "../models/SellerPreference.js";
import {
  getSellerPreferences,
  updateSellerPreferences,
} from "./sellerPreferenceService.js";

function makePreferenceDoc(overrides: Partial<SellerPreferences> = {}) {
  return {
    sellerId: overrides.sellerId ?? "seller-1",
    toneOfVoice: overrides.toneOfVoice ?? "concise",
    descriptionLength: overrides.descriptionLength ?? "medium",
    pricingStrategy: overrides.pricingStrategy ?? "balanced",
    defaultCurrency: overrides.defaultCurrency ?? "CAD",
    shippingPreference: overrides.shippingPreference,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    set: vi.fn(function set(this: Record<string, unknown>, key: string, value: unknown) {
      this[key] = value;
    }),
    save: vi.fn(async function save(this: unknown) {
      return this;
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sellerPreferenceService", () => {
  it("returns centralized defaults when no preference record exists", async () => {
    vi.mocked(findSellerPreferenceBySellerId).mockResolvedValue(null);

    const result = await getSellerPreferences("seller-1");

    expect(result).toEqual({
      sellerId: "seller-1",
      toneOfVoice: "concise",
      descriptionLength: "medium",
      pricingStrategy: "balanced",
      defaultCurrency: "CAD",
    });
    expect(upsertSellerPreference).not.toHaveBeenCalled();
  });

  it("updates partial preferences while preserving omitted values", async () => {
    vi.mocked(findSellerPreferenceBySellerId).mockResolvedValue(
      makePreferenceDoc({ shippingPreference: "Local pickup" }) as never,
    );
    vi.mocked(upsertSellerPreference).mockResolvedValue(
      makePreferenceDoc({
        toneOfVoice: "professional",
        shippingPreference: "Local pickup",
      }) as never,
    );

    const result = await updateSellerPreferences("seller-1", {
      toneOfVoice: "professional",
    });

    expect(upsertSellerPreference).toHaveBeenCalledWith("seller-1", {
      toneOfVoice: "professional",
      descriptionLength: "medium",
      pricingStrategy: "balanced",
      defaultCurrency: "CAD",
      shippingPreference: "Local pickup",
    });
    expect(result.toneOfVoice).toBe("professional");
    expect(result.descriptionLength).toBe("medium");
  });

  it("trims shipping preference before storing it", async () => {
    vi.mocked(findSellerPreferenceBySellerId).mockResolvedValue(null);
    vi.mocked(upsertSellerPreference).mockResolvedValue(
      makePreferenceDoc({ shippingPreference: "Local pickup preferred" }) as never,
    );

    await updateSellerPreferences("seller-1", {
      shippingPreference: "  Local pickup preferred  ",
    });

    expect(upsertSellerPreference).toHaveBeenCalledWith(
      "seller-1",
      expect.objectContaining({ shippingPreference: "Local pickup preferred" }),
    );
  });

  it("removes empty shipping preference instead of storing it", async () => {
    const doc = makePreferenceDoc({ shippingPreference: "Local pickup" });
    vi.mocked(findSellerPreferenceBySellerId).mockResolvedValue(doc as never);
    vi.mocked(upsertSellerPreference).mockResolvedValue(doc as never);

    const result = await updateSellerPreferences("seller-1", {
      shippingPreference: "   ",
    });

    expect(upsertSellerPreference).toHaveBeenCalledWith(
      "seller-1",
      expect.not.objectContaining({ shippingPreference: expect.any(String) }),
    );
    expect(doc.save).toHaveBeenCalled();
    expect(result.shippingPreference).toBeUndefined();
  });
});
