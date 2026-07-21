"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/common/Modal";
import { resolveScreenshotSrc } from "@/lib/screenshot";

type Props = {
  screenshotPath: string;
  /** Optional HTTP URL from the orchestrator (cloud mode). */
  screenshotUrl?: string | null;
  /**
   * - `default`: a normal rectangular preview card (~160px wide).
   * - `compact`: a tiny inline pill used inside the step row summary.
   */
  variant?: "default" | "compact";
};

export function ChatObservationThumbnail({
  screenshotPath,
  screenshotUrl,
  variant = "default",
}: Props) {
  const [thumbSrc, setThumbSrc] = useState<string | null>(null);
  const [fullSrc, setFullSrc] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const src = await resolveScreenshotSrc(screenshotPath, screenshotUrl);
      if (!cancelled) {
        setThumbSrc(src);
        setFullSrc(src);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [screenshotPath, screenshotUrl]);

  if (!thumbSrc) return null;

  const className =
    variant === "compact"
      ? "chat-observation-thumb chat-observation-thumb-compact"
      : "chat-observation-thumb";

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
        title="View observation screenshot"
        aria-label="View observation screenshot"
      >
        {variant === "compact" ? (
          <span className="chat-observation-thumb-compact-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width={12}
              height={12}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="6" width="18" height="13" rx="2" />
              <circle cx="12" cy="12.5" r="3.2" />
              <path d="M8 6l1.5-2h5L16 6" />
            </svg>
          </span>
        ) : (
          <img src={thumbSrc} alt="Page observation for this step" />
        )}
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
