"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionSummary } from "@/lib/orchestrator-client";
import type { ChromeSession } from "@/lib/chrome-probe";
import { DEFAULT_CHROME_PROBE_PORTS } from "@/lib/chrome-probe";
import { getTauriBridge } from "@/lib/tauri";
import { probeChromePorts } from "@/hooks/useChromeProbe";
import { useOrchestrator } from "@/providers/orchestrator-context";

const AUTO_LAUNCH_PORT = 9222;
const AUTO_PROBE_ATTEMPTS = 8;
const AUTO_PROBE_DELAY_MS = 750;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const log = (...args: unknown[]) => console.log("[useAutoBrowserSession]", ...args);
const warn = (...args: unknown[]) => console.warn("[useAutoBrowserSession]", ...args);
const err = (...args: unknown[]) => console.error("[useAutoBrowserSession]", ...args);

export type AutoBrowserStatus =
  | "starting-orchestrator"
  | "checking-orchestrator"
  | "checking-existing-session"
  | "probing-browser"
  | "launching-browser"
  | "connecting-session"
  | "snapshotting"
  | "ready"
  | "manual-needed"
  | "error";

export type AutoBrowserSessionState = {
  status: AutoBrowserStatus;
  statusText: string;
  ready: boolean;
  busy: boolean;
  error: string | null;
  healthError: string | null;
  sessions: SessionSummary[];
  sessionId: string;
  setSessionId: (sessionId: string) => void;
  previewPath: string | null;
  lastNodeCount: number | null;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
};

function statusText(status: AutoBrowserStatus, extra?: string): string {
  switch (status) {
    case "starting-orchestrator":
      return "Starting orchestrator";
    case "checking-orchestrator":
      return "Checking orchestrator";
    case "checking-existing-session":
      return extra
        ? `Checking saved session ${extra}`
        : "Checking saved browser session";
    case "probing-browser":
      return "Looking for Chrome or Edge";
    case "launching-browser":
      return "Launching browser";
    case "connecting-session":
      return "Connecting browser session";
    case "snapshotting":
      return extra
        ? `Verifying browser snapshot session ${extra}`
        : "Verifying browser snapshot";
    case "ready":
      return "Ready";
    case "manual-needed":
      return "Needs browser setup";
    case "error":
      return "Startup needs attention";
  }
}

async function launchDebugBrowser(browser: "chrome" | "edge") {
  log(`launchDebugBrowser: launching ${browser} on port ${AUTO_LAUNCH_PORT}`);
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("launch_chromium_remote_debug", {
    browser,
    port: AUTO_LAUNCH_PORT,
  });
  log(`launchDebugBrowser: invoked ${browser}`);
}

async function waitForDetectedBrowser(): Promise<ChromeSession[]> {
  let delay = 200;
  for (let i = 0; i < AUTO_PROBE_ATTEMPTS; i += 1) {
    const ports = i < 4 ? [AUTO_LAUNCH_PORT] : DEFAULT_CHROME_PROBE_PORTS;
    log(`waitForDetectedBrowser: attempt ${i + 1}/${AUTO_PROBE_ATTEMPTS} ports=${ports} (delay=${delay}ms)`);
    const list = await probeChromePorts(ports);
    if (list.length > 0) {
      log(`waitForDetectedBrowser: found ${list.length} browser(s) on attempt ${i + 1}`);
      return list;
    }
    await sleep(delay);
    delay = Math.min(delay * 1.5, 1500);
  }
  warn("waitForDetectedBrowser: no browser found after all attempts");
  return [];
}

