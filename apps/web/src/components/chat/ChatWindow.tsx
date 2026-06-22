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
      if (message.kind === "assistant") return [`assistant:${message.markdown}`];
      if (message.kind === "action_log") {
        const a = message.action;
        return [`action:step=${message.step} executed=${a.action} ref=${a.target_ref} reason=${a.reason}`];
      }
      return [];
    })
    .filter((line) => line.trim().length > 0)
    .slice(-24);
}

const CHAT_MAX_STEPS = 40;
const CONTINUE_STEPS = 25;

export function ChatWindow() {
  const { client, port, token } = useOrchestrator();
  const browserSession = useAutoBrowserSession();
  const [taskId, setTaskId] = useState<string | null>(null);
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
            parsed.lastDoneStatus
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
        localStorage.setItem(`mayra.chat.task.${taskId}`, JSON.stringify(stateToSave));
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
      if (!client || !browserSession.ready) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      lastProviderRef.current = provider;

      if (taskId && done && lastDoneStatus === "budget_exhausted") {
        appendUserMessage(trimmed);
        try {
          await client.postTaskMessage(taskId, trimmed);
          await client.continueTask(taskId, { additional_steps: CONTINUE_STEPS });
          start(taskId);
        } catch (e) {
          appendSystemMessage(e instanceof Error ? e.message : "Could not continue task.", "error");
        }
        return;
      }

      if (taskId && !done) {
        appendUserMessage(trimmed);
        try {
          await client.postTaskMessage(taskId, trimmed);
        } catch (e) {
          appendSystemMessage(e instanceof Error ? e.message : "Could not send message.", "error");
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

        const newHistoryItem = { id: res.task_id, goal: trimmed, ts: new Date().toISOString() };
        try {
          const rawHistory = localStorage.getItem("mayra.chat.history");
          const historyItems = rawHistory ? JSON.parse(rawHistory) : [];
          historyItems.push(newHistoryItem);
          localStorage.setItem("mayra.chat.history", JSON.stringify(historyItems));
          window.dispatchEvent(new Event("mayra-history-updated"));
        } catch (err) {
          console.error("Failed to save history list item:", err);
        }

        setTaskId(res.task_id);
        router.push(`/?t=${res.task_id}`);
      } catch (e) {
        appendSystemMessage(e instanceof Error ? e.message : "Could not start chat task.", "error");
      }
    },
    [client, browserSession.ready, browserSession.sessionId, taskId, done, lastDoneStatus, messages, start, appendUserMessage, appendSystemMessage, router],
  );

  const onRetry = useCallback(() => {
    if (!lastUserMessage) return;
    void onSend(lastUserMessage, lastProviderRef.current);
  }, [lastUserMessage, onSend]);

  const onAbort = useCallback(async () => {
    if (!client || !taskId) return;
    await client.abort(taskId);
  }, [client, taskId]);

  const streamingAssistant = messages.some((m) => m.kind === "assistant" && m.streaming);
  const awaitingAssistant = Boolean(taskId && client && !done && !failed) &&
    messages.some((m) => m.kind === "user") &&
    !messages.some((m) => m.kind === "assistant") &&
    !streamingAssistant;

  const budgetPaused = Boolean(taskId && done && lastDoneStatus === "budget_exhausted");
  const hasMessages = messages.length > 0;
  const showPreview = browserSession.sessionId && hasMessages;

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
    <div style={{ display: "flex", flex: 1, height: "100%", width: "100%", overflow: "hidden" }}>
      {/* Left Chat Pane */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", borderRight: showPreview ? "1px solid var(--border)" : "none" }}>
        
        {/* Low contrast session header */}
        <header className="chat-header" style={{ height: "60px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1.5rem", flexShrink: 0 }}>
          <div style={{ fontWeight: 600, fontSize: "0.95rem", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "50%" }}>
            {taskId ? `Task: ${messages.find(m => m.kind === "user")?.text || "Active Run"}` : "New Task"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className={`status-dot ${browserSession.ready ? "ready" : browserSession.status === "error" ? "error" : "working"}`} />
              <Dropdown
                value={browserSession.sessionId || ""}
                onChange={(val) => browserSession.setSessionId(val)}
                options={sessionOptions}
                disabled={!client || !browserSession.ready || Boolean(taskId && !done)}
                placeholder="Select Browser Session"
                triggerStyle={{ minWidth: "180px" }}
              />
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
                disabled={!client || !browserSession.ready}
                isAbortable={Boolean(taskId && !done)}
                onAbort={onAbort}
              />
            </div>
            {browserSession.error && (
              <div className="banner" style={{ marginTop: "1rem", width: "100%" }}>{browserSession.error}</div>
            )}
          </div>
        ) : (
          <div className="chat-active-container">
            <div className="chat-messages-scroll">
              <div className="chat-messages-maxwidth">
                {budgetPaused && (
                  <p className="muted" style={{ marginBottom: "0.75rem", padding: "0.5rem 1rem", background: "rgba(245,158,11,0.05)", borderRadius: "8px" }}>
                    Step budget reached. Type another message to resume in the same browser session.
                  </p>
                )}
                <MessageList
                  messages={messages}
                  port={port}
                  token={token}
                  onRetry={lastUserMessage && browserSession.ready ? onRetry : undefined}
                />
                {awaitingAssistant && (
                  <p className="muted" style={{ margin: "0.5rem 1rem" }}>Waiting for browser snapshot + model…</p>
                )}
                {streamingAssistant && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            </div>
            
            <div className="chat-composer-wrapper">
              <Composer
                onSend={onSend}
                disabled={!client || !browserSession.ready}
                isAbortable={Boolean(taskId && !done)}
                onAbort={onAbort}
              />
            </div>
          </div>
        )}
      </div>

      {/* Right Browser Viewport Pane */}
      {showPreview && (
        <div style={{ width: "400px", height: "100%", overflowY: "auto", padding: "1.5rem", flexShrink: 0, background: "var(--bg)" }}>
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
