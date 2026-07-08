import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListingPreview } from "./ListingPreview.js";
import { makeListingDraft } from "../../test/fixtures.js";
import type { UpdateListingRequest } from "@seller/shared";

function renderPreview(overrides: {
  conversationState?: "collecting" | "ready_to_generate" | "generating" | "draft_ready" | "approved";
  isApproving?: boolean;
  isGenerating?: boolean;
  isUpdating?: boolean;
  listingDraft?: ReturnType<typeof makeListingDraft> | null;
  onApproveListing?: () => Promise<{ ok: boolean; error?: string; conflict?: boolean }>;
  onUpdateListing?: (input: UpdateListingRequest) => Promise<{ ok: boolean; error?: string; conflict?: boolean }>;
  onReloadLatest?: () => Promise<void>;
} = {}) {
  const onApproveListing = overrides.onApproveListing ?? vi.fn(async () => ({ ok: true }));
  const onUpdateListing = overrides.onUpdateListing ?? vi.fn(async () => ({ ok: true }));
  const onReloadLatest = overrides.onReloadLatest ?? vi.fn(async () => undefined);

  const view = render(
    <ListingPreview
      listingDraft={
        Object.prototype.hasOwnProperty.call(overrides, "listingDraft")
          ? overrides.listingDraft!
          : makeListingDraft()
      }
      conversationState={overrides.conversationState ?? "draft_ready"}
      isGenerating={overrides.isGenerating ?? false}
      isApproving={overrides.isApproving ?? false}
      isUpdating={overrides.isUpdating ?? false}
      onApproveListing={onApproveListing}
      onUpdateListing={onUpdateListing}
      onReloadLatest={onReloadLatest}
    />,
  );

  return { ...view, onApproveListing, onUpdateListing, onReloadLatest };
}

describe("ListingPreview", () => {
  it("renders a listing draft's title, price, currency, description, and status", () => {
    renderPreview({
      listingDraft: makeListingDraft({
        title: "Nike Jacket, Size M",
        suggestedPrice: 42,
        currency: "CAD",
        description: "A Nike jacket in good condition.",
      }),
    });

    expect(screen.getByText("Nike Jacket, Size M")).toBeInTheDocument();
    expect(screen.getByText("CA$42.00")).toBeInTheDocument();
    expect(screen.getByText("A Nike jacket in good condition.")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("renders a skeleton while generating with no draft yet", () => {
    const { container } = renderPreview({ listingDraft: null, isGenerating: true });
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it("renders nothing when there is no draft and generation hasn't started", () => {
    const { container } = renderPreview({ listingDraft: null, isGenerating: false });
    expect(container).toBeEmptyDOMElement();
  });

  it("edits and saves listing copy through the provided action", async () => {
    const user = userEvent.setup();
    const { onUpdateListing } = renderPreview();

    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    await user.clear(screen.getByLabelText(/title/i));
    await user.type(screen.getByLabelText(/title/i), "Updated title");
    await user.clear(screen.getByLabelText(/description/i));
    await user.type(screen.getByLabelText(/description/i), "Updated description");
    await user.clear(screen.getByLabelText(/suggested price/i));
    await user.type(screen.getByLabelText(/suggested price/i), "55");
    await user.selectOptions(screen.getByLabelText(/currency/i), "USD");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onUpdateListing).toHaveBeenCalledWith({
      title: "Updated title",
      description: "Updated description",
      suggestedPrice: 55,
      currency: "USD",
      expectedVersion: 0,
    });
    await waitFor(() => expect(screen.queryByLabelText(/title/i)).not.toBeInTheDocument());
  });

  it("shows a reload action after a stale edit conflict while preserving edits", async () => {
    const user = userEvent.setup();
    const onReloadLatest = vi.fn(async () => undefined);
    renderPreview({
      onUpdateListing: vi.fn(async () => ({
        ok: false,
        error: "This listing changed while you were editing it.",
        conflict: true,
      })),
      onReloadLatest,
    });

    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    await user.clear(screen.getByLabelText(/title/i));
    await user.type(screen.getByLabelText(/title/i), "Unsaved title");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/changed while you were editing/i);
    expect(screen.getByLabelText(/title/i)).toHaveValue("Unsaved title");

    await user.click(screen.getByRole("button", { name: /reload latest version/i }));
    expect(onReloadLatest).toHaveBeenCalledTimes(1);
  });

  it("keeps unsaved edits visible when save fails", async () => {
    const user = userEvent.setup();
    renderPreview({
      onUpdateListing: vi.fn(async () => ({ ok: false, error: "Save failed" })),
    });

    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    await user.clear(screen.getByLabelText(/title/i));
    await user.type(screen.getByLabelText(/title/i), "Unsaved title");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Save failed");
    expect(screen.getByLabelText(/title/i)).toHaveValue("Unsaved title");
  });

  it("validates empty fields before saving", async () => {
    const user = userEvent.setup();
    const { onUpdateListing } = renderPreview();

    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    await user.clear(screen.getByLabelText(/title/i));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/add a title/i);
    expect(onUpdateListing).not.toHaveBeenCalled();
  });

  it("approves the listing through the provided action", async () => {
    const user = userEvent.setup();
    const { onApproveListing } = renderPreview();

    await user.click(screen.getByRole("button", { name: /approve listing/i }));

    expect(onApproveListing).toHaveBeenCalledTimes(1);
  });

  it("shows the approved state without edit controls", () => {
    renderPreview({
      conversationState: "approved",
      listingDraft: makeListingDraft({ status: "approved" }),
    });

    expect(screen.getByText("Listing approved")).toBeInTheDocument();
    expect(screen.getByText("Your final draft has been saved.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve listing/i })).not.toBeInTheDocument();
  });
});
