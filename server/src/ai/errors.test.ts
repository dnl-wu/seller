import { describe, expect, it } from "vitest";
import { AiError, classifyAiProviderError } from "./errors.js";

describe("classifyAiProviderError", () => {
  it("preserves existing AiError codes", () => {
    expect(classifyAiProviderError(new AiError("AI_MISCONFIGURED", "bad config"))).toBe(
      "AI_MISCONFIGURED",
    );
  });

  it("classifies timeouts", () => {
    expect(classifyAiProviderError(new Error("request timed out"))).toBe("AI_TIMEOUT");
    expect(classifyAiProviderError({ code: "ETIMEDOUT" })).toBe("AI_TIMEOUT");
  });

  it("classifies rate limits", () => {
    expect(classifyAiProviderError({ status: 429 })).toBe("AI_RATE_LIMITED");
  });

  it("classifies temporary provider failures", () => {
    expect(classifyAiProviderError({ status: 503 })).toBe("AI_UNAVAILABLE");
    expect(classifyAiProviderError({ code: "ECONNRESET" })).toBe("AI_UNAVAILABLE");
  });

  it("falls back to unknown for unrecognized failures", () => {
    expect(classifyAiProviderError(new Error("surprise"))).toBe("AI_UNKNOWN");
  });
});
