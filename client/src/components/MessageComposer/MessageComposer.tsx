import { type KeyboardEvent } from "react";

interface MessageComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  lockedMessage?: string | undefined;
}

export function MessageComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  lockedMessage,
}: MessageComposerProps) {
  const canSubmit = !disabled && value.trim().length > 0;

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) onSubmit();
    }
  };

  return (
    <div className="flex-shrink-0 border-t border-border bg-surface p-5">
      {lockedMessage && (
        <p className="mb-2 text-xs text-secondary-text">{lockedMessage}</p>
      )}
      <div className="relative flex items-center">
        <label htmlFor="message-composer-input" className="sr-only">
          Message
        </label>
        <textarea
          id="message-composer-input"
          className="w-full resize-none rounded-lg border border-border bg-main-bg py-4 pl-5 pr-20 text-sm text-primary-text placeholder-secondary-text transition-colors focus:border-primary-accent focus:bg-surface focus:outline-none disabled:text-secondary-text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Describe what you want to list..."
          rows={1}
        />
        <div className="absolute right-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            aria-label="Send message"
            className={
              canSubmit
                ? "rounded-md bg-primary-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-secondary-accent"
                : "cursor-not-allowed rounded-md bg-secondary-surface px-4 py-2 text-sm font-semibold text-secondary-text"
            }
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
