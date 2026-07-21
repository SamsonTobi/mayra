"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCloudAuth } from "@/providers/cloud-auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useCloudAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await login(password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg, #0a0a0a)",
        color: "var(--fg, #e5e5e5)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          padding: "2rem",
          background: "var(--surface, #141414)",
          borderRadius: "12px",
          border: "1px solid var(--border, #2a2a2a)",
          minWidth: "320px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.25rem", textAlign: "center" }}>
          Mayra
        </h1>
        <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.6, textAlign: "center" }}>
          Enter the shared password to continue.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          disabled={busy}
          autoFocus
          style={{
            padding: "0.6rem 0.8rem",
            borderRadius: "6px",
            border: "1px solid var(--border, #2a2a2a)",
            background: "var(--input-bg, #1a1a1a)",
            color: "inherit",
            fontSize: "0.95rem",
          }}
        />
        {error ? (
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#ef4444" }}>{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={busy || !password.trim()}
          className="btn btn-primary"
          style={{ padding: "0.6rem 1rem", borderRadius: "6px" }}
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
