import type { ConversationState } from "@seller/shared";
import { getConversationStateLabel } from "../../utils/conversationState.js";

interface ConversationHeaderProps {
  state: ConversationState | null;
}

export function ConversationHeader({ state }: ConversationHeaderProps) {
  return (
    <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-surface px-6 py-4">
      <h2 className="text-sm font-semibold text-primary-text">Conversation</h2>
      {state && (
        <span className="text-xs font-medium text-secondary-text">
          {getConversationStateLabel(state)}
        </span>
      )}
    </div>
  );
}
