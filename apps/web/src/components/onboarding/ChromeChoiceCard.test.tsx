import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChromeChoiceCard } from "@/components/onboarding/ChromeChoiceCard";
import { OrchestratorClient } from "@/lib/orchestrator-client";

describe("ChromeChoiceCard", () => {
  it("calls createTask with expected payload when managed + test flag", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ task_id: "tid-1" }),
      text: () => Promise.resolve(""),
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = new OrchestratorClient(7777, "test-token");
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <ChromeChoiceCard
        onBack={() => {}}
        onSelect={onSelect}
        orchestrator={client}
        testCreateOnManaged
      />,
    );
    await user.click(screen.getByRole("button", { name: /managed chrome/i }));
    expect(fetchMock).toHaveBeenCalled();
    const call = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes("/v1/tasks"),
    );
    expect(call).toBeDefined();
    const init = call![1] as RequestInit;
    expect(JSON.parse(init.body as string)).toMatchObject({
      goal: "smoke",
      allowed_domains: ["example.com"],
    });
    vi.unstubAllGlobals();
  });
});
