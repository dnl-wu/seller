import { ItemAttributesSchema } from "@seller/shared";
import type { LlmCompletionRequest } from "./llmProvider.js";
import type { ExtractionContext } from "../services/context/context.types.js";

export const EXTRACTION_PROMPT_VERSION = "extract-v1";

const SUPPORTED_FIELDS = Object.keys(ItemAttributesSchema.shape);

export function buildExtractionPrompt(context: ExtractionContext): LlmCompletionRequest {
  const system = [
    `Prompt version: ${EXTRACTION_PROMPT_VERSION}.`,
    "You extract structured resale-item attributes from a seller's latest chat message.",
    `Only return JSON with a subset of these fields: ${SUPPORTED_FIELDS.join(", ")}.`,
    "Extract only facts directly supported by seller input.",
    "Existing structured attributes are authoritative.",
    "Only return proposed changes.",
    "Do not overwrite known values unless the seller explicitly corrects them.",
    "Do not invent specifications from general product knowledge.",
    "Unknown facts must remain absent.",
    "Do not return workflow states.",
    "Do not decide the next question.",
    "Return structured output matching the required schema.",
    "Respond with a single JSON object and nothing else.",
  ].join(" ");

  const userLines: string[] = [];
  if (context.recentMessages.length > 0) {
    userLines.push("Bounded recent conversation context:");
    for (const entry of context.recentMessages) {
      userLines.push(`${entry.role}: ${entry.content}`);
    }
  }
  userLines.push("Existing structured attributes:");
  userLines.push(JSON.stringify(context.currentAttributes));
  userLines.push("Latest seller message:");
  userLines.push(context.latestMessage);

  return { system, user: userLines.join("\n") };
}
