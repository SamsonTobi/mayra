import { describe, expect, it } from "vitest";
import { parseSseText } from "./sse";

describe("parseSseText", () => {
  it("parses token and done events", () => {
    const raw =
      "event: token\ndata: hello\n\n" +
      "event: token\ndata: world\n\n" +
      "event: done\ndata: {\"ok\":true}\n\n";
    const ev = parseSseText(raw);
    expect(ev.map((e) => e.event)).toEqual(["token", "token", "done"]);
    expect(ev[0].data).toBe("hello");
    expect(ev[2].data).toBe('{"ok":true}');
  });

  it("ignores comment ping lines", () => {
    const raw = ": ping\n\nevent: status\ndata: ok\n\n";
    expect(parseSseText(raw)).toEqual([{ event: "status", data: "ok" }]);
  });
});
