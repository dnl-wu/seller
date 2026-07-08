interface AppHeaderProps {
  onNewListing: () => void;
  newListingDisabled?: boolean;
}

export function AppHeader({ onNewListing, newListingDisabled = false }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex flex-shrink-0 items-center justify-between border-b border-border bg-surface px-6 py-4">
      <div className="leading-tight">
        <h1 className="text-base font-semibold text-primary-text">Seller AI</h1>
        <p className="text-xs text-secondary-text">Listing workspace</p>
      </div>

      <button
        type="button"
        onClick={onNewListing}
        disabled={newListingDisabled}
        className="rounded-md bg-primary-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-secondary-accent disabled:cursor-not-allowed disabled:bg-secondary-surface disabled:text-secondary-text"
      >
        New listing
      </button>
    </header>
  );
}
