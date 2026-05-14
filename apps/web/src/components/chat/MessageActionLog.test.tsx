import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ActionLogMessage } from "@mayra/contracts";
import { MessageActionLog } from "./MessageActionLog";

describe("MessageActionLog", () => {
  it("renders [REDACTED:password_field] for password-ish targets", () => {
    const message: ActionLogMessage = {
      id: "a1",
      kind: "action_log",
      action: {
        action: "type",
        target_ref: 'role:textbox[name="Password"]',
        value: "hunter2",
        risk: "high",
        reason: "fill login",
      },
      executed: false,
      step: 1,
      ts: new Date().toISOString(),
    };
    render(<MessageActionLog message={message} />);
    expect(screen.getByTestId("action-log-card")).toHaveTextContent(
      "[REDACTED:password_field]",
    );
    expect(screen.getByTestId("action-log-card")).not.toHaveTextContent("hunter2");
  });
});
