"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useOrchestrator } from "@/providers/orchestrator-context";
import { useChatStream } from "@/hooks/useChatStream";
import { useAutoBrowserSession } from "@/hooks/useAutoBrowserSession";
import { LivePreviewPanel } from "@/components/live/LivePreviewPanel";
import { AbortButton } from "./AbortButton";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { TypingIndicator } from "./TypingIndicator";
import { Dropdown } from "../common/Dropdown";
import { CloudLoginDialog } from "./CloudLoginDialog";
import { LocalCloudToggle, type TaskTarget } from "./LocalCloudToggle";
import { isWebMode, isDesktopMode, getCloudOrchestratorUrl } from "@/lib/mode";
import { useCloudAuth } from "@/providers/cloud-auth-context";
import { CloudLivePreview } from "@/components/live/CloudLivePreview";
import type { ChatMessage } from "@mayra/contracts";

function conversationHistory(
  messages: ReturnType<typeof useChatStream>["messages"],
): string[] {
  return messages
    .flatMap((message) => {
      if (message.kind === "user") return [`user:${message.text}`];
      if (message.kind === "assistant")
        return [`assistant:${message.markdown}`];
      if (message.kind === "action_log") {
        const a = message.action;
        return [
          `action:step=${message.step} executed=${a.action} ref=${a.target_ref} reason=${a.reason}`,
        ];
      }
      return [];
    })
    .filter((line) => line.trim().length > 0)
    .slice(-24);
}

const CHAT_MAX_STEPS = 40;
const CONTINUE_STEPS = 25;

function SidebarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x={3} y={3} width={18} height={18} rx={2} />
      <path d="M15 3v18" />
    </svg>
  );
}

