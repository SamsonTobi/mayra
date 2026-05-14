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

/**
 * Opens `EventSource` on `/v1/chat/stream` for a given `taskId`
 * (MAYRA_TECHNICAL_SPEC §3.4, MAYRA_DESKTOP_UX_FLOWS §4.3).
 */
export function useChatStream(
  port: number | null,
  token: string | null,
): ChatStreamState & { start: (taskId: string) => void; reset: () => void } {
  const [state, setState] = useState<ChatStreamState>(initial);
  const esRef = useRef<EventSource | null>(null);

  const reset = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setState(initial);
  }, []);

  const start = useCallback(
    (taskId: string) => {
      if (port == null || token == null || !taskId) return;
      reset();
      const url = `http://127.0.0.1:${port}/v1/chat/stream?task_id=${encodeURIComponent(taskId)}&token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      esRef.current = es;

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
      };

      const onAny = (eventType: string) => (ev: MessageEvent) => {
        fold(eventType, String(ev.data ?? ""));
      };

      es.addEventListener("token", onAny("token"));
      es.addEventListener("action", onAny("action"));
      es.addEventListener("status", onAny("status"));
      es.addEventListener("approval", onAny("approval"));
      es.addEventListener("done", onAny("done"));
      es.addEventListener("error", onAny("error"));
      es.onerror = () => {
        setState((prev) => ({
          ...prev,
          failed: true,
          done: true,
        }));
        es.close();
      };
    },
    [port, token, reset],
  );

  useEffect(
    () => () => {
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
    }),
    [state.messages, state.done, state.failed, state.lastDoneStatus, start, reset],
  );
}
