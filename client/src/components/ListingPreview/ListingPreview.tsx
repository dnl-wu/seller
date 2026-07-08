import { useEffect, useState } from "react";
import {
  CURRENCY_CODES,
  type ConversationState,
  type Currency,
  type ListingDraft,
  type UpdateListingRequest,
} from "@seller/shared";
import { formatPrice } from "../../utils/itemAttributes.js";

interface ListingActionResult {
  ok: boolean;
  error?: string;
}

interface ListingPreviewProps {
  listingDraft: ListingDraft | null;
  conversationState: ConversationState | null;
  isGenerating: boolean;
  isApproving: boolean;
  isUpdating: boolean;
  onApproveListing: () => Promise<ListingActionResult>;
  onUpdateListing: (input: UpdateListingRequest) => Promise<ListingActionResult>;
}

function readDraftCurrency(listingDraft: ListingDraft | null): Currency {
  return listingDraft?.currency ?? "CAD";
}

export function ListingPreview({
  listingDraft,
  conversationState,
  isGenerating,
  isApproving,
  isUpdating,
  onApproveListing,
  onUpdateListing,
}: ListingPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(listingDraft?.title ?? "");
  const [description, setDescription] = useState(listingDraft?.description ?? "");
  const [suggestedPrice, setSuggestedPrice] = useState(
    listingDraft ? String(listingDraft.suggestedPrice) : "",
  );
  const [currency, setCurrency] = useState<Currency>(readDraftCurrency(listingDraft));
  const [inlineError, setInlineError] = useState<string | null>(null);

  useEffect(() => {
    if (!listingDraft || isEditing) return;
    setTitle(listingDraft.title);
    setDescription(listingDraft.description);
    setSuggestedPrice(String(listingDraft.suggestedPrice));
    setCurrency(listingDraft.currency);
    setInlineError(null);
  }, [isEditing, listingDraft]);

  useEffect(() => {
    if (listingDraft?.status === "approved" || conversationState === "approved") {
      setIsEditing(false);
    }
  }, [conversationState, listingDraft?.status]);

  if (!listingDraft && !isGenerating) return null;

  if (!listingDraft) {
    return (
      <section
        className="rounded-lg border border-border bg-surface p-5"
        aria-label="Listing draft"
        aria-busy="true"
      >
        <div className="mb-3 h-5 w-2/3 animate-shimmer rounded bg-secondary-surface" />
        <div className="mb-4 h-6 w-2/5 animate-shimmer rounded bg-secondary-surface" />
        <div className="mb-2 h-3 w-full animate-shimmer rounded bg-secondary-surface" />
        <div className="h-3 w-3/5 animate-shimmer rounded bg-secondary-surface" />
      </section>
    );
  }

  const isApproved = conversationState === "approved" || listingDraft.status === "approved";
  const canEdit = conversationState === "draft_ready" && listingDraft.status === "generated";
  const canApprove = canEdit && !isEditing;

  const resetForm = () => {
    setTitle(listingDraft.title);
    setDescription(listingDraft.description);
    setSuggestedPrice(String(listingDraft.suggestedPrice));
    setCurrency(listingDraft.currency);
    setInlineError(null);
  };

  const validateForm = (): UpdateListingRequest | null => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedPrice = suggestedPrice.trim();
    const price = Number(trimmedPrice);

    if (!trimmedTitle) {
      setInlineError("Add a title before saving.");
      return null;
    }
    if (!trimmedDescription) {
      setInlineError("Add a description before saving.");
      return null;
    }
    if (!trimmedPrice || !Number.isFinite(price) || price < 0) {
      setInlineError("Enter a valid non-negative price.");
      return null;
    }

    return {
      title: trimmedTitle,
      description: trimmedDescription,
      suggestedPrice: price,
      currency,
    };
  };

  const handleSave = async () => {
    const payload = validateForm();
    if (!payload) return;

    setInlineError(null);
    const result = await onUpdateListing(payload);
    if (result.ok) {
      setIsEditing(false);
      return;
    }
    setInlineError(result.error ?? "We couldn't save your listing changes.");
  };

  const handleApprove = async () => {
    setInlineError(null);
    const result = await onApproveListing();
    if (!result.ok) {
      setInlineError(result.error ?? "We couldn't approve this listing.");
    }
  };

  return (
    <section className="rounded-lg border border-border bg-surface p-6" aria-label="Listing draft">
      <span
        className={
          isApproved
            ? "mb-3 inline-block text-sm font-semibold text-success"
            : "mb-3 inline-block text-sm font-semibold text-primary-accent"
        }
      >
        {isApproved ? "Approved" : "Draft"}
      </span>

      {isEditing ? (
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="listing-title" className="mb-1 block text-xs text-secondary-text">
              Title
            </label>
            <input
              id="listing-title"
              className="w-full rounded-lg border border-border bg-main-bg px-3 py-2 text-sm text-primary-text focus:border-primary-accent focus:bg-surface focus:outline-none"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isUpdating}
            />
          </div>

          <div>
            <label htmlFor="listing-description" className="mb-1 block text-xs text-secondary-text">
              Description
            </label>
            <textarea
              id="listing-description"
              className="min-h-32 w-full resize-y rounded-lg border border-border bg-main-bg px-3 py-2 text-sm leading-relaxed text-primary-text focus:border-primary-accent focus:bg-surface focus:outline-none"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isUpdating}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-[minmax(0,1fr)_8rem]">
            <div>
              <label htmlFor="listing-price" className="mb-1 block text-xs text-secondary-text">
                Suggested price
              </label>
              <input
                id="listing-price"
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-lg border border-border bg-main-bg px-3 py-2 text-sm text-primary-text focus:border-primary-accent focus:bg-surface focus:outline-none"
                value={suggestedPrice}
                onChange={(event) => setSuggestedPrice(event.target.value)}
                disabled={isUpdating}
              />
            </div>
            <div>
              <label htmlFor="listing-currency" className="mb-1 block text-xs text-secondary-text">
                Currency
              </label>
              <select
                id="listing-currency"
                className="w-full rounded-lg border border-border bg-main-bg px-3 py-2 text-sm text-primary-text focus:border-primary-accent focus:bg-surface focus:outline-none"
                value={currency}
                onChange={(event) => setCurrency(event.target.value as Currency)}
                disabled={isUpdating}
              >
                {CURRENCY_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : (
        <>
          {isApproved && (
            <div className="mb-5">
              <p className="text-sm font-semibold text-primary-text">Listing approved</p>
              <p className="text-sm text-secondary-text">Your final draft has been saved.</p>
            </div>
          )}
          <h3 className="mb-1 font-serif text-xl font-medium leading-snug text-primary-text">
            {listingDraft.title}
          </h3>
          <p className="mb-4 text-2xl font-semibold text-primary-accent">
            {formatPrice(listingDraft.suggestedPrice, listingDraft.currency)}
          </p>
          <p className="mb-5 whitespace-pre-wrap text-sm leading-relaxed text-secondary-text">
            {listingDraft.description}
          </p>
        </>
      )}

      {inlineError && (
        <p role="alert" className="mt-4 text-sm font-medium text-secondary-accent">
          {inlineError}
        </p>
      )}

      {!isApproved && (
        <div className="mt-5 flex flex-wrap gap-2">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isUpdating}
                className="rounded-md bg-primary-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-secondary-accent disabled:cursor-not-allowed disabled:bg-secondary-surface disabled:text-secondary-text"
              >
                {isUpdating ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsEditing(false);
                }}
                disabled={isUpdating}
                className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-secondary-text transition-colors hover:text-primary-text disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsEditing(true);
                }}
                disabled={!canEdit || isApproving}
                className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-secondary-text transition-colors hover:text-primary-text disabled:cursor-not-allowed disabled:opacity-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => void handleApprove()}
                disabled={!canApprove || isApproving}
                className="rounded-md bg-primary-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-secondary-accent disabled:cursor-not-allowed disabled:bg-secondary-surface disabled:text-secondary-text"
              >
                {isApproving ? "Approving..." : "Approve listing"}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
