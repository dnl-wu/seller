import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeneratedListing, ItemAttributes } from "@seller/shared";
import { ExtractionProviderError, ExtractionValidationError } from "../extraction/errors.js";
import type { ItemAttributeExtractor } from "../extraction/types.js";
import type { ListingGenerator } from "../listing/types.js";

vi.mock("../models/Conversation.js", () => ({
  createConversation: vi.fn(),
  findConversationById: vi.fn(),
  updateConversationState: vi.fn(),
}));
vi.mock("../models/Message.js", () => ({
  createMessage: vi.fn(),
  findMessageByClientId: vi.fn(),
  findMessagesByConversation: vi.fn(),
  findRecentMessages: vi.fn(),
  findLatestAssistantMessage: vi.fn(),
}));
vi.mock("../models/ItemDraft.js", () => ({
  createItemDraft: vi.fn(),
  findItemDraftByConversation: vi.fn(),
  updateItemDraft: vi.fn(),
}));
vi.mock("../models/ListingDraft.js", () => ({
  createListingDraft: vi.fn(),
  findListingDraftByConversation: vi.fn(),
}));

import {
  createConversation as createConversationDoc,
  findConversationById,
  updateConversationState,
} from "../models/Conversation.js";
import {
  createMessage,
  findMessageByClientId,
  findMessagesByConversation,
  findRecentMessages,
  findLatestAssistantMessage,
} from "../models/Message.js";
import {
  createItemDraft,
  findItemDraftByConversation,
  updateItemDraft,
} from "../models/ItemDraft.js";
import { createListingDraft, findListingDraftByConversation } from "../models/ListingDraft.js";
import {
  createConversation,
  getConversationById,
  postSellerMessage,
} from "./conversationService.js";

function makeConversationDoc(overrides: {
  id?: string;
  sellerId?: string;
  state?: "collecting" | "ready_to_generate" | "generating" | "draft_ready" | "approved";
} = {}) {
  const doc = {
    _id: { toString: () => overrides.id ?? "conv1" },
    sellerId: overrides.sellerId ?? "demo-seller",
    state: overrides.state ?? "collecting",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  };
  return doc as unknown as Awaited<ReturnType<typeof findConversationById>> & {
    state: string;
  };
}

function makeItemDraftDoc(overrides: {
  id?: string;
  conversationId?: string;
  attributes?: ItemAttributes;
  missingFields?: string[];
} = {}) {
  const doc = {
    _id: { toString: () => overrides.id ?? "draft1" },
    conversationId: { toString: () => overrides.conversationId ?? "conv1" },
    attributes: overrides.attributes ?? {},
    missingFields: overrides.missingFields ?? ["category", "condition", "size", "brand"],
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  };
  return doc as unknown as Awaited<ReturnType<typeof findItemDraftByConversation>>;
}

function makeMessageDoc(overrides: {
  id?: string;
  conversationId?: string;
  role?: "seller" | "assistant";
  content?: string;
  clientMessageId?: string;
} = {}) {
  const doc = {
    _id: { toString: () => overrides.id ?? "msg1" },
    conversationId: { toString: () => overrides.conversationId ?? "conv1" },
    role: overrides.role ?? "seller",
    content: overrides.content ?? "hello",
    clientMessageId: overrides.clientMessageId ?? "client-1",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
  };
  return doc as unknown as Awaited<ReturnType<typeof findMessageByClientId>>;
}

function makeListingDraftDoc(overrides: {
  id?: string;
  conversationId?: string;
  itemDraftId?: string;
  title?: string;
  description?: string;
  suggestedPrice?: number;
  currency?: "CAD" | "USD";
} = {}) {
  const doc = {
    _id: { toString: () => overrides.id ?? "listing1" },
    conversationId: { toString: () => overrides.conversationId ?? "conv1" },
    itemDraftId: { toString: () => overrides.itemDraftId ?? "draft1" },
    title: overrides.title ?? "Nike Jacket",
    description: overrides.description ?? "A Nike jacket in good condition.",
    suggestedPrice: overrides.suggestedPrice ?? 40,
    currency: overrides.currency ?? "CAD",
    status: "generated" as const,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  };
  return doc as unknown as Awaited<ReturnType<typeof findListingDraftByConversation>>;
}

function fakeExtractor(extract: ItemAttributeExtractor["extract"]): ItemAttributeExtractor {
  return { extract };
}

function fakeListingGenerator(generate: ListingGenerator["generate"]): ListingGenerator {
  return { generate };
}

