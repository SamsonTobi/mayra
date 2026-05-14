import type { ChatMessage } from "@mayra/contracts";

export type StreamTerminal = "none" | "done" | "error";

export type StreamReduceResult = {
  messages: ChatMessage[];
  terminal: StreamTerminal;
  doneStatus?: string;
  taskId?: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}`;
}

/**
 * Pure fold for SSE `event` + `data` strings into transcript state.
 * Keeps orchestrator quirks (plain token deltas vs JSON payloads) in one place.
 */
export function reduceChatStreamEvent(
  prev: ChatMessage[],
  event: string,
  data: string,
): StreamReduceResult {
  const messages = [...prev];

  if (event === "token") {
    const last = messages[messages.length - 1];
    if (last && last.kind === "assistant" && last.streaming) {
      messages[messages.length - 1] = {
        ...last,
        markdown: last.markdown + data,
      };
      return { messages, terminal: "none" };
    }
    messages.push({
      id: newId("asst"),
      kind: "assistant",
      markdown: data,
      ts: nowIso(),
      streaming: true,
    });
    return { messages, terminal: "none" };
  }

  if (event === "status") {
    try {
      const parsed = JSON.parse(data) as ChatMessage;
      if (parsed.kind === "system_status") {
        messages.push(parsed);
      }
    } catch {
      messages.push({
        id: newId("sys"),
        kind: "system_status",
        text: data,
        severity: "info",
        ts: nowIso(),
      });
    }
    return { messages, terminal: "none" };
  }

  if (event === "action") {
    try {
      const raw = JSON.parse(data) as Record<string, unknown>;
      const msg = (
        raw.kind === "action_log" ? raw : { ...raw, kind: "action_log" }
      ) as ChatMessage;
      if (msg.kind === "action_log") {
        const withTs =
          "ts" in msg && typeof msg.ts === "string"
            ? msg
            : { ...msg, ts: nowIso() };
        messages.push(withTs);
      }
    } catch {
      /* ignore malformed */
    }
    return { messages, terminal: "none" };
  }

  if (event === "approval") {
    try {
      const raw = JSON.parse(data) as Record<string, unknown>;
      const msg = (
        raw.kind === "approval_request" ? raw : { ...raw, kind: "approval_request" }
      ) as ChatMessage;
      if (msg.kind === "approval_request") {
        const withTs =
          "ts" in msg && typeof msg.ts === "string"
            ? msg
            : { ...msg, ts: nowIso() };
        messages.push(withTs);
      }
    } catch {
      /* ignore */
    }
    return { messages, terminal: "none" };
  }

  if (event === "done") {
    const finalized = messages.map((m) =>
      m.kind === "assistant" && m.streaming ? { ...m, streaming: false } : m,
    );
    let doneStatus: string | undefined;
    let taskId: string | undefined;
    try {
      const payload = JSON.parse(data) as { status?: string; task_id?: string };
      doneStatus = payload.status;
      taskId = payload.task_id;
    } catch {
      /* plain string fallback */
    }
    return {
      messages: finalized,
      terminal: "done",
      doneStatus,
      taskId,
    };
  }

  if (event === "error") {
    const finalized = messages.map((m) =>
      m.kind === "assistant" && m.streaming ? { ...m, streaming: false } : m,
    );
    try {
      const payload = JSON.parse(data) as {
        message?: string;
        code?: string;
        correlation_id?: string;
      };
      finalized.push({
        id: newId("err"),
        kind: "system_status",
        text: `${payload.code ?? "error"}: ${payload.message ?? data}`,
        severity: "error",
        ts: nowIso(),
      });
    } catch {
      finalized.push({
        id: newId("err"),
        kind: "system_status",
        text: data,
        severity: "error",
        ts: nowIso(),
      });
    }
    return { messages: finalized, terminal: "error" };
  }

  return { messages, terminal: "none" };
}
