import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SellerAgentPage } from "./SellerAgentPage.js";
import { makeConversation, makeItemDraft, makeListingDraft, makeMessage } from "../test/fixtures.js";

vi.mock("../api/conversations.js", () => {
  class ApiError extends Error {
    status: number;
    code: string | undefined;
    constructor(message: string, status: number, code?: string) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.code = code;
    }
  }
  return {
    approveListing: vi.fn(),
    createConversation: vi.fn(),
    getConversation: vi.fn(),
    sendMessage: vi.fn(),
    updateListing: vi.fn(),
    ApiError,
  };
});

import {
  ApiError,
  approveListing,
  createConversation,
  getConversation,
  sendMessage,
  updateListing,
} from "../api/conversations.js";

const SELLER_ID_KEY = "seller-agent:seller-id";

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

function mockFreshConversation() {
  vi.mocked(createConversation).mockResolvedValue({
    conversationId: "conv-1",
    state: "collecting",
    itemDraft: makeItemDraft(),
  });
}

async function renderAndWaitForInit() {
  render(<SellerAgentPage />);
  await waitFor(() => expect(createConversation).toHaveBeenCalled());
  await screen.findByText(/create your listing/i);
}

describe("SellerAgentPage", () => {
  it("creates a conversation on page load", async () => {
    mockFreshConversation();
    await renderAndWaitForInit();
    expect(createConversation).toHaveBeenCalledTimes(1);
  });

  it("reuses the local seller id across mounts", async () => {
    window.localStorage.setItem(SELLER_ID_KEY, "existing-seller-id");
    mockFreshConversation();

    await renderAndWaitForInit();

    expect(createConversation).toHaveBeenCalledWith("existing-seller-id");
  });

  it("submits a message through the typed API client and renders the reply", async () => {
    mockFreshConversation();
    vi.mocked(sendMessage).mockResolvedValue({
      conversation: makeConversation("collecting"),
      itemDraft: makeItemDraft({ category: "clothing" }, ["condition", "size", "brand"]),
      assistantMessage: makeMessage("assistant", "What condition is the item in?"),
      listingDraft: null,
    });
    vi.mocked(getConversation).mockResolvedValue({
      conversation: makeConversation("collecting"),
      itemDraft: makeItemDraft({ category: "clothing" }, ["condition", "size", "brand"]),
      messages: [
        makeMessage("seller", "I want to sell a jacket"),
        makeMessage("assistant", "What condition is the item in?"),
      ],
      listingDraft: null,
    });

    const user = userEvent.setup();
    await renderAndWaitForInit();

    const textbox = screen.getByRole("textbox", { name: /message/i });
    await user.type(textbox, "I want to sell a jacket");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() =>
      expect(sendMessage).toHaveBeenCalledWith(
        "conv-1",
        expect.objectContaining({ content: "I want to sell a jacket" }),
      ),
    );
    expect(await screen.findByText("What condition is the item in?")).toBeInTheDocument();
    expect(screen.getByText("I want to sell a jacket")).toBeInTheDocument();
  });

  it("generates a unique clientMessageId per submission", async () => {
    mockFreshConversation();
    vi.mocked(sendMessage).mockResolvedValue({
      conversation: makeConversation("collecting"),
      itemDraft: makeItemDraft(),
      assistantMessage: makeMessage("assistant", "Tell me more."),
      listingDraft: null,
    });
    vi.mocked(getConversation).mockResolvedValue({
      conversation: makeConversation("collecting"),
      itemDraft: makeItemDraft(),
      messages: [],
      listingDraft: null,
    });

    const user = userEvent.setup();
    await renderAndWaitForInit();

    const textbox = screen.getByRole("textbox", { name: /message/i });
    const sendButton = screen.getByRole("button", { name: /send message/i });

    await user.type(textbox, "first message");
    await user.click(sendButton);
    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));

    await user.type(textbox, "second message");
    await user.click(sendButton);
    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(2));

    const calls = vi.mocked(sendMessage).mock.calls;
    expect(calls[0]?.[1].clientMessageId).not.toBe(calls[1]?.[1].clientMessageId);
  });

  it("disables the composer while a message is in flight", async () => {
    mockFreshConversation();
    let resolveSend!: (value: Awaited<ReturnType<typeof sendMessage>>) => void;
    vi.mocked(sendMessage).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve;
        }),
    );
    vi.mocked(getConversation).mockResolvedValue({
      conversation: makeConversation("collecting"),
      itemDraft: makeItemDraft(),
      messages: [],
      listingDraft: null,
    });

    const user = userEvent.setup();
    await renderAndWaitForInit();

    const textbox = screen.getByRole("textbox", { name: /message/i });
    await user.type(textbox, "hello there");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => expect(textbox).toBeDisabled());

    resolveSend({
      conversation: makeConversation("collecting"),
      itemDraft: makeItemDraft(),
      assistantMessage: makeMessage("assistant", "Got it."),
      listingDraft: null,
    });

    await waitFor(() => expect(textbox).not.toBeDisabled());
  });

  it("clears the input after a successful send", async () => {
    mockFreshConversation();
    vi.mocked(sendMessage).mockResolvedValue({
      conversation: makeConversation("collecting"),
      itemDraft: makeItemDraft(),
      assistantMessage: makeMessage("assistant", "Got it."),
      listingDraft: null,
    });
    vi.mocked(getConversation).mockResolvedValue({
      conversation: makeConversation("collecting"),
      itemDraft: makeItemDraft(),
      messages: [makeMessage("seller", "hello"), makeMessage("assistant", "Got it.")],
      listingDraft: null,
    });

    const user = userEvent.setup();
    await renderAndWaitForInit();

    const textbox = screen.getByRole<HTMLTextAreaElement>("textbox", { name: /message/i });
    await user.type(textbox, "hello");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => expect(textbox.value).toBe(""));
  });

  it("preserves the input after a failed send and shows a useful error", async () => {
    mockFreshConversation();
    vi.mocked(sendMessage).mockRejectedValue(new ApiError("boom", 500));

    const user = userEvent.setup();
    await renderAndWaitForInit();

    const textbox = screen.getByRole<HTMLTextAreaElement>("textbox", { name: /message/i });
    await user.type(textbox, "hello there");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => expect(textbox.value).toBe("hello there"));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't send your message/i);
  });

  it("shows a friendly message for a 409 locked-conversation error", async () => {
    mockFreshConversation();
    vi.mocked(sendMessage).mockRejectedValue(new ApiError("locked", 409));

    const user = userEvent.setup();
    await renderAndWaitForInit();

    const textbox = screen.getByRole("textbox", { name: /message/i });
    await user.type(textbox, "another message");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /listing draft is ready, so the conversation is currently locked/i,
    );
  });

  it("prevents submitting an empty or whitespace-only message", async () => {
    mockFreshConversation();
    const user = userEvent.setup();
    await renderAndWaitForInit();

    const textbox = screen.getByRole("textbox", { name: /message/i });
    const sendButton = screen.getByRole("button", { name: /send message/i });

    expect(sendButton).toBeDisabled();

    await user.type(textbox, "   ");
    expect(sendButton).toBeDisabled();

    await user.click(sendButton);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("starts a new listing, resetting the conversation and errors", async () => {
    mockFreshConversation();
    vi.mocked(sendMessage).mockRejectedValue(new ApiError("boom", 500));

    const user = userEvent.setup();
    await renderAndWaitForInit();

    const textbox = screen.getByRole("textbox", { name: /message/i });
    await user.type(textbox, "hello");
    await user.click(screen.getByRole("button", { name: /send message/i }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /new listing/i }));

    await waitFor(() => expect(createConversation).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(await screen.findByText(/create your listing/i)).toBeInTheDocument();
  });

  it("renders a listing draft once the backend reaches draft_ready", async () => {
    vi.mocked(createConversation).mockResolvedValue({
      conversationId: "conv-1",
      state: "collecting",
      itemDraft: makeItemDraft(),
    });
    vi.mocked(sendMessage).mockResolvedValue({
      conversation: makeConversation("draft_ready"),
      itemDraft: makeItemDraft(
        { category: "clothing", brand: "nike", condition: "good", size: "M" },
        [],
      ),
      assistantMessage: makeMessage("assistant", "Your listing draft is ready for review."),
      listingDraft: makeListingDraft(),
    });
    vi.mocked(getConversation).mockResolvedValue({
      conversation: makeConversation("draft_ready"),
      itemDraft: makeItemDraft(
        { category: "clothing", brand: "nike", condition: "good", size: "M" },
        [],
      ),
      messages: [makeMessage("assistant", "Your listing draft is ready for review.")],
      listingDraft: makeListingDraft({ title: "Nike Jacket, Size M", suggestedPrice: 40 }),
    });

    const user = userEvent.setup();
    await renderAndWaitForInit();

    const textbox = screen.getByRole("textbox", { name: /message/i });
    await user.type(textbox, "It's a Nike jacket");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByText("Nike Jacket, Size M")).toBeInTheDocument();
    expect(screen.getByText("CA$40.00")).toBeInTheDocument();
  });

  it("saves listing edits and replaces local state with the backend response", async () => {
    vi.mocked(createConversation).mockResolvedValue({
      conversationId: "conv-1",
      state: "collecting",
      itemDraft: makeItemDraft(),
    });
    vi.mocked(sendMessage).mockResolvedValue({
      conversation: makeConversation("draft_ready"),
      itemDraft: makeItemDraft(
        { category: "clothing", brand: "nike", condition: "good", size: "M" },
        [],
      ),
      assistantMessage: makeMessage("assistant", "Your listing draft is ready for review."),
      listingDraft: makeListingDraft(),
    });
    vi.mocked(getConversation).mockResolvedValue({
      conversation: makeConversation("draft_ready"),
      itemDraft: makeItemDraft(
        { category: "clothing", brand: "nike", condition: "good", size: "M" },
        [],
      ),
      messages: [makeMessage("assistant", "Your listing draft is ready for review.")],
      listingDraft: makeListingDraft({ title: "Nike Jacket, Size M", suggestedPrice: 40 }),
    });
    vi.mocked(updateListing).mockResolvedValue({
      conversation: makeConversation("draft_ready"),
      itemDraft: makeItemDraft(
        { category: "clothing", brand: "nike", condition: "good", size: "M" },
        [],
      ),
      messages: [makeMessage("assistant", "Your listing draft is ready for review.")],
      listingDraft: makeListingDraft({ title: "Edited Jacket", suggestedPrice: 55 }),
    });

    const user = userEvent.setup();
    await renderAndWaitForInit();

    await user.type(screen.getByRole("textbox", { name: /message/i }), "It's a Nike jacket");
    await user.click(screen.getByRole("button", { name: /send message/i }));
    expect(await screen.findByText("Nike Jacket, Size M")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    await user.clear(screen.getByLabelText(/title/i));
    await user.type(screen.getByLabelText(/title/i), "Edited Jacket");
    await user.clear(screen.getByLabelText(/suggested price/i));
    await user.type(screen.getByLabelText(/suggested price/i), "55");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(updateListing).toHaveBeenCalledWith(
        "conv-1",
        expect.objectContaining({ title: "Edited Jacket", suggestedPrice: 55 }),
      ),
    );
    expect(await screen.findByText("Edited Jacket")).toBeInTheDocument();
    expect(screen.getByText("CA$55.00")).toBeInTheDocument();
  });

  it("approves a listing and locks the approved state", async () => {
    vi.mocked(createConversation).mockResolvedValue({
      conversationId: "conv-1",
      state: "collecting",
      itemDraft: makeItemDraft(),
    });
    vi.mocked(sendMessage).mockResolvedValue({
      conversation: makeConversation("draft_ready"),
      itemDraft: makeItemDraft(
        { category: "clothing", brand: "nike", condition: "good", size: "M" },
        [],
      ),
      assistantMessage: makeMessage("assistant", "Your listing draft is ready for review."),
      listingDraft: makeListingDraft(),
    });
    vi.mocked(getConversation).mockResolvedValue({
      conversation: makeConversation("draft_ready"),
      itemDraft: makeItemDraft(
        { category: "clothing", brand: "nike", condition: "good", size: "M" },
        [],
      ),
      messages: [makeMessage("assistant", "Your listing draft is ready for review.")],
      listingDraft: makeListingDraft({ title: "Nike Jacket, Size M", suggestedPrice: 40 }),
    });
    vi.mocked(approveListing).mockResolvedValue({
      conversation: makeConversation("approved"),
      itemDraft: makeItemDraft(
        { category: "clothing", brand: "nike", condition: "good", size: "M" },
        [],
      ),
      messages: [makeMessage("assistant", "Your listing draft is ready for review.")],
      listingDraft: makeListingDraft({
        title: "Nike Jacket, Size M",
        suggestedPrice: 40,
        status: "approved",
      }),
    });

    const user = userEvent.setup();
    await renderAndWaitForInit();

    await user.type(screen.getByRole("textbox", { name: /message/i }), "It's a Nike jacket");
    await user.click(screen.getByRole("button", { name: /send message/i }));
    await user.click(await screen.findByRole("button", { name: /approve listing/i }));

    await waitFor(() => expect(approveListing).toHaveBeenCalledWith("conv-1"));
    expect(await screen.findByText("Listing approved")).toBeInTheDocument();
    expect(screen.getByText("Your final draft has been saved.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /message/i })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
  });

  it("switches the mobile workspace tab between conversation and listing", async () => {
    mockFreshConversation();
    const user = userEvent.setup();
    await renderAndWaitForInit();

    // The tab bar is only visible below the responsive breakpoint (real
    // CSS media query, verified visually in the browser); jsdom's default
    // viewport is wider, so `hidden: true` bypasses RTL's visibility
    // filter here — this test targets the tab-switching logic itself.
    const workspace = document.querySelector("[data-active-tab]");
    expect(workspace).toHaveAttribute("data-active-tab", "conversation");

    await user.click(screen.getByRole("tab", { name: /listing/i, hidden: true }));
    expect(workspace).toHaveAttribute("data-active-tab", "listing");

    await user.click(screen.getByRole("tab", { name: /^conversation$/i, hidden: true }));
    expect(workspace).toHaveAttribute("data-active-tab", "conversation");
  });
});
