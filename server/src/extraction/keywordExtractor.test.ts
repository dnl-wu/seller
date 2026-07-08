import { describe, expect, it } from "vitest";
import { keywordItemAttributeExtractor } from "./keywordExtractor.js";

describe("keywordItemAttributeExtractor", () => {
  it("detects category from a clothing keyword", async () => {
    const patch = await keywordItemAttributeExtractor.extract({
      message: "I want to sell a black jacket",
      currentAttributes: {},
    });
    expect(patch).toMatchObject({ category: "clothing" });
  });

  it("detects condition, size, and brand keywords in the same message", async () => {
    const patch = await keywordItemAttributeExtractor.extract({
      message: "It's a Nike hoodie, size M, in good condition",
      currentAttributes: {},
    });
    expect(patch).toMatchObject({
      category: "clothing",
      brand: "nike",
      size: "M",
      condition: "good",
    });
  });

  it("prefers 'like new' over the substring 'new'", async () => {
    const patch = await keywordItemAttributeExtractor.extract({
      message: "barely worn, like new condition",
      currentAttributes: {},
    });
    expect(patch).toMatchObject({ condition: "like_new" });
  });

  it("returns an empty patch when nothing recognizable is present", async () => {
    const patch = await keywordItemAttributeExtractor.extract({
      message: "hello there",
      currentAttributes: {},
    });
    expect(patch).toEqual({});
  });

  it("does not false-positive match single-letter size tokens inside other words", async () => {
    const patch = await keywordItemAttributeExtractor.extract({
      message: "selling a used sweater",
      currentAttributes: {},
    });
    expect(patch.size).toBeUndefined();
  });

  it("is not case sensitive", async () => {
    const patch = await keywordItemAttributeExtractor.extract({
      message: "SELLING A NIKE JACKET, SIZE L",
      currentAttributes: {},
    });
    expect(patch).toMatchObject({ category: "clothing", brand: "nike", size: "L" });
  });
});
