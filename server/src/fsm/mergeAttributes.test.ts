import { describe, expect, it } from "vitest";
import type { ItemAttributes } from "@seller/shared";
import { mergeAttributes } from "./mergeAttributes.js";

describe("mergeAttributes", () => {
  it("adds new attribute values from the patch", () => {
    expect(mergeAttributes({}, { category: "clothing" })).toEqual({
      category: "clothing",
    });
  });

  it("does not let undefined patch values overwrite known attributes", () => {
    const current: ItemAttributes = { category: "clothing", brand: "nike" };
    // `brand: undefined` here simulates an extractor that didn't find a
    // value for a field it already knows about.
    expect(mergeAttributes(current, { brand: undefined })).toEqual(current);
  });

  it("does not let null patch values overwrite known attributes", () => {
    const current: ItemAttributes = { category: "clothing", brand: "nike" };
    // Cast to simulate defensive handling of untrusted/loosely-typed data,
    // since ItemAttributes itself never declares `null` as a valid value.
    const patch = { brand: null } as unknown as ItemAttributes;
    expect(mergeAttributes(current, patch)).toEqual(current);
  });

  it("does not let empty-string patch values overwrite known attributes", () => {
    const current: ItemAttributes = { category: "clothing", brand: "Sony" };
    expect(mergeAttributes(current, { brand: "" })).toEqual(current);
  });

  it("overwrites a known attribute when the patch provides a new non-null value", () => {
    const current: ItemAttributes = { size: "M" };
    expect(mergeAttributes(current, { size: "L" })).toEqual({ size: "L" });
  });

  it("applies explicit corrections to existing values", () => {
    const current: ItemAttributes = { condition: "good" };
    expect(mergeAttributes(current, { condition: "fair" })).toEqual({ condition: "fair" });
  });

  it("replaces arrays when the patch provides a new array", () => {
    const current: ItemAttributes = { defects: ["small stain"] };
    expect(mergeAttributes(current, { defects: ["missing button"] })).toEqual({
      defects: ["missing button"],
    });
  });

  it("leaves attributes not present in the patch untouched", () => {
    const current: ItemAttributes = { category: "clothing", brand: "nike" };
    expect(mergeAttributes(current, { size: "L" })).toEqual({
      category: "clothing",
      brand: "nike",
      size: "L",
    });
  });
});
