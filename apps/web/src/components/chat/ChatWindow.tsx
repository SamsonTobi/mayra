"use client";

import { useCallback, useMemo, useState } from "react";
import { useOrchestrator } from "@/providers/orchestrator-context";
import { useChatStream } from "@/hooks/useChatStream";
import { LivePreviewPanel } from "@/components/live/LivePreviewPanel";
import { AbortButton } from "./AbortButton";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { TypingIndicator } from "./TypingIndicator";

export function ChatWindow() {
  const { client, port, token } = useOrchestrator();
  const [taskId, setTaskId] = useState<string | null>(null);
  const { messages, done, start, reset } = useChatStream(port, token);

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
        });
        setTaskId(res.task_id);
        start(res.task_id);
      }
    },
    [client, taskId, done, start],
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
        <AbortButton taskId={taskId} disabled={!taskId || done} onAbort={onAbort} />
        {taskId && !done && (
          <button type="button" className="btn" onClick={onInjectApproval}>
            Inject Approval (Dev)
          </button>
        )}
      </div>
      <MessageList messages={messages} port={port} token={token} />
      {streamingAssistant ? <TypingIndicator /> : null}
      <Composer onSend={onSend} disabled={!client} />
      <LivePreviewPanel screenshotPath={lastShot} />
    </section>
  );
}
