import type { ListingDraft } from "@seller/shared";
import { formatPrice } from "../../utils/itemAttributes.js";

interface ListingPreviewProps {
  listingDraft: ListingDraft | null;
  isGenerating: boolean;
}

export function ListingPreview({ listingDraft, isGenerating }: ListingPreviewProps) {
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

  return (
    <section className="rounded-lg border border-border bg-surface p-6" aria-label="Listing draft">
      <span
        className={
          listingDraft.status === "approved"
            ? "mb-3 inline-block text-sm font-semibold text-success"
            : "mb-3 inline-block text-sm font-semibold text-primary-accent"
        }
      >
        {listingDraft.status === "approved" ? "Approved" : "Draft"}
      </span>
      <h3 className="mb-1 font-serif text-xl font-medium leading-snug text-primary-text">
        {listingDraft.title}
      </h3>
      <p className="mb-4 text-2xl font-semibold text-primary-accent">
        {formatPrice(listingDraft.suggestedPrice, listingDraft.currency)}
      </p>
      <p className="mb-5 whitespace-pre-wrap text-sm leading-relaxed text-secondary-text">
        {listingDraft.description}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          disabled
          title="Not yet available"
          className="cursor-not-allowed rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-secondary-text opacity-60"
        >
          Edit
        </button>
        <button
          type="button"
          disabled
          title="Not yet available"
          className="cursor-not-allowed rounded-md bg-primary-accent px-4 py-2 text-sm font-semibold text-white opacity-40"
        >
          Approve
        </button>
      </div>
      <p className="mt-2 text-xs text-secondary-text">
        Editing and approval are coming soon.
      </p>
    </section>
  );
}
