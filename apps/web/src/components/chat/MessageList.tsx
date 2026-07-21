"use client";

import { useState } from "react";
import type { ChatMessage } from "@mayra/contracts";
import { MessageActionLog } from "./MessageActionLog";
import { MessageApprovalRequest } from "./MessageApprovalRequest";
import { MessageAssistant } from "./MessageAssistant";
import { MessageSystemStatus } from "./MessageSystemStatus";
import { MessageUser } from "./MessageUser";
import { ChatObservationThumbnail } from "./ChatObservationThumbnail";

type Props = {
  messages: ChatMessage[];
  baseUrl: string | null;
  token: string | null;
  onRetry?: () => void;
  // When true, the task has finished (done/failed/aborted) and the last step
  // should be rendered as completed rather than "Executing next action...".
  isDone?: boolean;
};

interface StepGroup {
  id: string;
  stepNumber: number;
  statusMessages: Extract<ChatMessage, { kind: "system_status" }>[];
  assistantMessage: Extract<ChatMessage, { kind: "assistant" }> | null;
  actionMessage: Extract<ChatMessage, { kind: "action_log" }> | null;
  approvalMessage: Extract<ChatMessage, { kind: "approval_request" }> | null;
}

// Inline Icon Components
function GlobeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx={12} cy={12} r={10} />
      <path d="M12 2a14.5 14.5 0 000 20M2 12h20" />
    </svg>
  );
}

// Chevron Icon
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

function MousePointerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3zM13 13l6 6" />
    </svg>
  );
}

function KeyboardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x={2} y={4} width={20} height={16} rx={2} ry={2} />
      <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M18 12h.01M7 16h10" />
    </svg>
  );
}

function ScrollIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx={12} cy={12} r={10} />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx={12} cy={13} r={4} />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3v1M12 20v1M4.22 4.22l.71.71M18.36 18.36l.71.71M3 12h1M20 12h1M4.22 19.78l.71-.71M18.36 5.64l.71-.71" />
    </svg>
  );
}

function LoadingIcon() {
  return (
    <svg
      viewBox="0 0 256 256"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth={24}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="spin-teal"
    >
      <path d="M168 40.7a96 96 0 1 1-80 0" />
    </svg>
  );
}

