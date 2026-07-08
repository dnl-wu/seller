import type { ApiErrorCode } from "@seller/shared";

export class ConcurrencyConflictError extends Error {
  constructor(
    public readonly code: ApiErrorCode = "CONCURRENCY_CONFLICT",
    message = "The resource changed before this update could be applied.",
  ) {
    super(message);
    this.name = "ConcurrencyConflictError";
  }
}

export function versionPredicate(expectedVersion: number) {
  if (expectedVersion === 0) {
    return { $or: [{ version: 0 }, { version: { $exists: false } }] };
  }
  return { version: expectedVersion };
}

export function readVersion(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}