export function ChatWindow() {
  const {
    client,
    baseUrl,
    token,
    cloudClient,
    cloudBaseUrl,
    cloudToken,
    cloudAvailable,
  } = useOrchestrator();
  const browserSession = useAutoBrowserSession();
  const cloudAuth = useCloudAuth();
  const webMode = isWebMode();
  const [taskId, setTaskId] = useState<string | null>(null);
  const [cloudSessionId, setCloudSessionId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const lastProviderRef = useRef("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Per-task target: "local" (sidecar) or "cloud" (Modal orchestrator).
  // In web mode, always "cloud". In desktop mode, user picks per task.
  const [target, setTarget] = useState<TaskTarget>(isWebMode() ? "cloud" : "local");
  const [showCloudLogin, setShowCloudLogin] = useState(false);

  // The active client/URL/token depend on the target.
  // In web mode, target is always "cloud" so these are the cloud values.
  const activeClient = target === "cloud" ? cloudClient : client;
  const activeBaseUrl = target === "cloud" ? cloudBaseUrl : baseUrl;
  const activeToken = target === "cloud" ? cloudToken : token;

  // Show the Local/Cloud toggle only in desktop mode when cloud URL is configured.
  const showTargetToggle = isDesktopMode() && getCloudOrchestratorUrl() !== null;

  const searchParams = useSearchParams();
  const router = useRouter();
  const queryTaskId = searchParams.get("t");

  const {
    messages,
    done,
    failed,
    lastDoneStatus,
    start,
    reset,
    appendUserMessage,
    appendSystemMessage,
    loadHistoryState,
  } = useChatStream(activeBaseUrl, activeToken);

  // Sync taskId and message history when URL query param changes
  useEffect(() => {
    if (queryTaskId) {
      setTaskId(queryTaskId);
      try {
        const cached = localStorage.getItem(`mayra.chat.task.${queryTaskId}`);
        if (cached) {
          const parsed = JSON.parse(cached) as {
            messages: ChatMessage[];
            done: boolean;
            failed: boolean;
            lastDoneStatus?: string;
          };
          loadHistoryState(
            parsed.messages,
            parsed.done,
            parsed.failed,
            parsed.lastDoneStatus,
          );
          if (!parsed.done && !parsed.failed && activeBaseUrl && activeToken) {
            start(queryTaskId);
          }
        }
      } catch (e) {
        console.error("Failed to load task from local storage:", e);
      }
    } else {
      setTaskId(null);
      reset();
    }
  }, [queryTaskId, activeBaseUrl, activeToken, loadHistoryState, start, reset]);

  // Persist message state to local storage when changed
  useEffect(() => {
    if (taskId && messages.length > 0) {
      try {
        const stateToSave = { messages, done, failed, lastDoneStatus };
        localStorage.setItem(
          `mayra.chat.task.${taskId}`,
          JSON.stringify(stateToSave),
        );
      } catch (e) {
        console.error("Failed to persist task state:", e);
      }
    }
  }, [taskId, messages, done, failed, lastDoneStatus]);

  // Auto-scroll to bottom of chat list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const lastShot = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (!m) continue;
      if (m.kind === "assistant" && m.observation_screenshot_path) {
        return m.observation_screenshot_path;
      }
      if (m.kind === "action_log" && m.screenshot_path) {
        return m.screenshot_path;
      }
    }
    return browserSession.previewPath;
  }, [browserSession.previewPath, messages]);

  const lastUserMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m?.kind === "user") return m.text;
    }
    return null;
  }, [messages]);

  const onSend = useCallback(
    async (text: string, provider: string) => {
      if (!activeClient) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      lastProviderRef.current = provider;

      if (taskId) {
        // If the agent is still running, send the message to the orchestrator
        // immediately so it steers the agent at the next step. The orchestrator's
        // `_drain_user_messages` picks it up from the task's message queue.
        if (!done && !failed) {
          appendUserMessage(trimmed);
          try {
            await activeClient.postTaskMessage(taskId, trimmed);
          } catch (e) {
            appendSystemMessage(
              e instanceof Error ? e.message : "Could not send message to agent.",
              "error",
            );
          }
          return;
        }
        // Agent has finished — resume with a continue call.
        appendUserMessage(trimmed);
        try {
          await activeClient.postTaskMessage(taskId, trimmed);
          await activeClient.continueTask(taskId, {
            additional_steps: CONTINUE_STEPS,
          });
          start(taskId);
        } catch (e) {
          appendSystemMessage(
            e instanceof Error ? e.message : "Could not continue task.",
            "error",
          );
        }
        return;
      }

      const initialMessages = conversationHistory(messages);
      appendUserMessage(trimmed);
      try {
        // For cloud tasks, create a managed Chromium session first (no local CDP port).
        // For local tasks, use the existing browser session from useAutoBrowserSession.
        let sessionId = browserSession.sessionId || null;
        if (target === "cloud") {
          try {
            const session = await activeClient.connectSession();
            sessionId = session.session_id;
            setCloudSessionId(session.session_id);
          } catch (e) {
            appendSystemMessage(
              e instanceof Error ? `Cloud browser launch failed: ${e.message}` : "Cloud browser launch failed.",
              "error",
            );
            return;
          }
        }

        const res = await activeClient.createTask({
          goal: trimmed,
          allowed_domains: [],
          initial_messages: initialMessages,
          session_id: sessionId,
          provider: provider || null,
          start_agent_loop: true,
          max_steps: CHAT_MAX_STEPS,
        });

        const newHistoryItem = {
          id: res.task_id,
          goal: trimmed,
          ts: new Date().toISOString(),
        };
        try {
          const rawHistory = localStorage.getItem("mayra.chat.history");
          const historyItems = rawHistory ? JSON.parse(rawHistory) : [];
          historyItems.push(newHistoryItem);
          localStorage.setItem(
            "mayra.chat.history",
            JSON.stringify(historyItems),
          );
          window.dispatchEvent(new Event("mayra-history-updated"));
        } catch (err) {
          console.error("Failed to save history list item:", err);
        }

        setTaskId(res.task_id);
        router.push(`/?t=${res.task_id}`);
      } catch (e) {
        appendSystemMessage(
          e instanceof Error ? e.message : "Could not start chat task.",
          "error",
        );
      }
    },
    [
      activeClient,
      target,
      browserSession.ready,
      browserSession.sessionId,
      taskId,
      done,
      failed,
      messages,
      start,
      appendUserMessage,
      appendSystemMessage,
      router,
    ],
  );

  const onRetry = useCallback(() => {
    if (!lastUserMessage) return;
    void onSend(lastUserMessage, lastProviderRef.current);
  }, [lastUserMessage, onSend]);

  const onAbort = useCallback(async () => {
    if (!activeClient || !taskId) return;
    await activeClient.abort(taskId);
  }, [activeClient, taskId]);

  const streamingAssistant = messages.some(
    (m) => m.kind === "assistant" && m.streaming,
  );
  const awaitingAssistant =
    Boolean(taskId && activeClient && !done && !failed) &&
    messages.some((m) => m.kind === "user") &&
    !messages.some((m) => m.kind === "assistant") &&
    !streamingAssistant;

  const budgetPaused = Boolean(
    taskId && done && lastDoneStatus === "budget_exhausted",
  );
  // Task ended due to an issue (not success, budget exhaustion, or user-initiated abort).
  // Show a banner with a Continue button so the user can send a follow-up.
  const taskEnded = Boolean(
    taskId &&
      done &&
      (failed || lastDoneStatus === "degraded"),
  );
  const taskEndedMessage =
    lastDoneStatus === "degraded"
      ? "The agent finished with issues."
      : "The agent ran into an issue.";
  const hasMessages = messages.length > 0;
  const showPreview = previewOpen && (webMode ? Boolean(cloudSessionId) : Boolean(browserSession.sessionId));

  const sessionOptions = useMemo(() => {
    const opts = [{ value: "", label: "Select Browser Session" }];
    browserSession.sessions.forEach((s) => {
      opts.push({
        value: s.session_id,
        label: `Session ${s.session_id.slice(0, 8)}`,
      });
    });
    return opts;
  }, [browserSession.sessions]);

  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        height: "100%",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* Left Chat Pane */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
          borderRight: showPreview ? "1px solid var(--border)" : "none",
        }}
      >
        {/* Low contrast session header */}
        <header
          className="chat-header"
          style={{
            height: "60px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 1.5rem",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: "0.95rem",
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
              maxWidth: "50%",
            }}
          >
            {taskId
              ? `Task: ${messages.find((m) => m.kind === "user")?.text || "Active Run"}`
              : "New Task"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              {/* Hide the browser session dropdown in web mode (cloud manages Chromium automatically) */}
              {!webMode && (
                <>
                  <span
                    className={`status-dot ${browserSession.ready ? "ready" : browserSession.status === "error" ? "error" : "working"}`}
                  />
                  <Dropdown
                    value={browserSession.sessionId || ""}
                    onChange={(val) => browserSession.setSessionId(val)}
                    options={sessionOptions}
                    disabled={
                      !activeClient || !browserSession.ready || Boolean(taskId && !done)
                    }
                    placeholder="Select Browser Session"
                    triggerStyle={{ minWidth: "180px" }}
                  />
                </>
              )}
              {/* Show the preview toggle in both modes */}
              <button
                type="button"
                onClick={() => setPreviewOpen(!previewOpen)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: previewOpen ? "var(--fg)" : "var(--muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.4rem",
                  borderRadius: "8px",
                  transition: "all 0.2s",
                }}
                className="preview-toggle-btn"
                title={
                  previewOpen ? "Hide browser preview" : "Show browser preview"
                }
              >
                <SidebarIcon />
              </button>
              {/* Web mode: show a warm-up indicator while the orchestrator is cold-starting */}
              {webMode && cloudAuth.validating && (
                <span style={{ fontSize: "0.75rem", color: "var(--muted, #888)" }}>
                  Warming up cloud orchestrator…
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic chat box view */}
        {!hasMessages ? (
          <div className="chat-centered-container">
            <h1 className="centered-first-line">Your personal web agent.</h1>
            <h1 className="centered-second-line">What do you need?</h1>
            <div style={{ width: "100%" }}>
              <Composer
                onSend={onSend}
                disabled={!activeClient}
                isAbortable={Boolean(taskId && !done)}
                onAbort={onAbort}
                target={target}
                onTargetChange={setTarget}
                showTargetToggle={showTargetToggle}
                cloudAvailable={cloudAvailable}
                onCloudLoginRequired={() => setShowCloudLogin(true)}
              />
            </div>
            {!webMode && browserSession.error && (
              <div
                className="banner"
                style={{ marginTop: "1rem", width: "100%" }}
              >
                {browserSession.error}
              </div>
            )}
          </div>
        ) : (
          <div className="chat-active-container">
            <div className="chat-messages-scroll">
              <div className="chat-messages-maxwidth">
                {budgetPaused && (
                  <p
                    className="muted"
                    style={{
                      marginBottom: "0.75rem",
                      padding: "0.5rem 1rem",
                      background: "rgba(245,158,11,0.05)",
                      borderRadius: "8px",
                    }}
                  >
                    Step budget reached. Type another message to resume in the
                    same browser session.
                  </p>
                )}
                <MessageList
                  messages={messages}
                  baseUrl={activeBaseUrl}
                  token={activeToken}
                  onRetry={lastUserMessage ? onRetry : undefined}
                  isDone={done || failed}
                />
                {taskEnded && (
                  <div
                    style={{
                      margin: "0.5rem 1rem",
                      padding: "0.75rem 1rem",
                      background: "rgba(239,68,68,0.06)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--fg)",
                        flex: 1,
                      }}
                    >
                      {taskEndedMessage}{" "}
                      <span className="muted">
                          Click Continue to resume, or send a follow-up message.
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (!activeClient || !taskId) return;
                          // If the user already sent a follow-up message, just
                          // resume the task without injecting a fake "Continue"
                          // message that would override their intent.
                          const lastMsg = messages[messages.length - 1];
                          if (lastMsg?.kind === "user") {
                            void activeClient
                              .continueTask(taskId, {
                                additional_steps: CONTINUE_STEPS,
                              })
                              .then(() => start(taskId))
                              .catch((e: unknown) => {
                                appendSystemMessage(
                                  e instanceof Error
                                    ? e.message
                                    : "Could not continue task.",
                                  "error",
                                );
                              });
                          } else {
                            // Kickstart the task with a bare "continue" message.
                            void onSend("Continue", lastProviderRef.current);
                          }
                        }}
                        style={{
                        padding: "0.4rem 0.9rem",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        background: "var(--fg)",
                        color: "var(--bg)",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Continue
                    </button>
                  </div>
                )}
                {awaitingAssistant && (
                  <p className="muted" style={{ margin: "0.5rem 1rem" }}>
                    Waiting for browser snapshot + model…
                  </p>
                )}
                {streamingAssistant && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div
              className="chat-composer-wrapper"
              style={{
                flexDirection: "column",
                gap: "0.5rem",
                alignItems: "center",
              }}
            >
              {!webMode && browserSession.error && (
                <div
                  className="banner"
                  style={{
                    width: "100%",
                    maxWidth: "760px",
                    pointerEvents: "auto",
                    margin: 0,
                  }}
                >
                  {browserSession.error}
                </div>
              )}
              <Composer
                onSend={onSend}
                disabled={!activeClient}
                isAbortable={Boolean(taskId && !done)}
                onAbort={onAbort}
                target={target}
                onTargetChange={setTarget}
                showTargetToggle={showTargetToggle}
                cloudAvailable={cloudAvailable}
                onCloudLoginRequired={() => setShowCloudLogin(true)}
              />
            </div>
          </div>
        )}

      {/* Cloud login dialog for desktop cloud toggle */}
      <CloudLoginDialog
        open={showCloudLogin}
        onClose={() => setShowCloudLogin(false)}
        onSuccess={() => {
          // After successful login, switch to cloud target
          setTarget("cloud");
        }}
      />
      </div>

      {/* Right Browser Viewport Pane */}
      {showPreview && !webMode && (
        <div
          style={{
            width: "400px",
            height: "100%",
            overflowY: "auto",
            padding: "1.5rem",
            flexShrink: 0,
            background: "var(--bg)",
          }}
        >
          <LivePreviewPanel
            screenshotPath={lastShot}
            sessionId={browserSession.sessionId}
            client={activeClient}
          />
        </div>
      )}
      {/* Cloud live preview — web mode only */}
      {showPreview && webMode && cloudSessionId && (
        <div
          style={{
            width: "400px",
            height: "100%",
            overflowY: "auto",
            padding: "1rem",
            flexShrink: 0,
            background: "var(--bg)",
          }}
        >
          <CloudLivePreview
            sessionId={cloudSessionId}
            client={activeClient}
          />
        </div>
      )}
    </div>
  );
}
