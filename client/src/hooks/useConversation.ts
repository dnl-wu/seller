import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ConversationState,
  CreateConversationResponse,
  GetConversationResponse,
  ItemAttributes,
  ItemDraft,
  ListingDraft,
  Message,
  UpdateListingRequest,
} from "@seller/shared";
import {
  approveListing as approveListingApi,
  createConversation,
  getConversation,
  sendMessage as sendMessageApi,
  updateListing as updateListingApi,
} from "../api/conversations.js";
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
  isApprovingListing: boolean;
  isUpdatingListing: boolean;
  error: UiError | null;
  /** Attribute keys whose value changed on the most recent backend update. */
  changedFields: ReadonlySet<string>;
}

export interface ListingActionResult {
  ok: boolean;
  error?: string;
}

export interface UseConversationResult extends ConversationUiState {
  sendMessage: (content: string) => Promise<boolean>;
  updateListing: (input: UpdateListingRequest) => Promise<ListingActionResult>;
  approveListing: () => Promise<ListingActionResult>;
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
  const [isUpdatingListing, setIsUpdatingListing] = useState(false);
  const [isApprovingListing, setIsApprovingListing] = useState(false);
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

  const updateListing = useCallback(
    async (input: UpdateListingRequest): Promise<ListingActionResult> => {
      if (!conversation || isUpdatingListing || isApprovingListing) {
        return { ok: false, error: "The listing is not ready to update." };
      }

      setIsUpdatingListing(true);
      try {
        const fresh = await updateListingApi(conversation.id, input);
        const view = fromGetResponse(fresh);
        setChangedFields(new Set());
        previousAttributesRef.current = view.itemDraft?.attributes ?? null;
        setConversation(view);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: toUiError(err, "listing").message };
      } finally {
        setIsUpdatingListing(false);
      }
    },
    [conversation, isApprovingListing, isUpdatingListing],
  );

  const approveListing = useCallback(async (): Promise<ListingActionResult> => {
    if (!conversation || isApprovingListing || isUpdatingListing) {
      return { ok: false, error: "The listing is not ready to approve." };
    }

    setIsApprovingListing(true);
    try {
      const fresh = await approveListingApi(conversation.id);
      const view = fromGetResponse(fresh);
      setChangedFields(new Set());
      previousAttributesRef.current = view.itemDraft?.attributes ?? null;
      setConversation(view);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: toUiError(err, "approve").message };
    } finally {
      setIsApprovingListing(false);
    }
  }, [conversation, isApprovingListing, isUpdatingListing]);

  const dismissError = useCallback(() => setError(null), []);

  return {
    conversation,
    isInitializing,
    isSending,
    isApprovingListing,
    isUpdatingListing,
    error,
    changedFields,
    sendMessage,
    updateListing,
    approveListing,
    startNewListing,
    dismissError,
  };
}