export function useAutoBrowserSession(): AutoBrowserSessionState {
  const { client, handshake, sidecarStatus, sidecarError } = useOrchestrator();
  const [status, setStatus] = useState<AutoBrowserStatus>(
    "starting-orchestrator",
  );
  const [statusExtra, setStatusExtra] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [lastNodeCount, setLastNodeCount] = useState<number | null>(null);
  const attemptedForPort = useRef<number | null>(null);

  // In web mode, return a no-op state — cloud mode manages Chromium automatically.
  // This hook is for local Chrome discovery/launch only.
  const webMode = typeof window !== "undefined" && process.env.NEXT_PUBLIC_MAYRA_MODE === "web";
  useEffect(() => {
    if (webMode) {
      setStatus("ready");
    }
  }, [webMode]);

  if (webMode) {
    return {
      status: "ready",
      statusText: "Cloud mode",
      statusExtra: undefined,
      busy: false,
      error: null,
      healthError: null,
      sessions: [],
      sessionId: "",
      setSessionId: () => {},
      previewPath: null,
      lastNodeCount: null,
      refresh: async () => {},
      retry: async () => {},
      ready: true,
    } as AutoBrowserSessionState;
  }

  const refresh = useCallback(async () => {
    if (!client) return;
    log("refresh: fetching sessions");
    const next = await client.listSessions();
    setSessions(next);
    setSessionId((current) => {
      if (current && next.some((session) => session.session_id === current)) {
        return current;
      }
      return next[0]?.session_id ?? "";
    });
    log(`refresh: got ${next.length} sessions`);
  }, [client]);

  const verifySession = useCallback(
    async (id: string): Promise<boolean> => {
      if (!client) return false;
      const shortId = id.slice(0, 8);
      log(`verifySession: starting for session ${shortId}`);
      setStatus("snapshotting");
      setStatusExtra(shortId);
      const t0 = performance.now();
      try {
        const snap = await client.verifySession(id);
        const elapsed = Math.round(performance.now() - t0);
        log(`verifySession: SUCCESS for ${shortId} — ${snap.node_count} nodes (${elapsed}ms)`);
        setPreviewPath(snap.screenshot_path);
        setLastNodeCount(snap.node_count);
        setSessionId(id);
        setStatus("ready");
        setStatusExtra(undefined);
        setError(null);
        await refresh();
        setSessionId(id);
        return true;
      } catch (e) {
        const elapsed = Math.round(performance.now() - t0);
        const message = e instanceof Error ? e.message : String(e);
        warn(`verifySession: FAILED for ${shortId} (${elapsed}ms): ${message}`);
        setPreviewPath(null);
        setLastNodeCount(null);

        // Proactively delete the dead session from the backend so it
        // doesn't appear on the next listSessions call.
        log(`verifySession: deleting stale session ${shortId} from backend`);
        try {
          await client.deleteSession(id);
        } catch (delErr) {
          warn(`verifySession: deleteSession failed for ${shortId}`, delErr);
        }

        setSessions((current) =>
          current.filter((session) => session.session_id !== id),
        );
        setSessionId((current) => (current === id ? "" : current));
        try {
          await refresh();
        } catch {
          /* keep local filtered state */
        }
        setError(message);
        return false;
      }
    },
    [client, refresh],
  );

  const run = useCallback(async () => {
    if (!handshake || !client) return;
    const runId = Math.random().toString(36).slice(2, 8);
    log(`run[${runId}]: === STARTUP SEQUENCE BEGIN ===`);

    setBusy(true);
    setError(null);
    setHealthError(null);
    setStatusExtra(undefined);
    try {
      // ─── Step 1: Health check ───
      setStatus("checking-orchestrator");
      log(`run[${runId}]: step 1 — health check`);
      const health = await client.healthz();
      if (health.agent_browser_ok === false) {
        const detail = health.agent_browser_detail
          ? JSON.stringify(health.agent_browser_detail)
          : "agent-browser check failed";
        warn(`run[${runId}]: agent_browser_ok=false: ${detail}`);
        setHealthError(detail);
      } else {
        log(`run[${runId}]: healthz OK`);
      }

      // ─── Step 2: Try existing sessions ───
      setStatus("checking-existing-session");
      log(`run[${runId}]: step 2 — listing existing sessions`);
      const existing = await client.listSessions();
      setSessions(existing);
      log(`run[${runId}]: found ${existing.length} existing session(s)`);

      for (const session of existing) {
        log(`run[${runId}]: verifying existing session ${session.session_id.slice(0, 8)} on port ${session.cdp_port}`);
        setStatusExtra(session.session_id.slice(0, 8));
        if (await verifySession(session.session_id)) {
          log(`run[${runId}]: === STARTUP SEQUENCE DONE (existing session) ===`);
          return;
        }
        log(`run[${runId}]: session ${session.session_id.slice(0, 8)} was stale, continuing`);
      }

      // ─── Step 3: Probe for running browsers ───
      setStatus("probing-browser");
      setStatusExtra(undefined);
      log(`run[${runId}]: step 3 — probing for running browsers in parallel`);
      const uniquePorts = Array.from(new Set([AUTO_LAUNCH_PORT, ...DEFAULT_CHROME_PROBE_PORTS]));
      let detected = await probeChromePorts(uniquePorts);
      log(`run[${runId}]: probe found ${detected.length} running browser(s)`);

      // ─── Step 4: Launch browser if needed ───
      if (detected.length === 0 && getTauriBridge().isTauri) {
        setStatus("launching-browser");
        log(`run[${runId}]: step 4 — launching browser (Tauri)`);
        try {
          await launchDebugBrowser("chrome");
        } catch (chromeErr) {
          warn(`run[${runId}]: Chrome launch failed, trying Edge`, chromeErr);
          await launchDebugBrowser("edge");
        }
        detected = await waitForDetectedBrowser();
        log(`run[${runId}]: post-launch detection: found ${detected.length}`);
      }

      const selected = detected[0];
      if (!selected) {
        log(`run[${runId}]: no browser found — manual-needed`);
        setStatus("manual-needed");
        setError("No debug browser is listening on ports 9222-9230.");
        return;
      }

      // ─── Step 5: Connect + verify ───
      setStatus("connecting-session");
      log(`run[${runId}]: step 5 — connecting and verifying port ${selected.port} in one atomic call`);
      const t0 = performance.now();
      try {
        const snap = await client.connectAndVerify(selected.port);
        const elapsed = Math.round(performance.now() - t0);
        log(`run[${runId}]: atomic connectAndVerify SUCCESS for port ${selected.port} — ${snap.node_count} nodes (${elapsed}ms)`);
        setPreviewPath(snap.screenshot_path);
        setLastNodeCount(snap.node_count);
        setSessionId(snap.session_id);
        setStatus("ready");
        setStatusExtra(undefined);
        setError(null);
        await refresh();
        log(`run[${runId}]: === STARTUP SEQUENCE DONE (new session) ===`);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        err(`run[${runId}]: new session connect/verify failed: ${message}`);
        setStatus("error");
        setError(message);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      err(`run[${runId}]: === STARTUP SEQUENCE FAILED ===`, message);
      setStatus("error");
      setStatusExtra(undefined);
      setError(message);
    } finally {
      setBusy(false);
    }
  }, [
    client,
    handshake,
    refresh,
    sidecarError,
    sidecarStatus,
    verifySession,
  ]);

  useEffect(() => {
    if (!client || !handshake) {
      setStatus(
        sidecarStatus === "error" ? "error" : "starting-orchestrator",
      );
      setError(sidecarError);
      return;
    }
    if (attemptedForPort.current === handshake.port) return;
    attemptedForPort.current = handshake.port;
    log(`useEffect: triggering run for port ${handshake.port}`);
    void run();
  }, [client, handshake, run, sidecarError, sidecarStatus]);

  return {
    status,
    statusText: statusText(status, statusExtra),
    ready: status === "ready" && Boolean(sessionId),
    busy,
    error,
    healthError,
    sessions,
    sessionId,
    setSessionId,
    previewPath,
    lastNodeCount,
    refresh,
    retry: run,
  };
}
