import { beforeEach, describe, expect, it } from "vitest";
import { getOrCreateSellerId } from "./sellerIdentity.js";

const STORAGE_KEY = "seller-agent:seller-id";

describe("getOrCreateSellerId", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("creates and persists a new id when none exists", () => {
    const id = getOrCreateSellerId();
    expect(id).toBeTruthy();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(id);
  });

  it("reuses the existing id from localStorage rather than creating a new one", () => {
    const first = getOrCreateSellerId();
    const second = getOrCreateSellerId();
    expect(second).toBe(first);
  });
});
