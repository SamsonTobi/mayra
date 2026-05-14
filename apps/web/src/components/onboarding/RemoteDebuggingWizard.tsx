"use client";

import { useState } from "react";
import { getTauriBridge } from "@/lib/tauri";

type Props = {
  onBack: () => void;
  onDone: () => void;
  /** Compact copy when embedded under Settings (vs full onboarding step). */
  variant?: "onboarding" | "embedded";
};

const DEBUG_PORT = 9222;

/** Manual cmd examples; Mayra launch uses its own profile under app data. */
const MANUAL_CHROME = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=${DEBUG_PORT} --user-data-dir="%LOCALAPPDATA%\\Mayra\\chrome-debug-profile"`;

const MANUAL_EDGE_X86 = `"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --remote-debugging-port=${DEBUG_PORT} --user-data-dir="%LOCALAPPDATA%\\Mayra\\edge-debug-profile"`;

const MANUAL_EDGE_PF = `"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe" --remote-debugging-port=${DEBUG_PORT} --user-data-dir="%LOCALAPPDATA%\\Mayra\\edge-debug-profile"`;

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

/**
 * Guided flow for `--remote-debugging-port` (F4). Chrome and Edge use the same DevTools HTTP API.
 */
export function RemoteDebuggingWizard({ onBack, onDone, variant = "onboarding" }: Props) {
  const embedded = variant === "embedded";
  const [hint, setHint] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const tauri = getTauriBridge().isTauri;

  const launch = async (browser: "chrome" | "edge") => {
    setErr(null);
    setHint(null);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("launch_chromium_remote_debug", { browser, port: DEBUG_PORT });
      setHint(
        `${browser === "chrome" ? "Chrome" : "Edge"} started on port ${DEBUG_PORT}. Wait a few seconds, then click Detect browsers.`,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <section className="card" style={{ marginTop: embedded ? "0.5rem" : undefined }}>
      <h2>{embedded ? "Enable remote debugging" : "Remote debugging (Chromium)"}</h2>
      <div className="banner">
        Chrome and <strong>Microsoft Edge</strong> are Chromium-based: both accept{" "}
        <code>--remote-debugging-port</code> and expose the same <code>/json</code> DevTools endpoint
        Mayra scans on <code>127.0.0.1</code>. Close normal browser windows first, or use a separate{" "}
        <code>--user-data-dir</code> (Mayra&apos;s launch button does this for you).
      </div>

      {tauri ? (
        <div className="row" style={{ marginBottom: "0.75rem" }}>
          <button type="button" className="btn btn-primary" onClick={() => void launch("chrome")}>
            Launch Chrome (debug {DEBUG_PORT})
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void launch("edge")}>
            Launch Edge (debug {DEBUG_PORT})
          </button>
        </div>
      ) : (
        <p className="muted">Open the Mayra desktop app to launch Chrome/Edge with one click.</p>
      )}

      {hint ? <p className="muted">{hint}</p> : null}
      {err ? <div className="banner">{err}</div> : null}

      <p className="muted">Or copy a command and run it in <strong>cmd.exe</strong> (expand env vars):</p>

      <div style={{ marginBottom: "0.75rem" }}>
        <div className="row" style={{ alignItems: "flex-end", marginBottom: "0.35rem" }}>
          <strong>Google Chrome</strong>
          <button type="button" className="btn" onClick={() => void copyText(MANUAL_CHROME)}>
            Copy
          </button>
        </div>
        <textarea readOnly rows={2} defaultValue={MANUAL_CHROME} />
      </div>

      <div style={{ marginBottom: "0.75rem" }}>
        <div className="row" style={{ alignItems: "flex-end", marginBottom: "0.35rem" }}>
          <strong>Microsoft Edge (common paths)</strong>
          <button type="button" className="btn" onClick={() => void copyText(MANUAL_EDGE_X86)}>
            Copy (x86 path)
          </button>
          <button type="button" className="btn" onClick={() => void copyText(MANUAL_EDGE_PF)}>
            Copy (Program Files)
          </button>
        </div>
        <textarea readOnly rows={2} defaultValue={MANUAL_EDGE_X86} style={{ marginBottom: "0.35rem" }} />
        <textarea readOnly rows={2} defaultValue={MANUAL_EDGE_PF} />
      </div>

      <p className="muted">
        After the browser starts, click <strong>Detect browsers</strong> in Settings. If nothing appears,
        wait a few seconds and try again — the DevTools socket can take a moment to come up.
      </p>
      <div className="row">
        <button type="button" className="btn" onClick={onBack}>
          {embedded ? "Close" : "Back"}
        </button>
        {!embedded ? (
          <button type="button" className="btn btn-primary" onClick={onDone}>
            Continue
          </button>
        ) : null}
      </div>
    </section>
  );
}
