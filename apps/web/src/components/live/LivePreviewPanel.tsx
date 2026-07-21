"use client";

import { useEffect, useState } from "react";
import { resolveScreenshotSrc } from "@/lib/screenshot";

type Props = {
  screenshotPath: string | null;
  screenshotUrl?: string | null;
  sessionId?: string | null;
  client?: any;
};

/**
 * Live Interactive Viewport Panel.
 * Renders the active browser preview and maps native user interactions
 * (clicks, typing, navigation, and scrolling) back to Chrome over CDP.
 */
export function LivePreviewPanel({ screenshotPath, screenshotUrl, sessionId, client }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [keys, setKeys] = useState("");

  // Sync screenshotPath when it changes from the orchestrator
  useEffect(() => {
    if (!screenshotPath) {
      setSrc(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const resolved = await resolveScreenshotSrc(screenshotPath, screenshotUrl);
      if (!cancelled) setSrc(resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, [screenshotPath, screenshotUrl]);

  // Click on viewport handler
  const handleImageClick = async (event: React.MouseEvent<HTMLImageElement>) => {
    if (!sessionId || !client || loading) return;

    const img = event.currentTarget;
    const rect = img.getBoundingClientRect();

    // Coordinates relative to displayed image bounds
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Scale to the natural image resolution of the Chromium browser
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;

    const x = Math.round(clickX * scaleX);
    const y = Math.round(clickY * scaleY);

    setLoading(true);
    try {
      const res = await client.interactSession(sessionId, {
        action: "click",
        x,
        y,
      });
      const mod = await import("@tauri-apps/api/core");
      let pathForSrc = res.screenshot_path;
      try {
        pathForSrc = await mod.invoke<string>("asset_url", { path: res.screenshot_path });
      } catch {
        /* fallback */
      }
      setSrc(mod.convertFileSrc(pathForSrc));
    } catch (e) {
      console.error("Embedded click failed:", e);
    } finally {
      setLoading(false);
    }
  };

  // Scroll handler
  const handleScroll = async (direction: "up" | "down") => {
    if (!sessionId || !client || loading) return;

    setLoading(true);
    try {
      const res = await client.interactSession(sessionId, {
        action: "scroll",
        text: direction,
      });
      const mod = await import("@tauri-apps/api/core");
      let pathForSrc = res.screenshot_path;
      try {
        pathForSrc = await mod.invoke<string>("asset_url", { path: res.screenshot_path });
      } catch {
        /* fallback */
      }
      setSrc(mod.convertFileSrc(pathForSrc));
    } catch (e) {
      console.error("Embedded scroll failed:", e);
    } finally {
      setLoading(false);
    }
  };

  // Navigate handler
  const handleNavigate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !client || !url.trim() || loading) return;

    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }

    setLoading(true);
    try {
      const res = await client.interactSession(sessionId, {
        action: "navigate",
        text: targetUrl,
      });
      const mod = await import("@tauri-apps/api/core");
      let pathForSrc = res.screenshot_path;
      try {
        pathForSrc = await mod.invoke<string>("asset_url", { path: res.screenshot_path });
      } catch {
        /* fallback */
      }
      setSrc(mod.convertFileSrc(pathForSrc));
      setUrl("");
    } catch (e) {
      console.error("Embedded navigation failed:", e);
    } finally {
      setLoading(false);
    }
  };

  // Type text handler
  const handleSendKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !client || !keys.trim() || loading) return;

    setLoading(true);
    try {
      const res = await client.interactSession(sessionId, {
        action: "type",
        text: keys,
      });
      const mod = await import("@tauri-apps/api/core");
      let pathForSrc = res.screenshot_path;
      try {
        pathForSrc = await mod.invoke<string>("asset_url", { path: res.screenshot_path });
      } catch {
        /* fallback */
      }
      setSrc(mod.convertFileSrc(pathForSrc));
      setKeys("");
    } catch (e) {
      console.error("Sending keys failed:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card" style={{ marginTop: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: sessionId ? "#22c55e" : "#6b7280" }} />
          Embedded Browser Preview
        </h3>
        {sessionId ? (
          <span className="badge badge-low" style={{ fontSize: "0.75rem" }}>
            User Co-Browsing Ready (CDP)
          </span>
        ) : (
          <span className="badge badge-high" style={{ fontSize: "0.75rem" }}>
            No Active Session
          </span>
        )}
      </div>

      {sessionId && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
          {/* Navigation Address Bar */}
          <form onSubmit={handleNavigate} style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              placeholder="Enter URL to navigate (e.g. jiji.ng)..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              style={{ flex: 1, padding: "0.4rem 0.6rem", borderRadius: "6px" }}
            />
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: "0.4rem 0.85rem" }}>
              Navigate
            </button>
          </form>

          {/* Text Input Sender */}
          <form onSubmit={handleSendKeys} style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              placeholder="Type text to send to focused element..."
              value={keys}
              onChange={(e) => setKeys(e.target.value)}
              disabled={loading}
              style={{ flex: 1, padding: "0.4rem 0.6rem", borderRadius: "6px" }}
            />
            <button type="submit" className="btn" disabled={loading} style={{ padding: "0.4rem 0.85rem" }}>
              Type Keys
            </button>
          </form>

          {/* Quick Actions & Scroll */}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button type="button" className="btn" onClick={() => handleScroll("up")} disabled={loading} style={{ flex: 1 }}>
              ⬆️ Scroll Up
            </button>
            <button type="button" className="btn" onClick={() => handleScroll("down")} disabled={loading} style={{ flex: 1 }}>
              ⬇️ Scroll Down
            </button>
          </div>
        </div>
      )}

      {/* Main Viewport display */}
      {!src ? (
        <div style={{
          padding: "3rem 1rem",
          textAlign: "center",
          border: "2px dashed #2d3139",
          borderRadius: "8px",
          color: "#9aa0a6"
        }}>
          <p style={{ margin: "0 0 0.5rem" }}>Waiting for an active browser session snapshot...</p>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            Start the browser session above to activate real-time co-browsing.
          </p>
        </div>
      ) : (
        <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Latest agent screenshot"
            onClick={handleImageClick}
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              cursor: loading ? "not-allowed" : "crosshair",
              transition: "opacity 0.25s ease",
              opacity: loading ? 0.45 : 1,
            }}
          />

          {/* Dynamic Loading Overlay */}
          {loading && (
            <div style={{
              position: "absolute",
              inset: 0,
              background: "rgba(15, 17, 21, 0.6)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem"
            }}>
              <div style={{
                width: "24px",
                height: "24px",
                border: "3px solid #3b82f6",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
              }} />
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
              <span style={{ fontSize: "0.85rem", color: "#e8eaed", fontWeight: 500 }}>
                Syncing with browser...
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
