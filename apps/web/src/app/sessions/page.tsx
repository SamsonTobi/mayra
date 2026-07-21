"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LivePreviewPanel } from "@/components/live/LivePreviewPanel";
import { RemoteDebuggingWizard } from "@/components/onboarding/RemoteDebuggingWizard";
import { probeChromePorts } from "@/hooks/useChromeProbe";
import type { ChromeSession } from "@/lib/chrome-probe";
import { DEFAULT_CHROME_PROBE_PORTS } from "@/lib/chrome-probe";
import type { HealthzBody, SessionSummary } from "@/lib/orchestrator-client";
import { getTauriBridge } from "@/lib/tauri";
import { useOrchestrator } from "@/providers/orchestrator-context";
import { isWebMode } from "@/lib/mode";

const LAUNCH_DETECT_DELAY_MS = 2500;
const AUTO_LAUNCH_PORT = 9222;
const AUTO_PROBE_ATTEMPTS = 8;
const AUTO_PROBE_DELAY_MS = 750;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type AutoStatus =
  | "idle"
  | "starting-orchestrator"
  | "probing"
  | "launching-browser"
  | "connecting"
  | "snapshotting"
  | "ready"
  | "manual-needed"
  | "error";

export default function SessionsPage() {
  // In web mode, local Chrome discovery is not available — cloud Chromium is managed by the orchestrator.
  if (isWebMode()) {
    return (
      <div className="page-content">
        <h1>Browser Sessions</h1>
        <p className="muted">In web mode, browser sessions are managed automatically by the cloud orchestrator. No local Chrome discovery is needed.</p>
      </div>
    );
  }
  return <SessionsPageInner />;
}

