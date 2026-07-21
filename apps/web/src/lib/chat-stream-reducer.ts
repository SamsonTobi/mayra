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
    let chunk = data;
    try {
      const parsed = JSON.parse(data) as { kind?: string; delta?: string };
      if (parsed?.kind === "token" && typeof parsed.delta === "string") {
        chunk = parsed.delta;
      }
    } catch {
      /* plain-string token (echo / legacy) */
    }
    const last = messages[messages.length - 1];
    if (last && last.kind === "assistant" && last.streaming) {
      messages[messages.length - 1] = {
        ...last,
        markdown: last.markdown + chunk,
      };
      return { messages, terminal: "none" };
    }
    messages.push({
      id: newId("asst"),
      kind: "assistant",
      markdown: chunk,
      ts: nowIso(),
      streaming: true,
    });
    return { messages, terminal: "none" };
  }

  if (event === "status") {
    try {
      const parsed = JSON.parse(data) as Record<string, unknown>;
      if (
        parsed.kind === "status" &&
        parsed.message &&
        typeof parsed.message === "object"
      ) {
        const inner = parsed.message as Extract<
          ChatMessage,
          { kind: "system_status" }
        >;
        if (inner.kind === "system_status") {
          const withTs =
            typeof inner.ts === "string" ? inner : { ...inner, ts: nowIso() };
          messages.push(withTs);
          return { messages, terminal: "none" };
        }
      }
      if (parsed.kind === "system_status") {
        messages.push(parsed as unknown as Extract<ChatMessage, { kind: "system_status" }>);
        return { messages, terminal: "none" };
      }
    } catch {
      /* fall through */
    }
    try {
      const parsed = JSON.parse(data) as ChatMessage;
      if (parsed.kind === "system_status") {
        messages.push(parsed);
        return { messages, terminal: "none" };
      }
    } catch {
      /* plain text */
    }
    messages.push({
      id: newId("sys"),
      kind: "system_status",
      text: data,
      severity: "info",
      ts: nowIso(),
    });
    return { messages, terminal: "none" };
  }

  if (event === "action") {
    try {
      const raw = JSON.parse(data) as Record<string, unknown>;
      const payload =
        raw.kind === "action" &&
        raw.message &&
        typeof raw.message === "object"
          ? (raw.message as Record<string, unknown>)
          : raw;
      const msg = (
        payload.kind === "action_log"
          ? payload
          : { ...payload, kind: "action_log" }
      ) as ChatMessage;
      if (msg.kind === "action_log") {
        const withTs =
          "ts" in msg && typeof msg.ts === "string"
            ? msg
            : { ...msg, ts: nowIso() };
        messages.push(withTs as ChatMessage);
      }
    } catch {
      /* ignore malformed */
    }
    return { messages, terminal: "none" };
  }

  if (event === "approval") {
    try {
      const raw = JSON.parse(data) as Record<string, unknown>;
      const payload =
        raw.kind === "approval" &&
        raw.message &&
        typeof raw.message === "object"
          ? (raw.message as Record<string, unknown>)
          : raw;
      const msg = (
        payload.kind === "approval_request"
          ? payload
          : { ...payload, kind: "approval_request" }
      ) as ChatMessage;
      if (msg.kind === "approval_request") {
        const withTs =
          "ts" in msg && typeof msg.ts === "string"
            ? msg
            : { ...msg, ts: nowIso() };
        messages.push(withTs as ChatMessage);
      }
    } catch {
      /* ignore */
    }
    return { messages, terminal: "none" };
  }

  if (event === "step_meta") {
    try {
      const parsed = JSON.parse(data) as {
        kind?: string;
        provider?: string;
        model?: string;
        observation_screenshot_path?: string;
        observation_screenshot_url?: string;
      };
      if (parsed.kind !== "step_meta") {
        return { messages, terminal: "none" };
      }
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m?.kind === "assistant") {
          messages[i] = {
            ...m,
            provider: parsed.provider ?? m.provider,
            model: parsed.model ?? m.model,
            observation_screenshot_path:
              parsed.observation_screenshot_path ?? m.observation_screenshot_path,
            // Pass through the cloud screenshot URL so the thumbnail can load it
            observation_screenshot_url:
              parsed.observation_screenshot_url ?? (m as Record<string, unknown>).observation_screenshot_url,
          } as typeof m;
          break;
        }
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
      const rawMsg = payload.message;
      const msg =
        rawMsg != null &&
        String(rawMsg).trim() !== "" &&
        String(rawMsg) !== "None"
          ? String(rawMsg)
          : String(data ?? "").trim() !== ""
            ? String(data)
            : "(no error detail)";
      finalized.push({
        id: newId("err"),
        kind: "system_status",
        text: `${payload.code ?? "error"}: ${msg}`,
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
