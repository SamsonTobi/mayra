"use client";

import { useState } from "react";
import { useCloudAuth } from "@/providers/cloud-auth-context";
import { Modal } from "@/components/common/Modal";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

/**
 * Cloud login dialog for desktop mode.
 * Shown when the user selects "Cloud" in the LocalCloudToggle
 * but hasn't authenticated yet.
 */
export function CloudLoginDialog({ open, onClose, onSuccess }: Props) {
  const { login } = useCloudAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await login(password);
      setPassword("");
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Sign in to Mayra Cloud" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
          Enter the shared password to use the cloud agent (headless Chromium in the cloud).
          Your local tasks continue running independently.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          disabled={busy}
          autoFocus
          style={{
            padding: "0.5rem 0.7rem",
            borderRadius: "6px",
            border: "1px solid var(--border, #2a2a2a)",
            background: "var(--input-bg, #1a1a1a)",
            color: "inherit",
            fontSize: "0.9rem",
          }}
        />
        {error ? (
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#ef4444" }}>{error}</p>
        ) : null}
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || !password.trim()}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
