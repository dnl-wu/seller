import {
  GetSellerPreferencesResponseSchema,
  UpdateSellerPreferencesRequestSchema,
  type GetSellerPreferencesResponse,
  type UpdateSellerPreferencesRequest,
} from "@seller/shared";
import { ApiError } from "./conversations.js";
import type { ZodType } from "zod";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

interface ErrorBody {
  error?: string;
}

function readErrorMessage(body: unknown): string | undefined {
  if (body && typeof body === "object" && "error" in body) {
    const value = (body as ErrorBody).error;
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

async function request<T>(
  path: string,
  init: RequestInit,
  schema: ZodType<T>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    throw new ApiError("The server is unreachable.", 0, "network_error");
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new ApiError(
      readErrorMessage(body) ?? "The server returned an error.",
      response.status,
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      "The server returned an unexpected response.",
      response.status,
      "invalid_response",
    );
  }

  return parsed.data;
}

export function getSellerPreferences(
  sellerId: string,
): Promise<GetSellerPreferencesResponse> {
  return request(
    `/api/sellers/${encodeURIComponent(sellerId)}/preferences`,
    { method: "GET" },
    GetSellerPreferencesResponseSchema,
  );
}

export function updateSellerPreferences(
  sellerId: string,
  input: UpdateSellerPreferencesRequest,
): Promise<GetSellerPreferencesResponse> {
  const payload = UpdateSellerPreferencesRequestSchema.parse(input);
  return request(
    `/api/sellers/${encodeURIComponent(sellerId)}/preferences`,
    { method: "PATCH", body: JSON.stringify(payload) },
    GetSellerPreferencesResponseSchema,
  );
}
