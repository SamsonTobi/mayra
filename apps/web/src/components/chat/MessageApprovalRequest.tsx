"use client";

import { useEffect, useState } from "react";
import type { ApprovalRequestMessage } from "@mayra/contracts";
import { postApprove } from "@/lib/orchestrator-mutations";
import { AnnotatedScreenshot } from "@/components/common/AnnotatedScreenshot";
import { Modal } from "@/components/common/Modal";
import { resolveScreenshotSrc } from "@/lib/screenshot";
import { useCloudAuthSafe } from "@/providers/cloud-auth-context";
import { isWebMode } from "@/lib/mode";

type Props = {
  message: ApprovalRequestMessage;
  baseUrl: string | null;
  token: string | null;
  /** Optional file URL from Tauri convertFileSrc (F10). */
  screenshotSrc?: string | null;
};

export function MessageApprovalRequest({
  message,
  baseUrl,
  token,
  screenshotSrc,
}: Props) {
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedScreenshotSrc, setResolvedScreenshotSrc] = useState<
    string | null
  >(screenshotSrc ?? null);

  useEffect(() => {
    if (screenshotSrc) {
      setResolvedScreenshotSrc(screenshotSrc);
      return;
    }
    let cancelled = false;
    void (async () => {
      const src = await resolveScreenshotSrc(message.screenshot_path, message.screenshot_url);
      if (!cancelled) setResolvedScreenshotSrc(src);
    })();
    return () => {
      cancelled = true;
    };
  }, [message.screenshot_path, message.screenshot_url, screenshotSrc]);

  const cloudAuth = useCloudAuthSafe();

  const decide = async (decision: "approve" | "reject") => {
    if (baseUrl == null || token == null) {
      setError("Sidecar not ready");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await postApprove(baseUrl, token, {
        approval_id: message.id,
        decision,
      }, cloudAuth?.handleUnauthorized);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "approve failed");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <Modal title="Approval required" onClose={() => void decide("reject")}>
      <p className="muted">{message.action.reason}</p>
      <AnnotatedScreenshot src={resolvedScreenshotSrc} alt="Annotated target" />
      {error ? <p className="system-row error">{error}</p> : null}
      <div className="row" style={{ marginTop: "0.75rem" }}>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => void decide("reject")}
        >
          Reject
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => void decide("approve")}
        >
          Approve
        </button>
      </div>
    </Modal>
  );
}
