import { AzureOpenAI } from "openai";
import { env } from "../config/env.js";
import type { LlmCompletionRequest, LlmProvider } from "./llmProvider.js";

/**
 * Only instantiated when ATTRIBUTE_EXTRACTOR=llm or LISTING_GENERATOR=llm,
 * at which point env.ts has already guaranteed the AZURE_OPENAI_* values
 * are non-empty (it exits at startup otherwise), so no further presence
 * checks are needed here.
 */
export class AzureOpenAiProvider implements LlmProvider {
  private readonly client: AzureOpenAI;

  constructor() {
    this.client = new AzureOpenAI({
      apiKey: env.azureOpenAi.apiKey,
      endpoint: env.azureOpenAi.endpoint,
      apiVersion: env.azureOpenAi.apiVersion,
      deployment: env.azureOpenAi.deployment,
    });
  }

  async complete({ system, user }: LlmCompletionRequest): Promise<string> {
    const response = await this.client.chat.completions.create(
      {
        model: env.azureOpenAi.deployment,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      },
      { timeout: env.azureOpenAi.timeoutMs },
    );

    return response.choices[0]?.message?.content ?? "";
  }
}
