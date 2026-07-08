import type { Message } from "@seller/shared";
import { isSellerRole } from "../../utils/conversationState.js";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const fromSeller = isSellerRole(message.role);

  if (fromSeller) {
    return (
      <div className="flex justify-end py-1">
        <div className="max-w-[60%] rounded-lg rounded-br-sm bg-primary-accent px-4 py-2.5">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex py-1">
      <div className="max-w-[78%] rounded-lg bg-surface px-4 py-2.5">
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-primary-text">
          {message.content}
        </p>
      </div>
    </div>
  );
}
