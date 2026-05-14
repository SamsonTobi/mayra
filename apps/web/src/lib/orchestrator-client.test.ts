import { afterEach, describe, expect, it, vi } from "vitest";
import { OrchestratorClient } from "./orchestrator-client";

describe("OrchestratorClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("createTask posts with bearer and returns task_id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ task_id: "tid-123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new OrchestratorClient(8765, "secret-token");
    const out = await client.createTask({
      goal: "open portal",
      allowed_domains: ["example.com"],
    });

    expect(out).toEqual({ task_id: "tid-123" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://127.0.0.1:8765/v1/tasks");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer secret-token",
    });
    const body = JSON.parse(init.body as string);
    expect(body.goal).toBe("open portal");
    expect(body.allowed_domains).toEqual(["example.com"]);
  });

  it("abort posts without body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);
    const client = new OrchestratorClient(8765, "t");
    await client.abort("tid-9");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8765/v1/tasks/tid-9/abort",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("postTaskMessage sends JSON body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);
    const client = new OrchestratorClient(8765, "tok");
    await client.postTaskMessage("tid-1", "steer left");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ text: "steer left" });
  });
});