const VALID_GENERATED_LISTING: GeneratedListing = {
  title: "Nike Jacket",
  description: "A Nike jacket in good condition.",
  suggestedPrice: 40,
  currency: "CAD",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findRecentMessages).mockResolvedValue([]);
  vi.mocked(findListingDraftByConversation).mockResolvedValue(null);
  vi.mocked(createMessage).mockImplementation(async (input) =>
    makeMessageDoc({
      role: input.role,
      content: input.content,
      clientMessageId: input.clientMessageId,
      conversationId: input.conversationId,
    })!,
  );
  vi.mocked(updateItemDraft).mockImplementation(async (_draft, attributes, missingFields) =>
    makeItemDraftDoc({ attributes, missingFields })!,
  );
  vi.mocked(createListingDraft).mockImplementation(async (conversationId, itemDraftId, listing) =>
    makeListingDraftDoc({ conversationId, itemDraftId, ...listing })!,
  );
});

describe("createConversation", () => {
  it("creates a conversation in collecting state with an empty item draft", async () => {
    const conversationDoc = makeConversationDoc();
    const itemDraftDoc = makeItemDraftDoc();
    vi.mocked(createConversationDoc).mockResolvedValue(conversationDoc);
    vi.mocked(createItemDraft).mockResolvedValue(itemDraftDoc!);

    const result = await createConversation("demo-seller");

    expect(createConversationDoc).toHaveBeenCalledWith("demo-seller");
    expect(createItemDraft).toHaveBeenCalledWith(
      "conv1",
      {},
      expect.arrayContaining(["category", "condition", "size", "brand"]),
    );
    expect(result.conversation.state).toBe("collecting");
    expect(result.itemDraft).toBe(itemDraftDoc);
  });
});

describe("getConversationById", () => {
  it("returns null when the conversation does not exist", async () => {
    vi.mocked(findConversationById).mockResolvedValue(null);

    const result = await getConversationById("missing");

    expect(result).toBeNull();
  });

  it("returns the conversation, item draft, and messages in chronological order", async () => {
    const conversationDoc = makeConversationDoc();
    const itemDraftDoc = makeItemDraftDoc();
    const messages = [
      makeMessageDoc({ id: "m1", role: "seller", content: "black jacket" }),
      makeMessageDoc({ id: "m2", role: "assistant", content: "What size?" }),
    ];
    vi.mocked(findConversationById).mockResolvedValue(conversationDoc);
    vi.mocked(findItemDraftByConversation).mockResolvedValue(itemDraftDoc!);
    vi.mocked(findMessagesByConversation).mockResolvedValue(messages as never);

    const result = await getConversationById("conv1");

    expect(result?.conversation).toBe(conversationDoc);
    expect(result?.itemDraft).toBe(itemDraftDoc);
    expect(result?.messages).toEqual(messages);
    expect(result?.listingDraft).toBeNull();
  });

  it("includes the listing draft when one exists", async () => {
    const conversationDoc = makeConversationDoc({ state: "draft_ready" });
    const itemDraftDoc = makeItemDraftDoc({ missingFields: [] });
    const listingDraftDoc = makeListingDraftDoc();

    vi.mocked(findConversationById).mockResolvedValue(conversationDoc);
    vi.mocked(findItemDraftByConversation).mockResolvedValue(itemDraftDoc!);
    vi.mocked(findMessagesByConversation).mockResolvedValue([] as never);
    vi.mocked(findListingDraftByConversation).mockResolvedValue(listingDraftDoc!);

    const result = await getConversationById("conv1");

    expect(result?.listingDraft).toBe(listingDraftDoc);
  });
});

