const SELLER_ID_KEY = "seller-agent:seller-id";

/**
 * Authentication is intentionally deferred for this slice, so each browser
 * gets a stable, locally-generated seller identifier instead.
 */
export function getOrCreateSellerId(): string {
  const existing = window.localStorage.getItem(SELLER_ID_KEY);
  if (existing) return existing;

  const created = crypto.randomUUID();
  window.localStorage.setItem(SELLER_ID_KEY, created);
  return created;
}
