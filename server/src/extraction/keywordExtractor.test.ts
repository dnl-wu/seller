import { describe, expect, it } from "vitest";
import { keywordItemAttributeExtractor } from "./keywordExtractor.js";

describe("keywordItemAttributeExtractor", () => {
  it("detects category from a clothing keyword", () => {
    expect(
      keywordItemAttributeExtractor.extract("I want to sell a black jacket", {}),
    ).toMatchObject({ category: "clothing" });
  });

  it("detects condition, size, and brand keywords in the same message", () => {
    expect(
      keywordItemAttributeExtractor.extract(
        "It's a Nike hoodie, size M, in good condition",
        {},
      ),
    ).toMatchObject({
      category: "clothing",
      brand: "nike",
      size: "M",
      condition: "good",
    });
  });

  it("prefers 'like new' over the substring 'new'", () => {
    expect(
      keywordItemAttributeExtractor.extract("barely worn, like new condition", {}),
    ).toMatchObject({ condition: "like_new" });
  });

  it("returns an empty patch when nothing recognizable is present", () => {
    expect(keywordItemAttributeExtractor.extract("hello there", {})).toEqual({});
  });

  it("does not false-positive match single-letter size tokens inside other words", () => {
    const patch = keywordItemAttributeExtractor.extract("selling a used sweater", {});
    expect(patch.size).toBeUndefined();
  });

  it("is not case sensitive", () => {
    expect(
      keywordItemAttributeExtractor.extract("SELLING A NIKE JACKET, SIZE L", {}),
    ).toMatchObject({ category: "clothing", brand: "nike", size: "L" });
  });
});
