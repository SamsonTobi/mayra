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
  const { client, port, token } = useOrchestrator();
  const browserSession = useAutoBrowserSession();
  const [taskId, setTaskId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<
    { id: string; text: string; provider: string }[]
  >([]);
  const lastProviderRef = useRef("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  } = useChatStream(port, token);

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
          if (!parsed.done && !parsed.failed && port && token) {
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
  }, [queryTaskId, port, token, loadHistoryState, start, reset]);

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
      if (!client) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      lastProviderRef.current = provider;

      if (taskId) {
        // If the agent is still working, queue this message instead of sending immediately.
        if (!done && !failed) {
          setPendingMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID?.() ?? `${Date.now()}`,
              text: trimmed,
              provider,
            },
          ]);
          return;
        }
        appendUserMessage(trimmed);
        try {
          await client.postTaskMessage(taskId, trimmed);
          await client.continueTask(taskId, {
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
        const res = await client.createTask({
          goal: trimmed,
          allowed_domains: [],
          initial_messages: initialMessages,
          session_id: browserSession.sessionId || null,
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
      client,
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

  const flushPending = useCallback(async () => {
    if (!client || !taskId || pendingMessages.length === 0) return;
    const batch = [...pendingMessages];
    setPendingMessages([]);
    for (const pm of batch) {
      appendUserMessage(pm.text);
      try {
        await client.postTaskMessage(taskId, pm.text);
      } catch (e) {
        appendSystemMessage(
          e instanceof Error ? e.message : "Could not send queued message.",
          "error",
        );
        return;
      }
    }
    try {
      await client.continueTask(taskId, { additional_steps: CONTINUE_STEPS });
      start(taskId);
    } catch (e) {
      appendSystemMessage(
        e instanceof Error ? e.message : "Could not continue task.",
        "error",
      );
    }
  }, [
    client,
    taskId,
    pendingMessages,
    appendUserMessage,
    appendSystemMessage,
    start,
  ]);

  const removePending = useCallback((id: string) => {
    setPendingMessages((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const onRetry = useCallback(() => {
    if (!lastUserMessage) return;
    void onSend(lastUserMessage, lastProviderRef.current);
  }, [lastUserMessage, onSend]);

  const onAbort = useCallback(async () => {
    if (!client || !taskId) return;
    await client.abort(taskId);
  }, [client, taskId]);

  // Auto-flush pending messages when the agent finishes its current task
  useEffect(() => {
    if ((done || failed) && pendingMessages.length > 0) {
      flushPending();
    }
  }, [done, failed, pendingMessages.length, flushPending]);

  const streamingAssistant = messages.some(
    (m) => m.kind === "assistant" && m.streaming,
  );
  const awaitingAssistant =
    Boolean(taskId && client && !done && !failed) &&
    messages.some((m) => m.kind === "user") &&
    !messages.some((m) => m.kind === "assistant") &&
    !streamingAssistant;

  const budgetPaused = Boolean(
    taskId && done && lastDoneStatus === "budget_exhausted",
  );
  const hasMessages = messages.length > 0;
  const showPreview = previewOpen && Boolean(browserSession.sessionId);

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
              <span
                className={`status-dot ${browserSession.ready ? "ready" : browserSession.status === "error" ? "error" : "working"}`}
              />
              <Dropdown
                value={browserSession.sessionId || ""}
                onChange={(val) => browserSession.setSessionId(val)}
                options={sessionOptions}
                disabled={
                  !client || !browserSession.ready || Boolean(taskId && !done)
                }
                placeholder="Select Browser Session"
                triggerStyle={{ minWidth: "180px" }}
              />
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
                disabled={!client}
                isAbortable={Boolean(taskId && !done)}
                onAbort={onAbort}
              />
            </div>
            {browserSession.error && (
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
                  port={port}
                  token={token}
                  onRetry={lastUserMessage ? onRetry : undefined}
                />
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
              {/* Pending message queue — shown when agent is busy and user sends follow-ups */}
              {pendingMessages.length > 0 && (
                <div
                  style={{
                    width: "100%",
                    maxWidth: "760px",
                    background: "var(--shaded)",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "0.5rem 0.9rem",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      borderBottom: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>
                      {pendingMessages.length} message
                      {pendingMessages.length > 1 ? "s" : ""} queued
                    </span>
                    <button
                      type="button"
                      onClick={flushPending}
                      style={{
                        padding: "0.25rem 0.6rem",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        background: "var(--fg)",
                        color: "var(--bg)",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                      }}
                    >
                      Send all
                    </button>
                  </div>
                  {pendingMessages.map((pm) => (
                    <div
                      key={pm.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.5rem 0.9rem",
                        fontSize: "0.85rem",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          color: "var(--fg)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {pm.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePending(pm.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--muted)",
                          cursor: "pointer",
                          fontSize: "0.9rem",
                          padding: "0 0.2rem",
                          lineHeight: 1,
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {browserSession.error && (
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
                disabled={!client}
                isAbortable={Boolean(taskId && !done)}
                onAbort={onAbort}
              />
            </div>
          </div>
        )}
      </div>

      {/* Right Browser Viewport Pane */}
      {showPreview && (
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
            client={client}
          />
        </div>
      )}
    </div>
  );
}
