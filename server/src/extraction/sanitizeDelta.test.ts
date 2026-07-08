import { describe, expect, it } from "vitest";
import { sanitizeRawDelta } from "./sanitizeDelta.js";

describe("sanitizeRawDelta", () => {
  it("strips null values", () => {
    expect(sanitizeRawDelta({ brand: null, category: "clothing" })).toEqual({
      category: "clothing",
    });
  });

  it("strips undefined values", () => {
    expect(sanitizeRawDelta({ brand: undefined, category: "clothing" })).toEqual({
      category: "clothing",
    });
  });

  it("strips empty-string values", () => {
    expect(sanitizeRawDelta({ brand: "", category: "clothing" })).toEqual({
      category: "clothing",
    });
  });

  it("leaves non-object input untouched for the schema to reject", () => {
    expect(sanitizeRawDelta(["clothing"])).toEqual(["clothing"]);
    expect(sanitizeRawDelta(null)).toBeNull();
    expect(sanitizeRawDelta("clothing")).toBe("clothing");
  });
});
