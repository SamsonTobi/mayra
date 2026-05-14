"use client";

import { useState } from "react";
import type { ApprovalRequestMessage } from "@mayra/contracts";
import { postApprove } from "@/lib/orchestrator-mutations";
import { AnnotatedScreenshot } from "@/components/common/AnnotatedScreenshot";
import { Modal } from "@/components/common/Modal";

type Props = {
  message: ApprovalRequestMessage;
  port: number | null;
  token: string | null;
  /** Optional file URL from Tauri convertFileSrc (F10). */
  screenshotSrc?: string | null;
};

export function MessageApprovalRequest({
  message,
  port,
  token,
  screenshotSrc,
}: Props) {
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decide = async (decision: "approve" | "reject") => {
    if (port == null || token == null) {
      setError("Sidecar not ready");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await postApprove(port, token, {
        approval_id: message.id,
        decision,
      });
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
      <AnnotatedScreenshot src={screenshotSrc ?? null} alt="Annotated target" />
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
