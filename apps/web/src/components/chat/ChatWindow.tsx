"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useOrchestrator } from "@/providers/orchestrator-context";
import { useChatStream } from "@/hooks/useChatStream";
import { LivePreviewPanel } from "@/components/live/LivePreviewPanel";
import type { SessionSummary } from "@/lib/orchestrator-client";
import { AbortButton } from "./AbortButton";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { TypingIndicator } from "./TypingIndicator";

function conversationHistory(messages: ReturnType<typeof useChatStream>["messages"]): string[] {
  return messages
    .flatMap((message) => {
      if (message.kind === "user") return [`user:${message.text}`];
      if (message.kind === "assistant") return [`assistant:${message.markdown}`];
      return [];
    })
    .filter((line) => line.trim().length > 0)
    .slice(-16);
}

export function ChatWindow() {
  const { client, port, token } = useOrchestrator();
  const [taskId, setTaskId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionError, setSessionError] = useState<string | null>(null);
  const {
    messages,
    done,
    failed,
    start,
    reset,
    appendUserMessage,
    appendSystemMessage,
  } = useChatStream(port, token);

  const refreshSessions = useCallback(async () => {
    if (!client) return;
    try {
      const next = await client.listSessions();
      setSessions(next);
      setSessionError(null);
      setSessionId((current) => current || next[0]?.session_id || "");
    } catch (e) {
      setSessionError(e instanceof Error ? e.message : "Could not load sessions.");
    }
  }, [client]);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  const lastShot = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (!m) continue;
      if (m.kind === "action_log" && m.screenshot_path) {
        return m.screenshot_path;
      }
    }
    return null;
  }, [messages]);

  const onSend = useCallback(
    async (text: string) => {
      if (!client) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      if (taskId && !done) {
        appendUserMessage(trimmed);
        try {
          await client.postTaskMessage(taskId, trimmed);
        } catch (e) {
          appendSystemMessage(
            e instanceof Error ? e.message : "Could not send follow-up message.",
            "error",
          );
        }
        return;
      }

      const initialMessages = conversationHistory(messages);
      // Removed reset() so the chat doesn't clear on every new task
      appendUserMessage(trimmed);
      try {
        const res = await client.createTask({
          goal: trimmed,
          allowed_domains: ["example.com"],
          initial_messages: initialMessages,
          session_id: sessionId || null,
          start_agent_loop: true,
          max_steps: 3,
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
      taskId,
      done,
      sessionId,
      messages,
      start,
      reset,
      appendUserMessage,
      appendSystemMessage,
    ],
  );

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

  return (
    <section>
      <h1>Chat</h1>
      <p className="muted">
        Choose a connected browser session, then send a goal. The agent streams progress here.
      </p>
      <div className="row" style={{ gap: "1rem", marginBottom: "1rem" }}>
        <AbortButton
          taskId={taskId}
          disabled={!taskId || done}
          onAbort={onAbort}
        />
        {showDevApprovalInject && taskId && !done ? (
          <button type="button" className="btn" onClick={() => void onInjectApproval()}>
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
          value={sessionId}
          onChange={(event) => setSessionId(event.target.value)}
          disabled={!client || Boolean(taskId && !done)}
        >
          <option value="">Select a session</option>
          {sessions.map((session) => (
            <option key={session.session_id} value={session.session_id}>
              {session.session_id.slice(0, 8)} on port {session.cdp_port}
            </option>
          ))}
        </select>
        <button type="button" className="btn" onClick={() => void refreshSessions()}>
          Refresh
        </button>
      </div>
      {sessionError ? <div className="banner">{sessionError}</div> : null}
      <MessageList messages={messages} port={port} token={token} />
      {awaitingAssistant ? (
        <p className="muted" style={{ margin: "0.5rem 0" }}>
          Waiting for the agent (browser snapshot + model)…
        </p>
      ) : null}
      {streamingAssistant ? <TypingIndicator /> : null}
      <Composer onSend={onSend} disabled={!client || !sessionId} />
      <LivePreviewPanel screenshotPath={lastShot} />
    </section>
  );
}
