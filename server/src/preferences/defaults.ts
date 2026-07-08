import type { SellerPreferences } from "@seller/shared";

export const DEFAULT_SELLER_PREFERENCES = {
  toneOfVoice: "concise",
  descriptionLength: "medium",
  pricingStrategy: "balanced",
  defaultCurrency: "CAD",
} as const satisfies Omit<SellerPreferences, "sellerId" | "createdAt" | "updatedAt">;

export function buildDefaultSellerPreferences(sellerId: string): SellerPreferences {
  return {
    sellerId,
    ...DEFAULT_SELLER_PREFERENCES,
  };
}
