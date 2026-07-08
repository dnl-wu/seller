import type { ConversationState } from "@seller/shared";
import {
  getWorkflowStage,
  WORKFLOW_STAGES,
  WORKFLOW_STAGE_LABELS,
} from "../../utils/conversationState.js";

interface WorkflowProgressProps {
  state: ConversationState;
}

export function WorkflowProgress({ state }: WorkflowProgressProps) {
  const currentStage = getWorkflowStage(state);
  const currentIndex = WORKFLOW_STAGES.indexOf(currentStage);
  const isComplete = state === "approved";

  return (
    <ol className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Listing progress">
      {WORKFLOW_STAGES.map((stage, index) => {
        const isCurrent = stage === currentStage && !isComplete;
        const isDone = index < currentIndex || isComplete;
        return (
          <li key={stage}>
            <span
              className={
                isCurrent
                  ? "text-xs font-semibold text-primary-accent"
                  : isDone
                    ? "text-xs font-semibold text-success"
                    : "text-xs font-medium text-secondary-text"
              }
            >
              {WORKFLOW_STAGE_LABELS[stage]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
