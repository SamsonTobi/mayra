"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OrchestratorClient } from "@/lib/orchestrator-client";

type Props = {
  sessionId: string | null;
  client: OrchestratorClient | null;
  /** Polling interval in ms (default 2000 = 2s) */
  intervalMs?: number;
};

/**
 * Cloud live browser preview — shows a live screenshot of the cloud Chromium
 * and lets the user click on it (for captchas the agent can't handle).
 *
 * Polls the /v1/sessions/{id}/live-screenshot endpoint for fresh screenshots.
 * Clicks are sent to /v1/sessions/{id}/live-click.
 */
export function CloudLivePreview({ sessionId, client, intervalMs = 2000 }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clicking, setClicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!client || !sessionId) return;
    try {
      const url = await client.liveScreenshotUrl(sessionId);
      if (url) {
        setSrc((prev) => {
          if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
          return url;
        });
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load screenshot");
    }
  }, [client, sessionId]);

  // Poll for live screenshots
  useEffect(() => {
    if (!client || !sessionId) {
      setSrc(null);
      return;
    }
    setLoading(true);
    refresh().finally(() => setLoading(false));
    pollingRef.current = setInterval(refresh, intervalMs);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      setSrc((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [client, sessionId, intervalMs, refresh]);

  const handleClick = useCallback(async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!client || !sessionId || !imgRef.current) return;
    const img = imgRef.current;
    const rect = img.getBoundingClientRect();
    // Scale click coordinates to the actual page size
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    setClicking(true);
    try {
      await client.liveClick(sessionId, x, y);
      // Refresh screenshot after click
      setTimeout(() => void refresh(), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Click failed");
    } finally {
      setClicking(false);
    }
  }, [client, sessionId, refresh]);

  if (!sessionId) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        gap: "0.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.5rem 0",
        }}
      >
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--fg)" }}>
          Live Browser
        </span>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "0.25rem 0.5rem",
            fontSize: "0.75rem",
            color: "var(--muted)",
            cursor: "pointer",
          }}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
      {error ? (
        <p style={{ fontSize: "0.75rem", color: "#ef4444", margin: 0 }}>{error}</p>
      ) : null}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          background: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: clicking ? "wait" : "crosshair",
          minHeight: "200px",
        }}
      >
        {src ? (
          <img
            ref={imgRef}
            src={src}
            alt="Live browser view"
            onClick={handleClick}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
            }}
          />
        ) : (
          <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
            {loading ? "Loading…" : "No preview"}
          </span>
        )}
      </div>
      <p style={{ fontSize: "0.7rem", color: "var(--muted)", margin: 0 }}>
        Click on the screenshot to interact with the page (e.g. captchas)
      </p>
    </div>
  );
}
