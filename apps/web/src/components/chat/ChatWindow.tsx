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

export function ChatWindow() {
  const { client, port, token } = useOrchestrator();
  const [taskId, setTaskId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionError, setSessionError] = useState<string | null>(null);
  const { messages, done, start, reset } = useChatStream(port, token);

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
      if (taskId && !done) {
        await client.postTaskMessage(taskId, text);
      } else {
        const res = await client.createTask({
          goal: text,
          allowed_domains: ["example.com"],
          session_id: sessionId || null,
          start_agent_loop: true,
          max_steps: 5,
        });
        setTaskId(res.task_id);
        start(res.task_id);
      }
    },
    [client, taskId, done, sessionId, start],
  );

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

  return (
    <section>
      <h1>Chat</h1>
      <p className="muted">
        Streams from <code>/v1/chat/stream</code> (MAYRA_TECHNICAL_SPEC §3.4).
      </p>
      <div className="row" style={{ gap: "1rem", marginBottom: "1rem" }}>
        <AbortButton
          taskId={taskId}
          disabled={!taskId || done}
          onAbort={onAbort}
        />
        {taskId && !done && (
          <button type="button" className="btn" onClick={onInjectApproval}>
            Inject Approval (Dev)
          </button>
        )}
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
      {streamingAssistant ? <TypingIndicator /> : null}
      <Composer onSend={onSend} disabled={!client || !sessionId} />
      <LivePreviewPanel screenshotPath={lastShot} />
    </section>
  );
}
