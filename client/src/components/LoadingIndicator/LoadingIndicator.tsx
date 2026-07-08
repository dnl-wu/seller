interface LoadingIndicatorProps {
  label: string;
}

export function LoadingIndicator({ label }: LoadingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="inline-flex gap-1" aria-hidden="true">
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-primary-accent" />
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-primary-accent [animation-delay:0.15s]" />
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-primary-accent [animation-delay:0.3s]" />
      </span>
      <span className="text-xs text-secondary-text">{label}</span>
    </div>
  );
}
