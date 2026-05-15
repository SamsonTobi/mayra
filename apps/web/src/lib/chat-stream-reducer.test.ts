import { describe, expect, it } from "vitest";
import { reduceChatStreamEvent } from "./chat-stream-reducer";

describe("reduceChatStreamEvent", () => {
  it("parses orchestrator JSON token envelopes into assistant markdown", () => {
    const payload = JSON.stringify({ kind: "token", delta: "Hi" });
    let state = reduceChatStreamEvent([], "token", payload);
    expect(state.messages).toHaveLength(1);
    const first = state.messages[0];
    expect(first?.kind).toBe("assistant");
    if (first?.kind === "assistant") {
      expect(first.markdown).toBe("Hi");
    }
    state = reduceChatStreamEvent(state.messages, "token", JSON.stringify({ kind: "token", delta: "!" }));
    const m = state.messages[0];
    expect(m?.kind).toBe("assistant");
    if (m?.kind === "assistant") {
      expect(m.markdown).toBe("Hi!");
    }
  });

  it("appends consecutive token deltas to the same streaming assistant bubble", () => {
    let state = reduceChatStreamEvent([], "token", "hello");
    expect(state.messages).toHaveLength(1);
    const first = state.messages[0];
    expect(first?.kind).toBe("assistant");
    if (first?.kind === "assistant") {
      expect(first.markdown).toBe("hello");
      expect(first.streaming).toBe(true);
    }
    state = reduceChatStreamEvent(state.messages, "token", " world");
    expect(state.messages).toHaveLength(1);
    const m = state.messages[0];
    expect(m?.kind).toBe("assistant");
    if (m?.kind === "assistant") {
      expect(m.markdown).toBe("hello world");
    }
  });
});
