import { describe, expect, it } from "vitest";
import { keywordItemAttributeExtractor } from "./keywordExtractor.js";

describe("keywordItemAttributeExtractor", () => {
  it("detects category from a clothing keyword", async () => {
    const patch = await keywordItemAttributeExtractor.extract({
      latestMessage: "I want to sell a black jacket",
      currentAttributes: {},
      recentMessages: [],
    });
    expect(patch).toMatchObject({ category: "clothing" });
  });

  it("detects condition, size, and brand keywords in the same message", async () => {
    const patch = await keywordItemAttributeExtractor.extract({
      latestMessage: "It's a Nike hoodie, size M, in good condition",
      currentAttributes: {},
      recentMessages: [],
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
      latestMessage: "barely worn, like new condition",
      currentAttributes: {},
      recentMessages: [],
    });
    expect(patch).toMatchObject({ condition: "like_new" });
  });

  it("returns an empty patch when nothing recognizable is present", async () => {
    const patch = await keywordItemAttributeExtractor.extract({
      latestMessage: "hello there",
      currentAttributes: {},
      recentMessages: [],
    });
    expect(patch).toEqual({});
  });

  it("does not false-positive match single-letter size tokens inside other words", async () => {
    const patch = await keywordItemAttributeExtractor.extract({
      latestMessage: "selling a used sweater",
      currentAttributes: {},
      recentMessages: [],
    });
    expect(patch.size).toBeUndefined();
  });

  it("is not case sensitive", async () => {
    const patch = await keywordItemAttributeExtractor.extract({
      latestMessage: "SELLING A NIKE JACKET, SIZE L",
      currentAttributes: {},
      recentMessages: [],
    });
    expect(patch).toMatchObject({ category: "clothing", brand: "nike", size: "L" });
  });
});
