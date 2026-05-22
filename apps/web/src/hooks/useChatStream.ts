"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "@mayra/contracts";
import { reduceChatStreamEvent } from "@/lib/chat-stream-reducer";

export type ChatStreamState = {
  messages: ChatMessage[];
  done: boolean;
  failed: boolean;
  lastDoneStatus?: string;
};

const initial: ChatStreamState = {
  messages: [],
  done: false,
  failed: false,
};

function newId(prefix: string): string {
  return (
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `${prefix}-${crypto.randomUUID()}`
      : `${prefix}-${Date.now()}`
  );
}

function userBubble(text: string): ChatMessage {
  return { id: newId("user"), kind: "user", text, ts: new Date().toISOString() };
}

function streamFailureBubble(): ChatMessage {
  return {
    id: newId("stream-error"),
    kind: "system_status",
    text: "Chat stream disconnected before the task finished. Check the orchestrator/browser session and try again.",
    severity: "error",
    ts: new Date().toISOString(),
  };
}

function systemBubble(text: string, severity: "info" | "warn" | "error"): ChatMessage {
  return {
    id: newId("system"),
    kind: "system_status",
    text,
    severity,
    ts: new Date().toISOString(),
  };
}

/**
 * Opens `EventSource` on `/v1/chat/stream` for a given `taskId`
 * (MAYRA_TECHNICAL_SPEC §3.4, MAYRA_DESKTOP_UX_FLOWS §4.3).
 */
export function useChatStream(
  port: number | null,
  token: string | null,
): ChatStreamState & {
  start: (taskId: string) => void;
  reset: () => void;
  appendUserMessage: (text: string) => void;
  appendSystemMessage: (text: string, severity?: "info" | "warn" | "error") => void;
} {
  const [state, setState] = useState<ChatStreamState>(initial);
  const esRef = useRef<EventSource | null>(null);
  const suppressEsErrorRef = useRef(false);

  const reset = useCallback(() => {
    suppressEsErrorRef.current = true;
    esRef.current?.close();
    esRef.current = null;
    queueMicrotask(() => {
      suppressEsErrorRef.current = false;
    });
    setState(initial);
  }, []);

  const appendUserMessage = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userBubble(t)],
    }));
  }, []);

  const appendSystemMessage = useCallback(
    (text: string, severity: "info" | "warn" | "error" = "info") => {
      const t = text.trim();
      if (!t) return;
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, systemBubble(t, severity)],
      }));
    },
    [],
  );

  const start = useCallback(
    (taskId: string) => {
      if (port == null || token == null || !taskId) return;
      suppressEsErrorRef.current = true;
      esRef.current?.close();
      esRef.current = null;
      queueMicrotask(() => {
        suppressEsErrorRef.current = false;
      });
      setState((prev) => ({
        ...prev,
        done: false,
        failed: false,
        lastDoneStatus: undefined,
      }));
      const url = `http://127.0.0.1:${port}/v1/chat/stream?task_id=${encodeURIComponent(taskId)}&token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      esRef.current = es;

      const closeAsSettled = () => {
        suppressEsErrorRef.current = true;
        es.close();
        if (esRef.current === es) {
          esRef.current = null;
        }
        queueMicrotask(() => {
          suppressEsErrorRef.current = false;
        });
      };

      const fold = (event: string, data: string) => {
        setState((prev) => {
          const next = reduceChatStreamEvent(prev.messages, event, data);
          const done =
            prev.done ||
            next.terminal === "done" ||
            next.terminal === "error";
          const failed = prev.failed || next.terminal === "error";
          return {
            messages: next.messages,
            done,
            failed,
            lastDoneStatus: next.doneStatus ?? prev.lastDoneStatus,
          };
        });
        if (event === "done" || event === "error") {
          closeAsSettled();
        }
      };

      const onAny = (eventType: string) => (ev: MessageEvent) => {
        fold(eventType, String(ev.data ?? ""));
      };

      es.addEventListener("token", onAny("token"));
      es.addEventListener("action", onAny("action"));
      es.addEventListener("status", onAny("status"));
      es.addEventListener("approval", onAny("approval"));
      es.addEventListener("step_meta", onAny("step_meta"));
      es.addEventListener("done", onAny("done"));
      es.addEventListener("error", onAny("error"));
      es.onerror = () => {
        if (suppressEsErrorRef.current) return;
        setState((prev) => ({
          ...prev,
          messages: prev.failed ? prev.messages : [...prev.messages, streamFailureBubble()],
          failed: true,
          done: true,
        }));
        es.close();
      };
    },
    [port, token],
  );

  useEffect(
    () => () => {
      suppressEsErrorRef.current = true;
      esRef.current?.close();
    },
    [],
  );

  return useMemo(
    () => ({
      messages: state.messages,
      done: state.done,
      failed: state.failed,
      lastDoneStatus: state.lastDoneStatus,
      start,
      reset,
      appendUserMessage,
      appendSystemMessage,
    }),
    [
      state.messages,
      state.done,
      state.failed,
      state.lastDoneStatus,
      start,
      reset,
      appendUserMessage,
      appendSystemMessage,
    ],
  );
}
