import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "../components/AppHeader/AppHeader.js";
import { ConversationHeader } from "../components/ConversationHeader/ConversationHeader.js";
import { ChatThread } from "../components/ChatThread/ChatThread.js";
import { MessageComposer } from "../components/MessageComposer/MessageComposer.js";
import { WorkflowProgress } from "../components/WorkflowProgress/WorkflowProgress.js";
import { ItemFactsPanel } from "../components/ItemFactsPanel/ItemFactsPanel.js";
import { MissingFields } from "../components/MissingFields/MissingFields.js";
import { ListingPreview } from "../components/ListingPreview/ListingPreview.js";
import { ErrorBanner } from "../components/ErrorBanner/ErrorBanner.js";
import { MobileTabs, type MobileTab } from "../components/MobileTabs/MobileTabs.js";
import { useConversation } from "../hooks/useConversation.js";
import { getOrCreateSellerId } from "../utils/sellerIdentity.js";
import { getThinkingLabel, isAcceptingMessages } from "../utils/conversationState.js";

function getLockedMessage(state: string): string | undefined {
  switch (state) {
    case "ready_to_generate":
    case "generating":
      return "Your listing is being generated.";
    case "draft_ready":
      return "This listing draft is ready, so the conversation is currently locked.";
    case "approved":
      return "This listing has been approved.";
    default:
      return undefined;
  }
}

export function SellerAgentPage() {
  const sellerId = useMemo(() => getOrCreateSellerId(), []);
  const {
    conversation,
    isInitializing,
    isSending,
    isApprovingListing,
    isUpdatingListing,
    error,
    changedFields,
    approveListing,
    sendMessage,
    startNewListing,
    dismissError,
    updateListing,
  } = useConversation(sellerId);

  const [inputValue, setInputValue] = useState("");
  const [activeTab, setActiveTab] = useState<MobileTab>("conversation");
  const hadListingDraftRef = useRef(false);

  useEffect(() => {
    const hasListingDraft = Boolean(conversation?.listingDraft);
    if (hasListingDraft && !hadListingDraftRef.current) {
      setActiveTab("listing");
    }
    hadListingDraftRef.current = hasListingDraft;
  }, [conversation?.listingDraft]);

  const handleSubmit = async () => {
    const succeeded = await sendMessage(inputValue);
    if (succeeded) setInputValue("");
  };

  const handleNewListing = async () => {
    setInputValue("");
    setActiveTab("conversation");
    await startNewListing();
  };

  const composerDisabled =
    isSending || isInitializing || !conversation || !isAcceptingMessages(conversation.state);
  const lockedMessage = conversation ? getLockedMessage(conversation.state) : undefined;
  const thinkingLabel = conversation
    ? getThinkingLabel(conversation.state, conversation.itemDraft?.missingFields.length ?? 0)
    : "";

  return (
    <div className="flex h-screen flex-col bg-main-bg text-primary-text">
      <AppHeader onNewListing={() => void handleNewListing()} newListingDisabled={isInitializing} />

      <MobileTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        hasListingDraft={Boolean(conversation?.listingDraft)}
      />

      {error && (
        <ErrorBanner
          message={error.message}
          onDismiss={dismissError}
          onRetry={error.retryable ? () => void handleSubmit() : undefined}
        />
      )}

      <div className="group flex flex-1 overflow-hidden max-[900px]:flex-col" data-active-tab={activeTab}>
        <section className="flex min-w-0 flex-[0_0_62%] flex-col border-r border-border bg-main-bg max-[900px]:w-full max-[900px]:flex-1 max-[900px]:border-r-0 max-[900px]:group-data-[active-tab=listing]:hidden">
          <ConversationHeader state={conversation?.state ?? null} />
          <ChatThread
            messages={conversation?.messages ?? []}
            isThinking={isSending}
            thinkingLabel={thinkingLabel}
            onSelectPrompt={setInputValue}
          />
          <MessageComposer
            value={inputValue}
            onChange={setInputValue}
            onSubmit={() => void handleSubmit()}
            disabled={composerDisabled}
            lockedMessage={lockedMessage}
          />
        </section>

        <section className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto bg-secondary-surface p-5 max-[900px]:w-full max-[900px]:group-data-[active-tab=conversation]:hidden">
          {conversation && (
            <>
              <div className="rounded-lg border border-border bg-surface p-4">
                <WorkflowProgress state={conversation.state} />
              </div>
              <MissingFields missingFields={conversation.itemDraft?.missingFields ?? []} />
              <ItemFactsPanel
                attributes={conversation.itemDraft?.attributes ?? null}
                changedFields={changedFields}
              />
              <ListingPreview
                listingDraft={conversation.listingDraft}
                conversationState={conversation.state}
                isGenerating={conversation.state === "generating"}
                isApproving={isApprovingListing}
                isUpdating={isUpdatingListing}
                onApproveListing={approveListing}
                onUpdateListing={updateListing}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
