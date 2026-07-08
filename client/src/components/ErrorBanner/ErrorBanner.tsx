interface ErrorBannerProps {
  message: string;
  onDismiss?: (() => void) | undefined;
  onRetry?: (() => void) | undefined;
}

export function ErrorBanner({ message, onDismiss, onRetry }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="animate-fade-in-down mx-6 mt-3 flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-secondary-accent">Error</span>
        <p className="text-sm leading-relaxed text-primary-text">{message}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md bg-primary-accent px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-secondary-accent"
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss error"
            className="px-2 py-1 text-sm font-medium text-secondary-text transition-colors hover:text-primary-text"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
