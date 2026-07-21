import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApprovalRequestMessage } from "@mayra/contracts";
import { MessageApprovalRequest } from "./MessageApprovalRequest";

describe("MessageApprovalRequest", () => {
  it("POSTs /v1/actions/approve on approve", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(""),
    });
    vi.stubGlobal("fetch", fetchMock);
    const message: ApprovalRequestMessage = {
      id: "appr-1",
      kind: "approval_request",
      action: {
        action: "click",
        target_ref: "@e9",
        value: null,
        risk: "high",
        reason: "delete",
      },
      screenshot_path: "/tmp/x.webp",
      expires_at: new Date().toISOString(),
      ts: new Date().toISOString(),
    };
    const user = userEvent.setup();
    render(
      <MessageApprovalRequest message={message} baseUrl="http://127.0.0.1:8000" token="tok" />,
    );
    await user.click(screen.getByRole("button", { name: /approve/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
    const first = fetchMock.mock.calls[0]!;
    const url = String(first[0]);
    expect(url).toContain("/v1/actions/approve");
    const init = first[1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      approval_id: "appr-1",
      decision: "approve",
    });
    vi.unstubAllGlobals();
  });
});
