export const AI_ERROR_CODES = [
  "AI_TIMEOUT",
  "AI_RATE_LIMITED",
  "AI_INVALID_RESPONSE",
  "AI_UNAVAILABLE",
  "AI_MISCONFIGURED",
  "AI_UNKNOWN",
] as const;

export type AiErrorCode = (typeof AI_ERROR_CODES)[number];

export class AiError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "AiError";
  }
}

function readProviderStatus(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const status = (err as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

function readProviderCode(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

export function classifyAiProviderError(err: unknown): AiErrorCode {
  if (err instanceof AiError) return err.code;

  const status = readProviderStatus(err);
  if (status === 429) return "AI_RATE_LIMITED";
  if (status && status >= 500) return "AI_UNAVAILABLE";

  const code = readProviderCode(err)?.toUpperCase();
  if (code === "ETIMEDOUT" || code === "ECONNABORTED" || code === "ABORT_ERR") {
    return "AI_TIMEOUT";
  }
  if (code === "ECONNRESET" || code === "ENOTFOUND" || code === "ECONNREFUSED") {
    return "AI_UNAVAILABLE";
  }

  const message = err instanceof Error ? err.message.toLowerCase() : "";
  if (message.includes("timeout") || message.includes("timed out")) {
    return "AI_TIMEOUT";
  }
  if (message.includes("rate limit") || message.includes("too many requests")) {
    return "AI_RATE_LIMITED";
  }
  if (message.includes("api key") || message.includes("misconfigured")) {
    return "AI_MISCONFIGURED";
  }

  return "AI_UNKNOWN";
}
