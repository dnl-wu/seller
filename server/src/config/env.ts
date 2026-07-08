import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  ATTRIBUTE_EXTRACTOR: z.enum(["keyword", "llm"]).default("keyword"),
  LISTING_GENERATOR: z.enum(["template", "llm"]).default("template"),
  AZURE_OPENAI_API_KEY: z.string().default(""),
  AZURE_OPENAI_ENDPOINT: z.string().default(""),
  AZURE_OPENAI_DEPLOYMENT: z.string().default(""),
  AZURE_OPENAI_API_VERSION: z.string().default("2024-10-21"),
  AZURE_OPENAI_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;

// Fail fast if either the extractor or the listing generator is configured
// to call Azure OpenAI but the credentials needed to do so are missing.
if (data.ATTRIBUTE_EXTRACTOR === "llm" || data.LISTING_GENERATOR === "llm") {
  const required = {
    AZURE_OPENAI_API_KEY: data.AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_ENDPOINT: data.AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_DEPLOYMENT: data.AZURE_OPENAI_DEPLOYMENT,
  };
  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error(
      `ATTRIBUTE_EXTRACTOR=llm or LISTING_GENERATOR=llm requires: ${missing.join(", ")}`,
    );
    process.exit(1);
  }
}

export const env = {
  port: data.PORT,
  mongoUri: data.MONGODB_URI,
  attributeExtractor: data.ATTRIBUTE_EXTRACTOR,
  listingGenerator: data.LISTING_GENERATOR,
  azureOpenAi: {
    apiKey: data.AZURE_OPENAI_API_KEY,
    endpoint: data.AZURE_OPENAI_ENDPOINT,
    deployment: data.AZURE_OPENAI_DEPLOYMENT,
    apiVersion: data.AZURE_OPENAI_API_VERSION,
    timeoutMs: data.AZURE_OPENAI_TIMEOUT_MS,
  },
};
