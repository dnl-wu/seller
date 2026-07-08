import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? "",
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
};
