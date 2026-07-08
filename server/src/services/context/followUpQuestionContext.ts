import type { ItemAttributes, ToneOfVoice } from "@seller/shared";
import type { FollowUpQuestionContext } from "./context.types.js";

export function buildFollowUpQuestionContext(input: {
  missingFields: string[];
  currentAttributes: ItemAttributes;
  toneOfVoice?: ToneOfVoice;
}): FollowUpQuestionContext {
  return {
    missingFields: [...input.missingFields],
    currentAttributes: {
      ...input.currentAttributes,
      ...(input.currentAttributes.defects ? { defects: [...input.currentAttributes.defects] } : {}),
    },
    ...(input.toneOfVoice ? { toneOfVoice: input.toneOfVoice } : {}),
  };
}
