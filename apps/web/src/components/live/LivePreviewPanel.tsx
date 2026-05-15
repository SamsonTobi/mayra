"use client";

import { useEffect, useState } from "react";

type Props = { screenshotPath: string | null };

/**
 * Latest step screenshot (F7). Uses `convertFileSrc` inside Tauri; browser dev shows placeholder.
 */
export function LivePreviewPanel({ screenshotPath }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!screenshotPath) {
      setSrc(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const mod = await import("@tauri-apps/api/core");
        let pathForSrc = screenshotPath;
        try {
          pathForSrc = await mod.invoke<string>("asset_url", { path: screenshotPath });
        } catch {
          /* non-Tauri or validation skipped */
        }
        if (!cancelled) setSrc(mod.convertFileSrc(pathForSrc));
      } catch {
        if (!cancelled) setSrc(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [screenshotPath]);

  if (!screenshotPath) {
    return (
      <section className="card">
        <h3>Live preview</h3>
        <p className="muted">Waiting for an action with a screenshot path…</p>
      </section>
    );
  }

  if (!src) {
    return (
      <section className="card">
        <h3>Live preview</h3>
        <p className="muted">
          Path: <code>{screenshotPath}</code>
        </p>
        <p className="muted">
          Open inside the Tauri shell to map local files via <code>convertFileSrc</code>{" "}
          (MAYRA_DESKTOP_UX_FLOWS §4.4).
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <h3>Live preview</h3>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Latest agent screenshot" style={{ maxWidth: "100%" }} />
    </section>
  );
}
