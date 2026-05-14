"use client";

import { useState } from "react";
import { RemoteDebuggingWizard } from "@/components/onboarding/RemoteDebuggingWizard";
import { useChromeProbe } from "@/hooks/useChromeProbe";

export function BrowserDetectionCard() {
  const { sessions, error, loading, detect, attempted } = useChromeProbe();
  const [showWizard, setShowWizard] = useState(false);

  return (
    <section className="card">
      <h2>Browsers (remote debugging)</h2>
      <p className="muted">
        Scan <code>127.0.0.1</code> ports 9222–9230 for Chrome DevTools (
        <code>--remote-debugging-port</code>).
      </p>
      <div
        className="row"
        style={{ marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}
      >
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading}
          onClick={detect}
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
        />
      ) : null}

      {error ? <div className="banner">{error}</div> : null}

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
    </section>
  );
}
