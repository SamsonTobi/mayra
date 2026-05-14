import { describe, expect, it } from "vitest";
import { redactActionValueForDisplay } from "./redact";

describe("redactActionValueForDisplay", () => {
  it("masks password-ish targets with contract suffix", () => {
    const out = redactActionValueForDisplay({
      action: "type",
      target_ref: 'role:textbox[name="Password"]',
      value: "hunter2",
      risk: "high",
      reason: "login",
    });
    expect(out).toBe("[REDACTED:password_field]");
  });
});
