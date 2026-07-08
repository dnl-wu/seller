import { describe, expect, it } from "vitest";
import {
  CLOTHING_REQUIRED_FIELDS,
  computeMissingFields,
  pickNextMissingField,
  questionForField,
  canTransition,
  assertTransition,
} from "./conversationFsm.js";

describe("computeMissingFields", () => {
  it("returns all required fields when attributes are empty", () => {
    expect(computeMissingFields({})).toEqual(CLOTHING_REQUIRED_FIELDS);
  });

  it("returns only the fields that are still unset", () => {
    expect(computeMissingFields({ category: "clothing", size: "M" })).toEqual([
      "condition",
      "brand",
    ]);
  });

  it("returns an empty list once every required field is set", () => {
    expect(
      computeMissingFields({
        category: "clothing",
        condition: "good",
        size: "M",
        brand: "nike",
      }),
    ).toEqual([]);
  });
});

describe("pickNextMissingField", () => {
  it("follows the fixed priority order regardless of the missing-fields array order", () => {
    expect(pickNextMissingField(["brand", "condition"])).toBe("condition");
    expect(pickNextMissingField(["brand"])).toBe("brand");
    expect(pickNextMissingField(["brand", "size", "category"])).toBe("category");
  });

  it("returns undefined when nothing is missing", () => {
    expect(pickNextMissingField([])).toBeUndefined();
  });
});

describe("questionForField", () => {
  it("returns the fixed template for each required field", () => {
    expect(questionForField("category")).toMatch(/type of clothing/i);
    expect(questionForField("condition")).toMatch(/condition/i);
    expect(questionForField("size")).toMatch(/size/i);
    expect(questionForField("brand")).toMatch(/brand/i);
  });

  it("throws for a field with no template", () => {
    expect(() => questionForField("notes")).toThrow(/no question template/i);
  });
});

describe("state transitions", () => {
  it("allows the defined forward transitions", () => {
    expect(canTransition("collecting", "ready_to_generate")).toBe(true);
    expect(canTransition("ready_to_generate", "generating")).toBe(true);
    expect(canTransition("generating", "draft_ready")).toBe(true);
    expect(canTransition("draft_ready", "approved")).toBe(true);
  });

  it("treats staying in the same state as always valid", () => {
    expect(canTransition("collecting", "collecting")).toBe(true);
    expect(canTransition("approved", "approved")).toBe(true);
  });

  it("rejects transitions that skip or reverse the workflow", () => {
    expect(canTransition("collecting", "approved")).toBe(false);
    expect(canTransition("approved", "collecting")).toBe(false);
    expect(canTransition("draft_ready", "collecting")).toBe(false);
    expect(canTransition("approved", "draft_ready")).toBe(false);
  });

  it("allows the generating -> ready_to_generate recovery transition for failed listing generation", () => {
    expect(canTransition("generating", "ready_to_generate")).toBe(true);
    expect(() => assertTransition("generating", "ready_to_generate")).not.toThrow();
  });

  it("throws for invalid transitions and is silent for valid ones", () => {
    expect(() => assertTransition("collecting", "ready_to_generate")).not.toThrow();
    expect(() => assertTransition("approved", "collecting")).toThrow(
      /invalid conversation state transition/i,
    );
  });
});
