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

  it("attaches step_meta to the latest assistant bubble", () => {
    let state = reduceChatStreamEvent([], "token", "hello");
    state = reduceChatStreamEvent(
      state.messages,
      "step_meta",
      JSON.stringify({
        kind: "step_meta",
        provider: "groq",
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        observation_screenshot_path: "C:\\\\tmp\\\\1.webp",
      }),
    );
    const m = state.messages[0];
    expect(m?.kind).toBe("assistant");
    if (m?.kind === "assistant") {
      expect(m.provider).toBe("groq");
      expect(m.model).toBe("meta-llama/llama-4-scout-17b-16e-instruct");
      expect(m.observation_screenshot_path).toContain("1.webp");
    }
  });
});
