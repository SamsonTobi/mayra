"use client";

import { useEffect, useState } from "react";
import { getTauriBridge } from "@/lib/tauri";

/** Dev-only banner when the UI runs in a normal browser tab instead of the Tauri shell. */
export function BrowserShellHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    setVisible(!getTauriBridge().isTauri);
  }, []);

  if (!visible) return null;

  return (
    <aside
      role="note"
      style={{
        margin: "0 auto",
        maxWidth: "960px",
        padding: "0.65rem 1.25rem",
        borderBottom: "1px solid var(--risk-med)",
        background: "rgba(234, 179, 8, 0.12)",
        fontSize: "0.9rem",
        color: "var(--fg)",
      }}
    >
      <strong>Browser preview.</strong> This tab is not the desktop app. Run{" "}
      <code style={{ whiteSpace: "nowrap" }}>npm run dev:desktop</code> from the repo root or{" "}
      <code style={{ whiteSpace: "nowrap" }}>npm run dev</code> inside{" "}
      <code style={{ whiteSpace: "nowrap" }}>apps/desktop</code>
      — expect a native window titled <strong>Mayra</strong> (same UI inside WebView2, not your
      browser&apos;s tab bar).
    </aside>
  );
}
