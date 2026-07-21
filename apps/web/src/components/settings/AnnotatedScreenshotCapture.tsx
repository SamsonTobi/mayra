"use client";

import { useCallback, useEffect, useState } from "react";
import { AnnotatedScreenshot } from "@/components/common/AnnotatedScreenshot";
import { useChromeProbe } from "@/hooks/useChromeProbe";
import { useOrchestrator } from "@/providers/orchestrator-context";
import { getTauriBridge } from "@/lib/tauri";
import { resolveScreenshotSrc } from "@/lib/screenshot";

type CaptureState = {
  status: "idle" | "connecting" | "capturing" | "done" | "error";
  screenshotPath: string | null;
  error: string | null;
  nodeCount: number | null;
};

export function AnnotatedScreenshotCapture() {
  const { client, handshake } = useOrchestrator();
  const { sessions: detectedSessions, detect } = useChromeProbe();
  const isTauri = getTauriBridge().isTauri;

  const [selectedPort, setSelectedPort] = useState<number | null>(null);
  const [capture, setCapture] = useState<CaptureState>({
    status: "idle",
    screenshotPath: null,
    error: null,
    nodeCount: null,
  });

  // Pre-select the first detected session when probe results change
  useEffect(() => {
    if (detectedSessions.length > 0 && selectedPort === null) {
      setSelectedPort(detectedSessions[0].port);
    }
  }, [detectedSessions, selectedPort]);

  const captureAnnotatedScreenshot = useCallback(async () => {
    if (!client || !handshake || selectedPort === null) {
      setCapture({
        status: "error",
        screenshotPath: null,
        error: "Orchestrator not ready or no browser session selected.",
        nodeCount: null,
      });
      return;
    }

    setCapture({
      status: "connecting",
      screenshotPath: null,
      error: null,
      nodeCount: null,
    });

    try {
      // Step 1: Connect to the CDP session via the orchestrator
      const { session_id } = await client.connectSession(selectedPort);

      setCapture((prev) => ({ ...prev, status: "capturing" }));

      // Step 2: Capture the SOM-annotated screenshot
      // This runs `agent-browser screenshot --annotate` which draws
      // numbered overlays (SOM / Set-of-Marks) matching @e1/@e2 refs
      const result = await client.annotatedScreenshot(session_id);

      // Resolve the screenshot path — cloud mode uses HTTP URL, local uses Tauri asset protocol
      const displaySrc = await resolveScreenshotSrc(result.screenshot_path, result.screenshot_url);

      setCapture({
        status: "done",
        screenshotPath: displaySrc,
        error: null,
        nodeCount: result.node_count,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setCapture({
        status: "error",
        screenshotPath: null,
        error: message,
        nodeCount: null,
      });
    }
  }, [client, handshake, selectedPort]);

  const handleRescan = async () => {
    setCapture({ status: "idle", screenshotPath: null, error: null, nodeCount: null });
    await detect();
  };

  const busy = capture.status === "connecting" || capture.status === "capturing";

  return (
    <section className="card">
      <h2>Annotated Screenshot (SOM Overlay)</h2>
      <p className="muted">
        Capture a Set-of-Marks (SOM) annotated screenshot from a live browser session.
        The numbered overlay labels match the <code>@e1</code>/<code>@e2</code> refs in
        the accessibility snapshot — useful for visual-grounded model debugging.
      </p>

      {/* Browser session selector */}
      <div style={{ marginTop: "0.75rem" }}>
        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
          Target browser session
        </label>
        <div className="row" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
          <select
            value={selectedPort ?? ""}
            onChange={(e) => {
              const port = e.target.value ? Number(e.target.value) : null;
              setSelectedPort(port);
              setCapture({ status: "idle", screenshotPath: null, error: null, nodeCount: null });
            }}
            disabled={busy}
            style={{ minWidth: 200, padding: "0.4rem 0.6rem", borderRadius: 6 }}
          >
            {detectedSessions.length === 0 ? (
              <option value="">No sessions detected</option>
            ) : (
              detectedSessions.map((s) => (
                <option key={s.port} value={s.port}>
                  Port {s.port} — {s.browser} ({s.tabs.length} tab{s.tabs.length !== 1 ? "s" : ""})
                </option>
              ))
            )}
          </select>

          <button
            type="button"
            className="btn"
            onClick={handleRescan}
            disabled={busy}
          >
            {isTauri ? "Rescan ports" : "Rescan"}
          </button>
        </div>

        {/* Show tabs for the selected session */}
        {selectedPort !== null && (
          <div style={{ marginTop: "0.35rem" }}>
            {detectedSessions
              .filter((s) => s.port === selectedPort)
              .flatMap((s) => s.tabs)
              .slice(0, 5)
              .map((t) => (
                <div key={t.targetId} style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 500 }}>{t.title || "(untitled)"}</span>
                  {" — "}
                  <span style={{ wordBreak: "break-all" }}>{t.url}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Capture button */}
      <div className="row" style={{ marginTop: "1rem" }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={captureAnnotatedScreenshot}
          disabled={busy || selectedPort === null || !client}
        >
          {busy ? (
            <>
              <span style={{ display: "inline-block", width: 14, height: 14, marginRight: 6, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", verticalAlign: "middle", animation: "spin 1.2s linear infinite" }} />
              {capture.status === "connecting" ? "Connecting…" : "Capturing…"}
            </>
          ) : (
            "Capture annotated screenshot"
          )}
        </button>

        {capture.nodeCount !== null && (
          <span className="badge badge-low" style={{ marginLeft: "0.5rem" }}>
            {capture.nodeCount} nodes
          </span>
        )}
      </div>

      {/* Status / Error */}
      {capture.error && !busy ? (
        <div className="banner" style={{ marginTop: "0.75rem" }}>
          {capture.error}
        </div>
      ) : null}

      {/* Annotated screenshot preview */}
      {capture.status === "done" && capture.screenshotPath ? (
        <div style={{ marginTop: "1rem" }}>
          <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>Result</h3>
          <AnnotatedScreenshot src={capture.screenshotPath} alt="Annotated SOM screenshot" />
        </div>
      ) : null}

      {!isTauri && (
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          Browser detection and screenshot capture require the Mayra desktop app (Tauri).
        </p>
      )}
    </section>
  );
}