describe("postSellerMessage", () => {
  it("returns not_found when the conversation does not exist", async () => {
    vi.mocked(findConversationById).mockResolvedValue(null);

    const result = await postSellerMessage("missing", "hello", "client-1");

    expect(result.kind).toBe("not_found");
    expect(createMessage).not.toHaveBeenCalled();
  });

  it("stores the seller message and asks about the next missing field for partial info", async () => {
    const conversationDoc = makeConversationDoc();
    const itemDraftDoc = makeItemDraftDoc({
      attributes: {},
      missingFields: ["category", "condition", "size", "brand"],
    });
    vi.mocked(findConversationById).mockResolvedValue(conversationDoc);
    vi.mocked(findMessageByClientId).mockResolvedValue(null);
    vi.mocked(findItemDraftByConversation).mockResolvedValue(itemDraftDoc!);

    const extractor = fakeExtractor(async () => ({ category: "clothing" }));

    const result = await postSellerMessage(
      "conv1",
      "I want to sell a black jacket",
      "client-1",
      extractor,
    );

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok result");
    expect(result.itemDraft.missingFields).toEqual(["condition", "size", "brand"]);
    expect(result.assistantMessage.content).toMatch(/condition/i);
    expect(result.listingDraft).toBeNull();
    expect(updateConversationState).not.toHaveBeenCalled();
  });

  it("generates and persists a listing draft once all required fields are present", async () => {
    const conversationDoc = makeConversationDoc();
    const itemDraftDoc = makeItemDraftDoc({
      attributes: { category: "clothing", condition: "good", size: "M" },
      missingFields: ["brand"],
    });

    vi.mocked(findConversationById).mockResolvedValue(conversationDoc);
    vi.mocked(findMessageByClientId).mockResolvedValue(null);
    vi.mocked(findItemDraftByConversation).mockResolvedValue(itemDraftDoc!);
    vi.mocked(updateConversationState).mockImplementation(async (conv, state) =>
      makeConversationDoc({ id: conv._id.toString(), state }),
    );

    const extractor = fakeExtractor(async () => ({ brand: "nike" }));
    const listingGenerator = fakeListingGenerator(async () => VALID_GENERATED_LISTING);

    const result = await postSellerMessage(
      "conv1",
      "It's a Nike jacket",
      "client-2",
      extractor,
      listingGenerator,
    );

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok result");
    expect(updateConversationState).toHaveBeenNthCalledWith(1, conversationDoc, "ready_to_generate");
    expect(updateConversationState).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ state: "ready_to_generate" }),
      "generating",
    );
    expect(updateConversationState).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ state: "generating" }),
      "draft_ready",
    );
    expect(result.conversation.state).toBe("draft_ready");
    expect(result.listingDraft).not.toBeNull();
    expect(result.listingDraft?.title).toBe("Nike Jacket");
    expect(result.assistantMessage.content).toMatch(/ready/i);
  });

  it("rolls back to ready_to_generate when listing generation fails, without corrupting the item draft", async () => {
    const conversationDoc = makeConversationDoc();
    const itemDraftDoc = makeItemDraftDoc({
      attributes: { category: "clothing", condition: "good", size: "M", brand: "nike" },
      missingFields: [],
    });

    vi.mocked(findConversationById).mockResolvedValue(conversationDoc);
    vi.mocked(findMessageByClientId).mockResolvedValue(null);
    vi.mocked(findItemDraftByConversation).mockResolvedValue(itemDraftDoc!);
    vi.mocked(updateConversationState).mockImplementation(async (conv, state) =>
      makeConversationDoc({ id: conv._id.toString(), state }),
    );

    const extractor = fakeExtractor(async () => ({}));
    const listingGenerator = fakeListingGenerator(async () => {
      throw new Error("provider unavailable");
    });

    const result = await postSellerMessage(
      "conv1",
      "still the same jacket",
      "client-genfail",
      extractor,
      listingGenerator,
    );

    expect(result.kind).toBe("listing_generation_failed");
    if (result.kind !== "listing_generation_failed") throw new Error("expected failure result");
    expect(result.reason).toBe("provider_error");
    expect(result.conversation.state).toBe("ready_to_generate");
    expect(createListingDraft).not.toHaveBeenCalled();
    expect(result.itemDraft.attributes.brand).toBe("nike");
  });

  it("rolls back to ready_to_generate when generated output fails claims validation", async () => {
    const conversationDoc = makeConversationDoc();
    const itemDraftDoc = makeItemDraftDoc({
      attributes: {
        category: "clothing",
        condition: "fair",
        size: "M",
        brand: "nike",
        defects: ["small stain on sleeve"],
      },
      missingFields: [],
    });

    vi.mocked(findConversationById).mockResolvedValue(conversationDoc);
    vi.mocked(findMessageByClientId).mockResolvedValue(null);
    vi.mocked(findItemDraftByConversation).mockResolvedValue(itemDraftDoc!);
    vi.mocked(updateConversationState).mockImplementation(async (conv, state) =>
      makeConversationDoc({ id: conv._id.toString(), state }),
    );

    const extractor = fakeExtractor(async () => ({}));
    // Does not mention the known defect — must be rejected, not persisted.
    const listingGenerator = fakeListingGenerator(async () => ({
      title: "Nike Jacket",
      description: "A great Nike jacket, works perfectly.",
      suggestedPrice: 40,
      currency: "CAD",
    }));

    const result = await postSellerMessage(
      "conv1",
      "still the same jacket",
      "client-claimsfail",
      extractor,
      listingGenerator,
    );

    expect(result.kind).toBe("listing_generation_failed");
    if (result.kind !== "listing_generation_failed") throw new Error("expected failure result");
    expect(result.reason).toBe("invalid_output");
    expect(result.conversation.state).toBe("ready_to_generate");
    expect(createListingDraft).not.toHaveBeenCalled();
  });

  it("rejects invalid structured listing output before persisting anything", async () => {
    const conversationDoc = makeConversationDoc();
    const itemDraftDoc = makeItemDraftDoc({
      attributes: { category: "clothing", condition: "good", size: "M", brand: "nike" },
      missingFields: [],
    });

    vi.mocked(findConversationById).mockResolvedValue(conversationDoc);
    vi.mocked(findMessageByClientId).mockResolvedValue(null);
    vi.mocked(findItemDraftByConversation).mockResolvedValue(itemDraftDoc!);
    vi.mocked(updateConversationState).mockImplementation(async (conv, state) =>
      makeConversationDoc({ id: conv._id.toString(), state }),
    );

    const extractor = fakeExtractor(async () => ({}));
    // suggestedPrice is negative — fails GeneratedListingSchema.
    const listingGenerator = fakeListingGenerator(
      async () =>
        ({
          title: "Nike Jacket",
          description: "A jacket.",
          suggestedPrice: -5,
          currency: "CAD",
        }) as unknown as GeneratedListing,
    );

    const result = await postSellerMessage(
      "conv1",
      "still the same jacket",
      "client-badprice",
      extractor,
      listingGenerator,
    );

    expect(result.kind).toBe("listing_generation_failed");
    expect(createListingDraft).not.toHaveBeenCalled();
  });

  it("applies an explicit correction of an existing value", async () => {
    const conversationDoc = makeConversationDoc();
    const itemDraftDoc = makeItemDraftDoc({
      attributes: { category: "clothing", condition: "good", size: "M", brand: "nike" },
      missingFields: [],
    });

    vi.mocked(findConversationById).mockResolvedValue(conversationDoc);
    vi.mocked(findMessageByClientId).mockResolvedValue(null);
    vi.mocked(findItemDraftByConversation).mockResolvedValue(itemDraftDoc!);
    vi.mocked(updateConversationState).mockImplementation(async (conv, state) =>
      makeConversationDoc({ id: conv._id.toString(), state }),
    );

    const extractor = fakeExtractor(async () => ({ size: "L" }));
    const listingGenerator = fakeListingGenerator(async () => VALID_GENERATED_LISTING);

    const result = await postSellerMessage(
      "conv1",
      "Actually it's a size L, not M",
      "client-correction",
      extractor,
      listingGenerator,
    );

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok result");
    expect(result.itemDraft.attributes.size).toBe("L");
    expect(result.itemDraft.attributes.brand).toBe("nike");
  });

  it("does not let null-valued fields overwrite existing facts", async () => {
    const conversationDoc = makeConversationDoc();
    const itemDraftDoc = makeItemDraftDoc({
      attributes: { category: "clothing", condition: "good", size: "M", brand: "nike" },
      missingFields: [],
    });

    vi.mocked(findConversationById).mockResolvedValue(conversationDoc);
    vi.mocked(findMessageByClientId).mockResolvedValue(null);
    vi.mocked(findItemDraftByConversation).mockResolvedValue(itemDraftDoc!);
    vi.mocked(updateConversationState).mockImplementation(async (conv, state) =>
      makeConversationDoc({ id: conv._id.toString(), state }),
    );

    // Simulates a provider that returns an explicit null for a field it
    // doesn't have new information about, rather than omitting the key.
    const extractor = fakeExtractor(
      async () => ({ brand: null }) as unknown as Partial<ItemAttributes>,
    );
    const listingGenerator = fakeListingGenerator(async () => VALID_GENERATED_LISTING);

    const result = await postSellerMessage(
      "conv1",
      "still the same jacket",
      "client-null",
      extractor,
      listingGenerator,
    );

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok result");
    expect(result.itemDraft.attributes.brand).toBe("nike");
  });

  it("returns extraction_failed and leaves the draft untouched for a provider timeout", async () => {
    const conversationDoc = makeConversationDoc();
    const itemDraftDoc = makeItemDraftDoc();

    vi.mocked(findConversationById).mockResolvedValue(conversationDoc);
    vi.mocked(findMessageByClientId).mockResolvedValue(null);
    vi.mocked(findItemDraftByConversation).mockResolvedValue(itemDraftDoc!);

    const extractor = fakeExtractor(async () => {
      throw new ExtractionProviderError("timed out");
    });

    const result = await postSellerMessage("conv1", "a jacket", "client-timeout", extractor);

    expect(result).toMatchObject({ kind: "extraction_failed", reason: "provider_error" });
    expect(createMessage).not.toHaveBeenCalled();
    expect(updateItemDraft).not.toHaveBeenCalled();
  });

  it("returns extraction_failed for invalid JSON from the provider", async () => {
    const conversationDoc = makeConversationDoc();
    const itemDraftDoc = makeItemDraftDoc();

    vi.mocked(findConversationById).mockResolvedValue(conversationDoc);
    vi.mocked(findMessageByClientId).mockResolvedValue(null);
    vi.mocked(findItemDraftByConversation).mockResolvedValue(itemDraftDoc!);

    const extractor = fakeExtractor(async () => {
      throw new ExtractionValidationError("not valid JSON");
    });

    const result = await postSellerMessage("conv1", "a jacket", "client-badjson", extractor);

    expect(result).toMatchObject({ kind: "extraction_failed", reason: "invalid_response" });
    expect(createMessage).not.toHaveBeenCalled();
  });

  it("returns extraction_failed for schema-invalid output", async () => {
    const conversationDoc = makeConversationDoc();
    const itemDraftDoc = makeItemDraftDoc();

    vi.mocked(findConversationById).mockResolvedValue(conversationDoc);
    vi.mocked(findMessageByClientId).mockResolvedValue(null);
    vi.mocked(findItemDraftByConversation).mockResolvedValue(itemDraftDoc!);

    // "used" is not a valid ItemCondition enum value.
    const extractor = fakeExtractor(
      async () => ({ condition: "used" }) as unknown as Partial<ItemAttributes>,
    );

    const result = await postSellerMessage("conv1", "a used jacket", "client-badenum", extractor);

    expect(result).toMatchObject({ kind: "extraction_failed", reason: "schema_invalid" });
    expect(createMessage).not.toHaveBeenCalled();
  });

  it("strips unsupported invented fields while keeping valid ones", async () => {
    const conversationDoc = makeConversationDoc();
    const itemDraftDoc = makeItemDraftDoc({ attributes: {}, missingFields: [
      "category",
      "condition",
      "size",
      "brand",
    ] });

    vi.mocked(findConversationById).mockResolvedValue(conversationDoc);
    vi.mocked(findMessageByClientId).mockResolvedValue(null);
    vi.mocked(findItemDraftByConversation).mockResolvedValue(itemDraftDoc!);

    const extractor = fakeExtractor(
      async () =>
        ({ category: "clothing", waterResistanceRating: "IPX7" }) as unknown as Partial<ItemAttributes>,
    );

    const result = await postSellerMessage("conv1", "a jacket", "client-invented", extractor);

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok result");
    expect(result.itemDraft.attributes).not.toHaveProperty("waterResistanceRating");
    expect(result.itemDraft.attributes.category).toBe("clothing");
  });

  it("returns the existing result for a duplicate clientMessageId without creating a new message or listing", async () => {
    const conversationDoc = makeConversationDoc({ state: "draft_ready" });
    const existingMessage = makeMessageDoc({ clientMessageId: "client-1" });
    const itemDraftDoc = makeItemDraftDoc({ missingFields: [] });
    const assistantMessageDoc = makeMessageDoc({ role: "assistant" });
    const listingDraftDoc = makeListingDraftDoc();

    vi.mocked(findConversationById).mockResolvedValue(conversationDoc);
    vi.mocked(findMessageByClientId).mockResolvedValue(existingMessage!);
    vi.mocked(findItemDraftByConversation).mockResolvedValue(itemDraftDoc!);
    vi.mocked(findLatestAssistantMessage).mockResolvedValue(assistantMessageDoc!);
    vi.mocked(findListingDraftByConversation).mockResolvedValue(listingDraftDoc!);

    const result = await postSellerMessage("conv1", "black jacket", "client-1");

    expect(result.kind).toBe("duplicate");
    if (result.kind !== "duplicate") throw new Error("expected duplicate result");
    expect(result.listingDraft).toBe(listingDraftDoc);
    expect(createMessage).not.toHaveBeenCalled();
    expect(updateItemDraft).not.toHaveBeenCalled();
    expect(createListingDraft).not.toHaveBeenCalled();
  });

  it("rejects a new message when the conversation is not in collecting", async () => {
    const conversationDoc = makeConversationDoc({ state: "draft_ready" });

    vi.mocked(findConversationById).mockResolvedValue(conversationDoc);
    vi.mocked(findMessageByClientId).mockResolvedValue(null);

    const result = await postSellerMessage("conv1", "another jacket", "client-3");

    expect(result.kind).toBe("invalid_state");
    expect(createMessage).not.toHaveBeenCalled();
  });
});
