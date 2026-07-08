import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ConversationState,
  CreateConversationResponse,
  GetConversationResponse,
  ItemAttributes,
  ItemDraft,
  ListingDraft,
  Message,
} from "@seller/shared";
import { createConversation, getConversation, sendMessage as sendMessageApi } from "../api/conversations.js";
import { toUiError, type UiError } from "../utils/conversationState.js";

export interface ConversationView {
  id: string;
  state: ConversationState;
  itemDraft: ItemDraft | null;
  messages: Message[];
  listingDraft: ListingDraft | null;
}

export interface ConversationUiState {
  conversation: ConversationView | null;
  isInitializing: boolean;
  isSending: boolean;
  error: UiError | null;
  /** Attribute keys whose value changed on the most recent backend update. */
  changedFields: ReadonlySet<string>;
}

export interface UseConversationResult extends ConversationUiState {
  sendMessage: (content: string) => Promise<boolean>;
  startNewListing: () => Promise<void>;
  dismissError: () => void;
}

function fromCreateResponse(res: CreateConversationResponse): ConversationView {
  return {
    id: res.conversationId,
    state: res.state,
    itemDraft: res.itemDraft,
    messages: [],
    listingDraft: null,
  };
}

function fromGetResponse(res: GetConversationResponse): ConversationView {
  return {
    id: res.conversation.id,
    state: res.conversation.state,
    itemDraft: res.itemDraft,
    messages: res.messages,
    listingDraft: res.listingDraft,
  };
}

function diffAttributeKeys(
  previous: ItemAttributes | null | undefined,
  next: ItemAttributes | null | undefined,
): Set<string> {
  const changed = new Set<string>();
  if (!previous || !next) return changed;

  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  for (const key of keys) {
    const prevValue = previous[key as keyof ItemAttributes];
    const nextValue = next[key as keyof ItemAttributes];
    if (JSON.stringify(prevValue) !== JSON.stringify(nextValue)) {
      changed.add(key);
    }
  }
  return changed;
}

export function useConversation(sellerId: string): UseConversationResult {
  const [conversation, setConversation] = useState<ConversationView | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  const [changedFields, setChangedFields] = useState<ReadonlySet<string>>(new Set());
  const previousAttributesRef = useRef<ItemAttributes | null>(null);

  const initialize = useCallback(async () => {
    setIsInitializing(true);
    setError(null);
    setChangedFields(new Set());
    previousAttributesRef.current = null;
    try {
      const res = await createConversation(sellerId);
      const view = fromCreateResponse(res);
      setConversation(view);
      previousAttributesRef.current = view.itemDraft?.attributes ?? null;
    } catch (err) {
      setConversation(null);
      setError(toUiError(err, "create"));
    } finally {
      setIsInitializing(false);
    }
  }, [sellerId]);

  useEffect(() => {
    void initialize();
    // Only re-initializes if the seller identity itself changes, which in
    // practice never happens after first load.
  }, [initialize]);

  const sendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      const trimmed = content.trim();
      if (!trimmed || !conversation || isSending) return false;

      setIsSending(true);
      setError(null);
      try {
        const clientMessageId = crypto.randomUUID();
        await sendMessageApi(conversation.id, { content: trimmed, clientMessageId });
        const fresh = await getConversation(conversation.id);
        const view = fromGetResponse(fresh);

        setChangedFields(diffAttributeKeys(previousAttributesRef.current, view.itemDraft?.attributes));
        previousAttributesRef.current = view.itemDraft?.attributes ?? null;
        setConversation(view);
        return true;
      } catch (err) {
        setError(toUiError(err, "send"));
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [conversation, isSending],
  );

  const startNewListing = useCallback(async () => {
    await initialize();
  }, [initialize]);

  const dismissError = useCallback(() => setError(null), []);

  return {
    conversation,
    isInitializing,
    isSending,
    error,
    changedFields,
    sendMessage,
    startNewListing,
    dismissError,
  };
}
