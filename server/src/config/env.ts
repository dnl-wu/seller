import "dotenv/config";
import { z } from "zod";

const DEFAULT_LLM_TIMEOUT_MS = 15_000;

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  ATTRIBUTE_EXTRACTOR: z.enum(["keyword", "llm"]).default("keyword"),
  LISTING_GENERATOR: z.enum(["template", "llm"]).default("template"),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  AZURE_OPENAI_API_KEY: z.string().optional(),
  AZURE_OPENAI_ENDPOINT: z.string().optional(),
  AZURE_OPENAI_DEPLOYMENT: z.string().optional(),
  AZURE_OPENAI_API_VERSION: z.string().default("2024-10-21"),
  AZURE_OPENAI_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;
const llmApiKey = data.LLM_API_KEY ?? data.AZURE_OPENAI_API_KEY ?? "";
const llmModel = data.LLM_MODEL ?? data.AZURE_OPENAI_DEPLOYMENT ?? "";
const llmTimeoutMs =
  data.LLM_TIMEOUT_MS ?? data.AZURE_OPENAI_TIMEOUT_MS ?? DEFAULT_LLM_TIMEOUT_MS;
const usesLlm = data.ATTRIBUTE_EXTRACTOR === "llm" || data.LISTING_GENERATOR === "llm";

if (usesLlm) {
  const missing: string[] = [];
  if (!llmApiKey) missing.push("LLM_API_KEY or AZURE_OPENAI_API_KEY");
  if (!llmModel) missing.push("LLM_MODEL or AZURE_OPENAI_DEPLOYMENT");
  if (!data.AZURE_OPENAI_ENDPOINT) missing.push("AZURE_OPENAI_ENDPOINT");

  if (missing.length > 0) {
    console.error(`LLM provider configuration is incomplete. Missing: ${missing.join(", ")}`);
    process.exit(1);
  }
}

export const env = {
  port: data.PORT,
  mongoUri: data.MONGODB_URI,
  attributeExtractor: data.ATTRIBUTE_EXTRACTOR,
  listingGenerator: data.LISTING_GENERATOR,
  llm: {
    apiKey: llmApiKey,
    model: llmModel,
    timeoutMs: llmTimeoutMs,
    isConfigured: Boolean(llmApiKey && llmModel && data.AZURE_OPENAI_ENDPOINT),
  },
  azureOpenAi: {
    apiKey: llmApiKey,
    endpoint: data.AZURE_OPENAI_ENDPOINT ?? "",
    deployment: llmModel,
    apiVersion: data.AZURE_OPENAI_API_VERSION,
    timeoutMs: llmTimeoutMs,
  },
};
