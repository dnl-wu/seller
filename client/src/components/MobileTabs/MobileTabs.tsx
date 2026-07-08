export type MobileTab = "conversation" | "listing";

interface MobileTabsProps {
  activeTab: MobileTab;
  onChange: (tab: MobileTab) => void;
  hasListingDraft: boolean;
}

export function MobileTabs({ activeTab, onChange, hasListingDraft }: MobileTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Workspace view"
      className="hidden flex-shrink-0 items-center gap-4 border-b border-border bg-surface px-4 py-3 max-[900px]:flex"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "conversation"}
        onClick={() => onChange("conversation")}
        className={
          activeTab === "conversation"
            ? "min-h-[44px] flex-1 px-2 py-2 text-sm font-semibold text-primary-accent"
            : "min-h-[44px] flex-1 px-2 py-2 text-sm font-medium text-secondary-text transition-colors hover:text-primary-text"
        }
      >
        Conversation
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "listing"}
        onClick={() => onChange("listing")}
        className={
          activeTab === "listing"
            ? "min-h-[44px] flex-1 px-2 py-2 text-sm font-semibold text-primary-accent"
            : "min-h-[44px] flex-1 px-2 py-2 text-sm font-medium text-secondary-text transition-colors hover:text-primary-text"
        }
      >
        Listing{hasListingDraft ? " ready" : ""}
      </button>
    </div>
  );
}
