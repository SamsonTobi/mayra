"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useOrchestrator } from "@/providers/orchestrator-context";
import { useChatStream } from "@/hooks/useChatStream";
import { useAutoBrowserSession } from "@/hooks/useAutoBrowserSession";
import { LivePreviewPanel } from "@/components/live/LivePreviewPanel";
import { AbortButton } from "./AbortButton";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { TypingIndicator } from "./TypingIndicator";

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

export function ChatWindow() {
  const { client, port, token } = useOrchestrator();
  const browserSession = useAutoBrowserSession();
  const [taskId, setTaskId] = useState<string | null>(null);
  const lastProviderRef = useRef("");
  const {
    messages,
    done,
    failed,
    lastDoneStatus,
    start,
    appendUserMessage,
    appendSystemMessage,
  } = useChatStream(port, token);

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
          await client.continueTask(taskId, {
            additional_steps: CONTINUE_STEPS,
          });
          start(taskId);
        } catch (e) {
          appendSystemMessage(
            e instanceof Error ? e.message : "Could not continue the task.",
            "error",
          );
        }
        return;
      }

      if (taskId && !done) {
        appendUserMessage(trimmed);
        try {
          await client.postTaskMessage(taskId, trimmed);
        } catch (e) {
          appendSystemMessage(
            e instanceof Error
              ? e.message
              : "Could not send follow-up message.",
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
        setTaskId(res.task_id);
        start(res.task_id);
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
      lastDoneStatus,
      messages,
      start,
      appendUserMessage,
      appendSystemMessage,
    ],
  );

  const onRetry = useCallback(() => {
    if (!lastUserMessage) return;
    void onSend(lastUserMessage, lastProviderRef.current);
  }, [lastUserMessage, onSend]);

  const showDevApprovalInject =
    process.env.NEXT_PUBLIC_MAYRA_DEV_CHAT_TOOLS === "1";

  const onInjectApproval = useCallback(async () => {
    if (!client || !taskId) return;
    await fetch(`http://127.0.0.1:${port}/v1/tasks/${taskId}/inject_approval`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }, [client, taskId, port, token]);

  const onAbort = useCallback(async () => {
    if (!client || !taskId) return;
    await client.abort(taskId);
  }, [client, taskId]);

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

  return (
    <section>
      <h1>Chat</h1>
      <p className="muted">
        Send a goal when the local orchestrator and browser session are ready.
      </p>
      <section className="startup-status" aria-live="polite">
        <div>
          <span
            className={`status-dot ${
              browserSession.ready
                ? "ready"
                : browserSession.status === "error" ||
                    browserSession.status === "manual-needed"
                  ? "error"
                  : "working"
            }`}
            aria-hidden="true"
          />
          <strong>{browserSession.statusText}</strong>
          {browserSession.sessionId ? (
            <span className="muted">
              {" "}
              session {browserSession.sessionId.slice(0, 8)}
              {browserSession.lastNodeCount != null
                ? ` · ${browserSession.lastNodeCount} nodes`
                : ""}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="btn"
          disabled={browserSession.busy || Boolean(taskId && !done)}
          onClick={() => void browserSession.retry()}
        >
          {browserSession.busy ? "Working..." : "Retry startup"}
        </button>
      </section>
      {browserSession.healthError ? (
        <div className="banner">
          agent-browser check failed: {browserSession.healthError}
        </div>
      ) : null}
      {browserSession.error ? (
        <div className="banner">{browserSession.error}</div>
      ) : null}
      <div className="row" style={{ gap: "1rem", marginBottom: "1rem" }}>
        <AbortButton
          taskId={taskId}
          disabled={!taskId || done}
          onAbort={onAbort}
        />
        {showDevApprovalInject && taskId && !done ? (
          <button
            type="button"
            className="btn"
            onClick={() => void onInjectApproval()}
          >
            Inject approval (dev only)
          </button>
        ) : null}
      </div>
      <div className="row" style={{ gap: "0.75rem", marginBottom: "1rem" }}>
        <label className="muted" htmlFor="chat-session">
          Browser session
        </label>
        <select
          id="chat-session"
          value={browserSession.sessionId}
          onChange={(event) => browserSession.setSessionId(event.target.value)}
          disabled={!client || !browserSession.ready || Boolean(taskId && !done)}
        >
          <option value="">Select a session</option>
          {browserSession.sessions.map((session) => (
            <option key={session.session_id} value={session.session_id}>
              {session.session_id.slice(0, 8)} on port {session.cdp_port}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn"
          disabled={!client || browserSession.busy}
          onClick={() => void browserSession.refresh()}
        >
          Refresh
        </button>
      </div>
      {budgetPaused ? (
        <p className="muted" style={{ marginBottom: "0.75rem" }}>
          Step budget reached for this task. Send another message to continue in
          the same browser session ({CONTINUE_STEPS} more steps).
        </p>
      ) : null}
      <MessageList
        messages={messages}
        port={port}
        token={token}
        onRetry={lastUserMessage && browserSession.ready ? onRetry : undefined}
      />
      {awaitingAssistant ? (
        <p className="muted" style={{ margin: "0.5rem 0" }}>
          Waiting for the agent (browser snapshot + model)…
        </p>
      ) : null}
      {streamingAssistant ? <TypingIndicator /> : null}
      <Composer
        onSend={onSend}
        disabled={!client || !browserSession.ready}
      />
      <LivePreviewPanel
        screenshotPath={lastShot}
        sessionId={browserSession.sessionId}
        client={client}
      />
    </section>
  );
}
