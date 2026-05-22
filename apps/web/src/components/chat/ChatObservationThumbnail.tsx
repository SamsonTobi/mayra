"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/common/Modal";

type Props = {
  screenshotPath: string;
};

export function ChatObservationThumbnail({ screenshotPath }: Props) {
  const [thumbSrc, setThumbSrc] = useState<string | null>(null);
  const [fullSrc, setFullSrc] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const mod = await import("@tauri-apps/api/core");
        let pathForSrc = screenshotPath;
        try {
          pathForSrc = await mod.invoke<string>("asset_url", { path: screenshotPath });
        } catch {
          /* browser dev or path already resolved */
        }
        if (cancelled || typeof window === "undefined") return;
        const src = mod.convertFileSrc(pathForSrc);
        setThumbSrc(src);
        setFullSrc(src);
      } catch {
        if (!cancelled) {
          setThumbSrc(null);
          setFullSrc(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [screenshotPath]);

  if (!thumbSrc) return null;

  return (
    <>
      <button
        type="button"
        className="chat-observation-thumb"
        onClick={() => setOpen(true)}
        title="View observation screenshot"
        aria-label="View observation screenshot"
      >
        <img src={thumbSrc} alt="Page observation for this step" />
      </button>
      {open ? (
        <Modal title="Observation screenshot" onClose={() => setOpen(false)}>
          {fullSrc ? (
            <img
              src={fullSrc}
              alt="Full observation screenshot"
              style={{ maxWidth: "100%", maxHeight: "70vh" }}
            />
          ) : null}
        </Modal>
      ) : null}
    </>
  );
}
