interface AppHeaderProps {
  onNewListing: () => void;
  onOpenPreferences: () => void;
  newListingDisabled?: boolean;
}

export function AppHeader({
  onNewListing,
  onOpenPreferences,
  newListingDisabled = false,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex flex-shrink-0 items-center justify-between border-b border-border bg-surface px-6 py-4">
      <div className="leading-tight">
        <h1 className="text-base font-semibold text-primary-text">Seller</h1>
        <p className="text-xs text-secondary-text">Listing workspace</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenPreferences}
          className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-secondary-text transition-colors hover:text-primary-text"
        >
          Settings
        </button>
        <button
          type="button"
          onClick={onNewListing}
          disabled={newListingDisabled}
          className="rounded-md bg-primary-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-secondary-accent disabled:cursor-not-allowed disabled:bg-secondary-surface disabled:text-secondary-text"
        >
          New listing
        </button>
      </div>
    </header>
  );
}
