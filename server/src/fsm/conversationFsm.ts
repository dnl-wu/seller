import type { ConversationState, ItemAttributes } from "@seller/shared";

/**
 * Required fields for the one supported category in this temporary,
 * non-AI flow. Priority order doubles as the fixed order in which the
 * assistant asks about missing fields.
 */
export const CLOTHING_REQUIRED_FIELDS: readonly (keyof ItemAttributes)[] = [
  "category",
  "condition",
  "size",
  "brand",
];

const QUESTION_TEMPLATES: Partial<Record<keyof ItemAttributes, string>> = {
  category: "What type of clothing item are you selling?",
  condition: "What condition is the item in?",
  size: "What size is the item?",
  brand: "What brand is the item?",
};

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

export function computeMissingFields(
  attributes: ItemAttributes,
  requiredFields: readonly (keyof ItemAttributes)[] = CLOTHING_REQUIRED_FIELDS,
): (keyof ItemAttributes)[] {
  return requiredFields.filter((field) => isBlank(attributes[field]));
}

export function pickNextMissingField(
  missingFields: readonly (keyof ItemAttributes)[],
  priorityOrder: readonly (keyof ItemAttributes)[] = CLOTHING_REQUIRED_FIELDS,
): (keyof ItemAttributes) | undefined {
  return priorityOrder.find((field) => missingFields.includes(field));
}

export function questionForField(field: keyof ItemAttributes): string {
  const question = QUESTION_TEMPLATES[field];
  if (!question) {
    throw new Error(`No question template for field: ${String(field)}`);
  }
  return question;
}

const VALID_TRANSITIONS: Record<ConversationState, readonly ConversationState[]> = {
  collecting: ["ready_to_generate"],
  ready_to_generate: ["generating"],
  // `generating -> ready_to_generate` is a recovery transition, not a
  // forward step: if listing generation fails (provider error or output
  // that fails validation), the conversation falls back to its direct
  // predecessor state so a retry is possible, instead of being stuck in
  // `generating` forever or forced into `draft_ready` with no listing.
  generating: ["draft_ready", "ready_to_generate"],
  draft_ready: ["approved"],
  approved: [],
};

export function canTransition(
  from: ConversationState,
  to: ConversationState,
): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS[from].includes(to);
}

export function assertTransition(
  from: ConversationState,
  to: ConversationState,
): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid conversation state transition: ${from} -> ${to}`);
  }
}
