import { describe, expect, it } from "vitest";
import { reduceChatStreamEvent } from "./chat-stream-reducer";

describe("reduceChatStreamEvent", () => {
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
