import { useEffect, useRef } from "react";
import type { Message } from "@seller/shared";
import { MessageBubble } from "../MessageBubble/MessageBubble.js";
import { LoadingIndicator } from "../LoadingIndicator/LoadingIndicator.js";
import { EmptyConversation } from "../EmptyConversation/EmptyConversation.js";

interface ChatThreadProps {
  messages: Message[];
  isThinking: boolean;
  thinkingLabel: string;
  onSelectPrompt: (text: string) => void;
}

export function ChatThread({ messages, isThinking, thinkingLabel, onSelectPrompt }: ChatThreadProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, isThinking]);

  if (messages.length === 0 && !isThinking) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto px-6 py-5">
        <EmptyConversation onSelectPrompt={onSelectPrompt} />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-6 py-5" aria-live="polite">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isThinking && <LoadingIndicator label={thinkingLabel} />}
      <div ref={endRef} />
    </div>
  );
}