function SessionsPageInner() {
  const { client, handshake } = useOrchestrator();
  const [sessions, setSessions] = useState<ChromeSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [showDebugWizard, setShowDebugWizard] = useState(true);
  const [autoDetectHint, setAutoDetectHint] = useState<string | null>(null);
  const launchDetectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStartAttempted = useRef(false);
  const autoSessionAttempted = useRef(false);
  const [selectedPort, setSelectedPort] = useState<number | null>(null);
  const [serverSessions, setServerSessions] = useState<SessionSummary[]>([]);
  const [health, setHealth] = useState<HealthzBody | null>(null);
  const [busy, setBusy] = useState(false);
  const [autoStatus, setAutoStatus] = useState<AutoStatus>("idle");
  const [pageError, setPageError] = useState<string | null>(null);
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [lastNodes, setLastNodes] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!client) return;
    setServerSessions(await client.listSessions());
  }, [client]);

  useEffect(() => {
    if (!client) return;
    void (async () => {
      try {
        setHealth(await client.healthz());
      } catch {
        setHealth(null);
      }
    })();
  }, [client, handshake?.port]);

  useEffect(() => {
    if (!client) return;
    void refresh().catch(() => {});
  }, [client, refresh]);

  const detectBrowsers = useCallback(async (
    ports: readonly number[] = DEFAULT_CHROME_PROBE_PORTS,
    options: { silent?: boolean } = {},
  ): Promise<ChromeSession[]> => {
    if (!options.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const list = await probeChromePorts(ports);
      setSessions(list);
      setAttempted(true);
      return list;
    } catch (e) {
      setSessions([]);
      setError(e instanceof Error ? e.message : String(e));
      setAttempted(true);
      return [];
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  }, []);

  const onConnect = async () => {
    if (!client || selectedPort == null) return;
    setBusy(true);
    setPageError(null);
    try {
      await client.connectSession(selectedPort);
      await refresh();
    } catch (e) {
      setPageError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onSnapshot = async (sessionId: string) => {
    if (!client) return;
    setBusy(true);
    setPageError(null);
    try {
      const r = await client.snapshotSession(sessionId);
      setLastNodes(r.node_count);
      setPreviewPath(r.screenshot_path);
      await refresh();
    } catch (e) {
      setPageError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const [starting, setStarting] = useState(false);

  useEffect(() => {
    return () => {
      if (launchDetectTimer.current) {
        clearTimeout(launchDetectTimer.current);
      }
    };
  }, []);

  const scheduleDetectAfterLaunch = useCallback((browser: "chrome" | "edge") => {
    if (launchDetectTimer.current) {
      clearTimeout(launchDetectTimer.current);
    }
    const label = browser === "chrome" ? "Chrome" : "Edge";
    setAutoDetectHint(`${label} launched. Auto-detecting in a few seconds…`);
    launchDetectTimer.current = setTimeout(() => {
      void detectBrowsers();
      setAutoDetectHint(null);
    }, LAUNCH_DETECT_DELAY_MS);
  }, [detectBrowsers]);

  const startOrchestrator = useCallback(async () => {
    const b = getTauriBridge();
    if (!b.isTauri) return;
    setStarting(true);
    setAutoStatus("starting-orchestrator");
    setPageError(null);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("start_sidecar");
    } catch (e) {
      setAutoStatus("error");
      setPageError(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
    }
  }, []);

  const launchDebugBrowser = useCallback(async (browser: "chrome" | "edge") => {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("launch_chromium_remote_debug", {
      browser,
      port: AUTO_LAUNCH_PORT,
    });
  }, []);

  const waitForDetectedBrowser = useCallback(async (): Promise<ChromeSession[]> => {
    for (let i = 0; i < AUTO_PROBE_ATTEMPTS; i += 1) {
      const ports = i < 4 ? [AUTO_LAUNCH_PORT] : DEFAULT_CHROME_PROBE_PORTS;
      const list = await detectBrowsers(ports, { silent: true });
      if (list.length > 0) return list;
      await sleep(AUTO_PROBE_DELAY_MS);
    }
    return [];
  }, [detectBrowsers]);

  const runAutoSession = useCallback(async () => {
    if (!client) return;
    setBusy(true);
    setPageError(null);
    try {
      const existing = await client.listSessions();
      setServerSessions(existing);
      if (existing.length > 0) {
        const first = existing[0]!;
        setSelectedPort(first.cdp_port);
        setAutoStatus("snapshotting");
        const snap = await client.verifySession(first.session_id);
        setLastNodes(snap.node_count);
        setPreviewPath(snap.screenshot_path);
        await refresh();
        setAutoStatus("ready");
        return;
      }

      setAutoStatus("probing");
      let detected = await detectBrowsers([AUTO_LAUNCH_PORT], { silent: true });
      if (detected.length === 0) {
        detected = await detectBrowsers(DEFAULT_CHROME_PROBE_PORTS, { silent: true });
      }

      if (detected.length === 0) {
        setAutoStatus("launching-browser");
        try {
          await launchDebugBrowser("chrome");
        } catch {
          await launchDebugBrowser("edge");
        }
        detected = await waitForDetectedBrowser();
      }

      const selected = detected[0];
      if (!selected) {
        setAutoStatus("manual-needed");
        setShowDebugWizard(true);
        setPageError("No CDP browser found. Use Launch Chrome/Edge below, then retry auto session.");
        return;
      }

      setSessions(detected);
      setSelectedPort(selected.port);
      setAutoStatus("connecting");
      const connected = await client.connectSession(selected.port);
      await refresh();
      setAutoStatus("snapshotting");
      const snap = await client.verifySession(connected.session_id);
      setLastNodes(snap.node_count);
      setPreviewPath(snap.screenshot_path);
      await refresh();
      setAutoStatus("ready");
    } catch (e) {
      setAutoStatus("error");
      setPageError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [client, detectBrowsers, launchDebugBrowser, refresh, waitForDetectedBrowser]);

  useEffect(() => {
    if (client || autoStartAttempted.current || !getTauriBridge().isTauri) return;
    autoStartAttempted.current = true;
    void startOrchestrator();
  }, [client, startOrchestrator]);

  useEffect(() => {
    if (!client || autoSessionAttempted.current) return;
    autoSessionAttempted.current = true;
    void runAutoSession();
  }, [client, runAutoSession]);

  if (!handshake || handshake.port === 0) {
    return (
      <div className="card">
        <h1>Sessions</h1>
        <p className="muted">
          Starting the FastAPI orchestrator sidecar automatically. Manual start is kept here as a
          fallback for development.
        </p>
        {autoStatus !== "idle" ? (
          <p className="muted">Status: <strong>{autoStatus.replaceAll("-", " ")}</strong></p>
        ) : null}
        {pageError ? <div className="banner" style={{ marginBottom: "0.75rem" }}>{pageError}</div> : null}
        {getTauriBridge().isTauri ? (
          <button type="button" className="btn btn-primary" disabled={starting} onClick={() => void startOrchestrator()}>
            {starting ? "Starting…" : "Start orchestrator"}
          </button>
        ) : (
          <p className="muted">Open this app in the Mayra desktop shell, or run with sidecar dev flags.</p>
        )}
      </div>
    );
  }

  if (!client) {
    return (
      <div className="card">
        <h1>Sessions</h1>
        <p className="muted">Waiting for orchestrator client…</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: "0.5rem" }}>Sessions & snapshot</h1>
      <p className="muted" style={{ marginBottom: "1rem" }}>
        Auto-starts a CDP browser session and captures an accessibility snapshot + WebP preview.
      </p>

      <section className="card" style={{ marginBottom: "1rem" }}>
        <h2>Auto Session</h2>
        <p className="muted">
          Status: <strong>{autoStatus.replaceAll("-", " ")}</strong>
          {selectedPort != null ? <> — port {selectedPort}</> : null}
          {lastNodes != null ? <> — last snapshot {lastNodes} nodes</> : null}
        </p>
        <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void runAutoSession()}
          >
            {busy ? "Working…" : "Run auto session"}
          </button>
        </div>
        {pageError ? <div className="banner" style={{ marginTop: "0.75rem" }}>{pageError}</div> : null}
      </section>

      {health && health.agent_browser_ok === false ? (
        <div className="banner" style={{ marginBottom: "1rem" }}>
          <strong>agent-browser</strong> check failed. Install with{" "}
          <code>npm i -g agent-browser</code> and run <code>agent-browser install</code>.{" "}
          {health.agent_browser_detail ? (
            <span className="muted">{JSON.stringify(health.agent_browser_detail)}</span>
          ) : null}
        </div>
      ) : null}

      <section className="card" style={{ marginBottom: "1rem" }}>
        <h2>CDP Browser Controls</h2>
        <div className="banner" style={{ marginBottom: "0.75rem" }}>
          <strong>Important:</strong> when you <strong>Start orchestrator</strong>, a Chromium window may open for{" "}
          <code>agent-browser doctor</code>. That process is <strong>not</strong> exposed on DevTools ports{" "}
          <code>9222–9230</code>, so <strong>Detect browsers will not see it</strong>. Use{" "}
          <strong>Launch Chrome/Edge</strong> below (same as Settings) or manual{" "}
          <code>--remote-debugging-port</code>, then detect.
        </div>
        <p className="muted" style={{ marginBottom: "0.75rem" }}>
          Scan <code>127.0.0.1</code> ports <strong>9222–9230</strong> for a real remote-debugging endpoint.
        </p>
        <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
          <button type="button" className="btn btn-primary" disabled={loading} onClick={() => void detectBrowsers()}>
            {loading ? "Detecting…" : "Detect browsers"}
          </button>
          <button
            type="button"
            className="btn-link"
            onClick={() => setShowDebugWizard((v) => !v)}
          >
            {showDebugWizard ? "Hide launch & instructions" : "Show launch Chrome/Edge & instructions"}
          </button>
        </div>
        {showDebugWizard ? (
          <RemoteDebuggingWizard
            variant="embedded"
            onBack={() => setShowDebugWizard(false)}
            onDone={() => setShowDebugWizard(false)}
            onLaunched={scheduleDetectAfterLaunch}
          />
        ) : null}
        {error ? <div className="banner">{error}</div> : null}
        {autoDetectHint ? <p className="muted">{autoDetectHint}</p> : null}
        {!attempted ? (
          <p className="muted">Click <strong>Detect browsers</strong> after a debug Chrome/Edge is listening on 9222 (default).</p>
        ) : null}
        {!error && !loading && attempted && sessions.length === 0 ? (
          <p className="muted">
            No endpoints on 9222–9230. Expand <strong>launch Chrome/Edge</strong> above if you have not started a
            debug browser yet.
          </p>
        ) : null}
        {sessions.map((s) => (
          <div key={s.port} style={{ marginTop: "0.75rem" }}>
            <div style={{ fontWeight: 600 }}>
              Port {s.port}{" "}
              <span className="muted" style={{ fontWeight: 400 }}>
                — {s.browser}
              </span>
              <button
                type="button"
                className="btn-link"
                style={{ marginLeft: "0.75rem" }}
                onClick={() => setSelectedPort(s.port)}
              >
                {selectedPort === s.port ? "Selected" : "Use this port"}
              </button>
            </div>
            <ul className="chrome-tab-list">
              {s.tabs.map((t) => (
                <li key={t.targetId}>
                  <span className="chrome-tab-title">{t.title || "(untitled)"}</span>
                  <span className="muted chrome-tab-url">{t.url}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div style={{ marginTop: "1rem" }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || selectedPort == null}
            onClick={() => void onConnect()}
          >
            Connect CDP session
          </button>
          {selectedPort != null ? (
            <span className="muted" style={{ marginLeft: "0.75rem" }}>
              port {selectedPort}
            </span>
          ) : null}
        </div>
        {pageError ? <div className="banner" style={{ marginTop: "0.75rem" }}>{pageError}</div> : null}
      </section>

      <section className="card" style={{ marginBottom: "1rem" }}>
        <h2>Orchestrator sessions</h2>
        {pageError ? <div className="banner">{pageError}</div> : null}
        {serverSessions.length === 0 ? (
          <p className="muted">No sessions yet — connect a CDP port above.</p>
        ) : (
          <ul>
            {serverSessions.map((s) => (
              <li key={s.session_id} style={{ marginTop: "0.5rem" }}>
                <code>{s.session_id.slice(0, 8)}…</code> — port {s.cdp_port}
                {s.last_node_count != null ? (
                  <span className="muted"> — last {s.last_node_count} nodes</span>
                ) : null}
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ marginLeft: "0.75rem" }}
                  disabled={busy}
                  onClick={() => void onSnapshot(s.session_id)}
                >
                  Snapshot
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {lastNodes != null ? (
        <p style={{ marginBottom: "0.5rem" }}>
          <strong>{lastNodes}</strong> nodes in last snapshot
        </p>
      ) : null}

      <LivePreviewPanel screenshotPath={previewPath} />
    </div>
  );
}