export function MessageList({ messages, baseUrl, token, onRetry, isDone }: Props) {
  const [openThoughts, setOpenThoughts] = useState<Record<string, boolean>>({});

  // 1. Group flat messages into turns separated by follow-up user messages
  const preRunMessages: ChatMessage[] = [];
  const turns: { followUpUser: ChatMessage | null; steps: StepGroup[] }[] = [];
  const postRunMessages: ChatMessage[] = [];

  let currentSteps: StepGroup[] = [];
  let currentGroup: StepGroup | null = null;
  let sawAgentContent = false;
  let pendingFollowUp: ChatMessage | null = null;
  let nextGroupId = 0;

  for (const m of messages) {
    if (m.kind === "user") {
      if (!sawAgentContent) {
        preRunMessages.push(m);
      } else {
        // Follow-up user message — starts a new turn boundary.
        // Flush the current turn's steps if any.
        if (currentSteps.length > 0) {
          turns.push({ followUpUser: pendingFollowUp, steps: currentSteps });
          currentSteps = [];
          currentGroup = null;
        }
        pendingFollowUp = m;
      }
      continue;
    }

    sawAgentContent = true;

    let stepNum: number | null = null;
    if (m.kind === "system_status") {
      const match = m.text.match(/^Step (\d+):/i);
      if (match) {
        stepNum = parseInt(match[1], 10);
      }
    } else if (m.kind === "action_log") {
      stepNum = m.step;
    }

    if (stepNum !== null) {
      if (!currentGroup || currentGroup.stepNumber !== stepNum) {
        let group: StepGroup | undefined = currentSteps.find(
          (g) => g.stepNumber === stepNum,
        );
        if (!group) {
          group = {
            id: String(nextGroupId++),
            stepNumber: stepNum,
            statusMessages: [],
            assistantMessage: null,
            actionMessage: null,
            approvalMessage: null,
          };
          currentSteps.push(group);
        }
        currentGroup = group;
      }
    }

    if (currentGroup) {
      if (m.kind === "system_status") {
        if (
          m.text.toLowerCase().includes("budget exhausted") ||
          m.text.toLowerCase().includes("paused for 2fa")
        ) {
          postRunMessages.push(m);
        } else {
          currentGroup.statusMessages.push(m);
        }
      } else if (m.kind === "assistant") {
        currentGroup.assistantMessage = m;
      } else if (m.kind === "action_log") {
        currentGroup.actionMessage = m;
      } else if (m.kind === "approval_request") {
        currentGroup.approvalMessage = m;
      }
    } else {
      if (
        m.kind === "system_status" &&
        (m.text.includes("error") ||
          m.text.includes("failed") ||
          m.text.includes("aborted"))
      ) {
        postRunMessages.push(m);
      } else {
        preRunMessages.push(m);
      }
    }
  }

  // Flush the final turn (include pending follow-up even if no steps yet,
  // otherwise the follow-up message vanishes from the UI when the stream
  // ends before the agent produces new steps).
  if (currentSteps.length > 0 || pendingFollowUp) {
    turns.push({ followUpUser: pendingFollowUp, steps: currentSteps });
  }

  // Flatten all completed steps from past turns and extract the active step from the last turn
  const allTurnsExceptLast = turns.slice(0, -1);
  const lastTurn = turns.length > 0 ? turns[turns.length - 1] : null;

  const pastSteps: StepGroup[] = [];
  for (const t of allTurnsExceptLast) {
    pastSteps.push(...t.steps);
  }

  const currentTurnSteps: StepGroup[] = lastTurn?.steps ?? [];
  const completedSteps = currentTurnSteps.slice(0, -1);
  const activeStep =
    currentTurnSteps.length > 0
      ? currentTurnSteps[currentTurnSteps.length - 1]
      : null;

  // Determine the follow-up user message for the current turn
  const currentFollowUpUser = lastTurn?.followUpUser ?? null;

  // 3. Helper to calculate thinking duration
  const getThinkingDuration = (step: StepGroup) => {
    const startStatus = step.statusMessages.find((s) =>
      s.text.includes("asking the model"),
    );
    const startTs = startStatus ? new Date(startStatus.ts).getTime() : null;
    const endTs = step.actionMessage
      ? new Date(step.actionMessage.ts).getTime()
      : step.assistantMessage && !step.assistantMessage.streaming
        ? new Date(step.assistantMessage.ts).getTime()
        : null;

    if (startTs && endTs) {
      const diffSec = Math.max(Math.round((endTs - startTs) / 1000), 1);
      return `${diffSec}s`;
    }
    if (startTs) {
      const elapsed = Math.max(Math.round((Date.now() - startTs) / 1000), 1);
      return `${elapsed}s`;
    }
    return null;
  };

  const getThinkingDurationSec = (step: StepGroup) => {
    const startStatus = step.statusMessages.find((s) =>
      s.text.includes("asking the model"),
    );
    const startTs = startStatus ? new Date(startStatus.ts).getTime() : null;
    const endTs = step.actionMessage
      ? new Date(step.actionMessage.ts).getTime()
      : step.assistantMessage && !step.assistantMessage.streaming
        ? new Date(step.assistantMessage.ts).getTime()
        : null;

    if (startTs && endTs) {
      return Math.max(Math.round((endTs - startTs) / 1000), 1);
    }
    if (startTs) {
      return Math.max(Math.round((Date.now() - startTs) / 1000), 1);
    }
    return 0;
  };

  // 4. Render a single Step Group item
  const renderStepItem = (step: StepGroup, isActive: boolean) => {
    const isScreenshotDone = step.assistantMessage !== null;
    const isScreenshotting = step.statusMessages.some((s) =>
      s.text.includes("reading browser snapshot"),
    );

    const assistant = step.assistantMessage;
    const hasThoughts = assistant && assistant.thoughts;
    const isThinking =
      hasThoughts && assistant.streaming && !assistant.markdown;
    const thoughtDuration = getThinkingDuration(step);

    const action = step.actionMessage?.action;
    const isActionDone = step.actionMessage !== null;

    // For completed (non-active) steps that never received an assistant message
    // (e.g. the stream ended mid-step), cap the screenshot state so we don't
    // show a stuck "Capturing page screenshot..." spinner forever.
    const screenshotCap = isScreenshotDone || (!isActive && isScreenshotting);

    return (
      <div className="step-item" key={step.id}>
        {/* Screenshot capturing row */}
        {isScreenshotting || isScreenshotDone ? (
          <div className={`step-row ${!screenshotCap && isActive ? "loading" : ""}`}>
            <span className="step-row-icon">
              {screenshotCap ? <CameraIcon /> : <LoadingIcon />}
            </span>
            <span className="step-row-text">
              {screenshotCap
                ? "Captured page screenshot"
                : "Capturing page screenshot..."}
            </span>
          </div>
        ) : null}

        {/* Thinking row */}
        {hasThoughts ? (
          <div className="step-row">
            <span className="step-row-icon">
              {isThinking ? (
                <SparklesIcon className="thinking-teal pulse" />
              ) : (
                <SparklesIcon className="thinking-teal" />
              )}
            </span>
            <div className="step-row-text">
              {isThinking ? (
                <span className="thinking-teal font-medium animate-pulse">
                  Thinking
                </span>
              ) : (
                <details
                  className="step-thought-details"
                  open={openThoughts[step.id] ?? true}
                  onToggle={(e) => {
                    const isOpen = (e.target as HTMLDetailsElement).open;
                    setOpenThoughts((prev) => ({
                      ...prev,
                      [step.id]: isOpen,
                    }));
                  }}
                >
                  <summary>
                    Thought for {thoughtDuration || "1s"}
                    <ChevronRightIcon className="details-chevron" />
                  </summary>
                  <div className="step-thought-markdown">
                    {step.assistantMessage?.thoughts}
                  </div>
                </details>
              )}
            </div>
          </div>
        ) : null}

        {/* Assistant Message Bubble */}
        {assistant && (assistant.markdown || assistant.streaming) ? (
          <MessageAssistant message={assistant} />
        ) : null}

        {/* Action log row */}
        {action ? (
          <div className="step-row">
            <span className="step-row-icon">
              {action.action === "navigate" ? (
                <GlobeIcon />
              ) : action.action === "click" ? (
                <MousePointerIcon />
              ) : action.action === "type" ? (
                <KeyboardIcon />
              ) : action.action === "scroll" ? (
                <ScrollIcon />
              ) : (
                <ClockIcon />
              )}
            </span>
            <div className="step-row-text">
              <details className="step-action-details">
                <summary>
                  <span className="font-medium">
                    {action.action === "navigate"
                      ? `Navigated to ${action.value}`
                      : action.action === "click"
                        ? `Clicked element ${action.target_ref}`
                        : action.action === "type"
                          ? `Typed "${action.value}" into ${action.target_ref}`
                          : action.action === "scroll"
                            ? "Scrolled page"
                            : `Waited for page load`}
                  </span>
                  <ChevronRightIcon className="details-chevron" />
                  {step.actionMessage?.screenshot_path ? (
                    <span className="step-action-thumb-spacer">
                      <ChatObservationThumbnail
                        screenshotPath={step.actionMessage.screenshot_path}
                        screenshotUrl={step.actionMessage.screenshot_url}
                        variant="compact"
                      />
                    </span>
                  ) : null}
                </summary>
                <div className="step-action-expanded">
                  <div>
                    <span className="muted font-semibold">Action:</span>{" "}
                    {action.action}
                  </div>
                  {action.target_ref && (
                    <div>
                      <span className="muted font-semibold">Target:</span>{" "}
                      <code>{action.target_ref}</code>
                    </div>
                  )}
                  {action.value && (
                    <div>
                      <span className="muted font-semibold">Value:</span>{" "}
                      {action.value}
                    </div>
                  )}
                  <div>
                    <span className="muted font-semibold">Reason:</span>{" "}
                    {action.reason}
                  </div>
                  <div>
                    <span className="muted font-semibold">Risk:</span>{" "}
                    <span
                      className={`badge badge-${action.risk === "high" ? "high" : action.risk === "medium" ? "med" : "low"}`}
                    >
                      {action.risk}
                    </span>
                  </div>
                </div>
              </details>
            </div>
          </div>
        ) : /* Waiting / executing active states */
        isActive && isScreenshotDone && !isThinking && !isActionDone ? (
          <div className="step-row loading">
            <span className="step-row-icon">
              <LoadingIcon />
            </span>
            <span className="step-row-text">
              {step.approvalMessage
                ? "Waiting for user approval..."
                : "Executing next action..."}
            </span>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div>
      {/* 1. Pre-run messages (user bubble) */}
      {preRunMessages.map((m) => {
        if (m.kind === "user") return <MessageUser key={m.id} message={m} />;
        if (m.kind === "system_status")
          return (
            <MessageSystemStatus key={m.id} message={m} onRetry={onRetry} />
          );
        return null;
      })}

      {/* 2. Past turns' steps */}
      {pastSteps.map((step) => renderStepItem(step, false))}

      {/* 3. Current turn's completed steps */}
      {completedSteps.map((step) => renderStepItem(step, false))}

      {/* 4. Current follow-up user message — render BEFORE active step */}
      {currentFollowUpUser && currentFollowUpUser.kind === "user" ? (
        <MessageUser message={currentFollowUpUser} />
      ) : null}

      {/* 5. Active Step Progress */}
      {activeStep ? renderStepItem(activeStep, !isDone) : null}

      {/* 6. Interactive Approval Request (if active) */}
      {activeStep && activeStep.approvalMessage ? (
        <div style={{ margin: "0.5rem 1rem" }}>
          <MessageApprovalRequest
            message={activeStep.approvalMessage}
            baseUrl={baseUrl}
            token={token}
          />
        </div>
      ) : null}



      {/* 8. Post-run messages (done, failure, etc.) */}
      {postRunMessages.map((m) => {
        if (m.kind === "system_status")
          return (
            <MessageSystemStatus key={m.id} message={m} onRetry={onRetry} />
          );
        if (m.kind === "user") return <MessageUser key={m.id} message={m} />;
        return null;
      })}
    </div>
  );
}
