import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserDetectionCard } from "@/components/settings/BrowserDetectionCard";

const invoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

vi.mock("@/lib/tauri", () => ({
  getTauriBridge: () => ({ isTauri: true, ready: true }),
}));

describe("BrowserDetectionCard", () => {
  beforeEach(() => {
    invoke.mockReset();
    invoke.mockResolvedValue([
      {
        port: 9222,
        browser: "Chrome/9",
        userAgent: "TestUA",
        tabs: [
          {
            title: "Example",
            url: "https://example.com/",
            wsUrl: "ws://127.0.0.1:9222/devtools/page/x",
            targetId: "ABC",
          },
        ],
      },
    ]);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("invokes probe_chrome_ports after Detect (debounced) and lists tabs", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<BrowserDetectionCard />);
    await user.click(screen.getByRole("button", { name: /detect browsers/i }));
    await vi.advanceTimersByTimeAsync(320);
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("probe_chrome_ports", {
        ports: [9222, 9223, 9224, 9225, 9226, 9227, 9228, 9229, 9230],
      });
    });
    expect(await screen.findByText(/Port 9222/)).toBeInTheDocument();
    expect(screen.getByText("Example")).toBeInTheDocument();
    expect(screen.getByText("https://example.com/")).toBeInTheDocument();
  });
});
