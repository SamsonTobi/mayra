"use client";

import { useEffect, useRef, useState } from "react";
import { RemoteDebuggingWizard } from "@/components/onboarding/RemoteDebuggingWizard";
import { useChromeProbe } from "@/hooks/useChromeProbe";

const LAUNCH_DETECT_DELAY_MS = 2500;
const SESSION_REFRESH_MS = 5000;

export function BrowserDetectionCard() {
  const { sessions, error, loading, detect, attempted, lastDetectedAt } = useChromeProbe();
  const [showWizard, setShowWizard] = useState(false);
  const [autoDetectHint, setAutoDetectHint] = useState<string | null>(null);
  const launchDetectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (launchDetectTimer.current) {
        clearTimeout(launchDetectTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (sessions.length === 0) return;
    const interval = setInterval(() => void detect({ silent: true }), SESSION_REFRESH_MS);
    return () => clearInterval(interval);
  }, [detect, sessions.length]);

  const scheduleDetectAfterLaunch = (browser: "chrome" | "edge") => {
    if (launchDetectTimer.current) {
      clearTimeout(launchDetectTimer.current);
    }
    const label = browser === "chrome" ? "Chrome" : "Edge";
    setAutoDetectHint(`${label} launched. Auto-detecting in a few seconds…`);
    launchDetectTimer.current = setTimeout(() => {
      void detect();
      setAutoDetectHint(null);
    }, LAUNCH_DETECT_DELAY_MS);
  };

  return (
    <section className="card">
      <h2>Browsers (remote debugging)</h2>
      <p className="muted">
        Scan <code>127.0.0.1</code> ports 9222–9230 for Chromium DevTools (<strong>Chrome</strong>,{" "}
        <strong>Edge</strong>, etc.) using <code>--remote-debugging-port</code>. A window opened by{" "}
        <code>agent-browser doctor</code> (orchestrator startup) is <strong>not</strong> this — use{" "}
        <strong>Launch</strong> below.
      </p>
      <div
        className="row"
        style={{ marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}
      >
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading}
          onClick={() => void detect()}
        >
          {loading ? "Detecting…" : "Detect browsers"}
        </button>
        <button
          type="button"
          className="btn-link"
          onClick={() => setShowWizard((v) => !v)}
        >
          {showWizard ? "Hide instructions" : "How to enable debugging"}
        </button>
      </div>

      {showWizard ? (
        <RemoteDebuggingWizard
          variant="embedded"
          onBack={() => setShowWizard(false)}
          onDone={() => setShowWizard(false)}
          onLaunched={scheduleDetectAfterLaunch}
        />
      ) : null}

      {error ? <div className="banner">{error}</div> : null}
      {autoDetectHint ? <p className="muted">{autoDetectHint}</p> : null}

      {!attempted ? (
        <p className="muted">
          Click <strong>Detect browsers</strong> to scan loopback ports 9222–9230.
        </p>
      ) : null}

      {!error && !loading && attempted && sessions.length === 0 ? (
        <p className="muted">No Chrome DevTools endpoints found on 9222–9230.</p>
      ) : null}

      {sessions.map((s) => (
        <div key={s.port} style={{ marginTop: "0.75rem" }}>
          <div style={{ fontWeight: 600 }}>
            Port {s.port}{" "}
            <span className="muted" style={{ fontWeight: 400 }}>
              — {s.browser}
            </span>
          </div>
          <p className="muted" style={{ margin: "0.25rem 0", fontSize: "0.85rem" }}>
            {s.userAgent}
          </p>
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
      {lastDetectedAt && sessions.length > 0 ? (
        <p className="muted">
          Auto-refreshing every {SESSION_REFRESH_MS / 1000}s while browsers are detected. Last
          checked {lastDetectedAt.toLocaleTimeString()}.
        </p>
      ) : null}
    </section>
  );
}
