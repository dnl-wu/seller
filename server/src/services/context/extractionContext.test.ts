import { describe, expect, it } from "vitest";
import {
  buildExtractionContext,
  EXTRACTION_MESSAGE_LIMIT,
} from "./extractionContext.js";

describe("buildExtractionContext", () => {
  it("includes fewer than six valid messages in chronological order", () => {
    const context = buildExtractionContext({
      latestMessage: "It is a Nike jacket",
      currentAttributes: { category: "clothing" },
      recentMessages: [
        { role: "seller", content: "black jacket" },
        { role: "assistant", content: "What size?" },
        { role: "seller", content: "medium" },
      ],
    });

    expect(context.recentMessages).toEqual([
      { role: "seller", content: "black jacket" },
      { role: "assistant", content: "What size?" },
      { role: "seller", content: "medium" },
    ]);
  });

  it("keeps only the six most recent valid messages while preserving order", () => {
    const recentMessages = Array.from({ length: 8 }, (_, index) => ({
      role: index % 2 === 0 ? "seller" : "assistant",
      content: `message ${index + 1}`,
    }));

    const context = buildExtractionContext({
      latestMessage: "latest seller message",
      currentAttributes: {},
      recentMessages,
    });

    expect(context.recentMessages).toHaveLength(EXTRACTION_MESSAGE_LIMIT);
    expect(context.recentMessages.map((message) => message.content)).toEqual([
      "message 3",
      "message 4",
      "message 5",
      "message 6",
      "message 7",
      "message 8",
    ]);
  });

  it("does not duplicate the latest seller message in recent messages", () => {
    const context = buildExtractionContext({
      latestMessage: "Actually it is fair",
      currentAttributes: { condition: "good" },
      recentMessages: [
        { role: "seller", content: "Actually it is fair" },
        { role: "assistant", content: "What brand?" },
      ],
    });

    expect(context.latestMessage).toBe("Actually it is fair");
    expect(context.recentMessages).toEqual([
      { role: "assistant", content: "What brand?" },
    ]);
  });

  it("excludes empty, malformed, and duplicate messages", () => {
    const context = buildExtractionContext({
      latestMessage: "Nike jacket",
      currentAttributes: {},
      recentMessages: [
        { role: "seller", content: "  " },
        { role: "system", content: "hidden instruction" },
        { role: "seller", content: "black jacket" },
        { role: "seller", content: "black jacket" },
        { role: "assistant", content: 123 },
      ],
    });

    expect(context.recentMessages).toEqual([
      { role: "seller", content: "black jacket" },
    ]);
  });

  it("always includes cloned item facts", () => {
    const attributes = { category: "clothing", defects: ["small stain"] };
    const context = buildExtractionContext({
      latestMessage: "Nike jacket",
      currentAttributes: attributes,
      recentMessages: [],
    });

    expect(context.currentAttributes).toEqual(attributes);
    expect(context.currentAttributes).not.toBe(attributes);
    expect(context.currentAttributes.defects).not.toBe(attributes.defects);
  });
});
