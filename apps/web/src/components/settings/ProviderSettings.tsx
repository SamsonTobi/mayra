"use client";

import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { useOrchestrator } from "@/providers/orchestrator-context";
import { getTauriBridge } from "@/lib/tauri";

type KeyStatus = {
  configured: boolean;
  last4: string;
};

export function ProviderSettings() {
  const { client } = useOrchestrator();
  const [key, setKey] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [cfAccountId, setCfAccountId] = useState("");
  const [cfApiToken, setCfApiToken] = useState("");

  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [groqStatus, setGroqStatus] = useState<KeyStatus | null>(null);
  const [cfStatus, setCfStatus] = useState<KeyStatus | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const tauriReady = getTauriBridge().isTauri;

  useEffect(() => {
    let cancelled = false;
    if (!tauriReady) return;

    void invoke<KeyStatus>("provider_key_status", { provider: "gemini" })
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch(() => {
        if (!cancelled) setStatus({ configured: false, last4: "" });
      });

    void invoke<KeyStatus>("provider_key_status", { provider: "groq" })
      .then((next) => {
        if (!cancelled) setGroqStatus(next);
      })
      .catch(() => {
        if (!cancelled) setGroqStatus({ configured: false, last4: "" });
      });

    void invoke<KeyStatus>("provider_key_status", { provider: "cloudflare" })
      .then((next) => {
        if (!cancelled) setCfStatus(next);
      })
      .catch(() => {
        if (!cancelled) setCfStatus({ configured: false, last4: "" });
      });

    return () => {
      cancelled = true;
    };
  }, [tauriReady]);

  async function onSaveGeminiKey() {
    if (!key.trim()) return;
    setBusy(true);
    setMessage("Saving Gemini key...");
    try {
      await invoke("save_provider_key", {
        provider: "gemini",
        key: key.trim(),
      });
      setKey("");
      const next = await invoke<KeyStatus>("provider_key_status", {
        provider: "gemini",
      });
      setStatus(next);
      setMessage("Gemini key saved. The sidecar restarted with the new key.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save Gemini key.");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveGroqKey() {
    if (!groqKey.trim()) return;
    setBusy(true);
    setMessage("Saving Groq key...");
    try {
      await invoke("save_provider_key", {
        provider: "groq",
        key: groqKey.trim(),
      });
      setGroqKey("");
      const next = await invoke<KeyStatus>("provider_key_status", {
        provider: "groq",
      });
      setGroqStatus(next);
      setMessage("Groq key saved. The sidecar restarted.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save Groq key.");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveCfKey() {
    if (!cfAccountId.trim() || !cfApiToken.trim()) return;
    setBusy(true);
    setMessage("Saving Cloudflare credentials...");
    try {
      // Combine account id and token behind the scenes
      const combinedKey = `${cfAccountId.trim()}:${cfApiToken.trim()}`;
      await invoke("save_provider_key", {
        provider: "cloudflare",
        key: combinedKey,
      });
      setCfAccountId("");
      setCfApiToken("");
      const next = await invoke<KeyStatus>("provider_key_status", {
        provider: "cloudflare",
      });
      setCfStatus(next);
      setMessage("Cloudflare credentials saved. The sidecar restarted.");
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Could not save Cloudflare credentials.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onValidateGemini() {
    if (!client) return;
    setBusy(true);
    setMessage("Validating Gemini...");
    try {
      const result = await client.validateSettings({
        provider: "gemini",
        model: "gemini-2.5-flash",
      });
      setMessage(`Gemini responded in ${result.latency_ms} ms.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gemini validation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onValidateGroq() {
    if (!client) return;
    setBusy(true);
    setMessage("Validating Groq...");
    try {
      const result = await client.validateSettings({
        provider: "groq",
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
      });
      setMessage(`Groq responded in ${result.latency_ms} ms.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Groq validation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onValidateCf() {
    if (!client) return;
    setBusy(true);
    setMessage("Validating Cloudflare...");
    try {
      const result = await client.validateSettings({
        provider: "cloudflare",
        model: "@cf/meta/llama-3.1-8b-instruct",
      });
      setMessage(`Cloudflare responded in ${result.latency_ms} ms.`);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Cloudflare validation failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2>Providers</h2>
      <p className="muted">
        Model provider, API keys via Tauri keyring, and validate via{" "}
        <code>POST /v1/settings/validate</code> (MAYRA_DESKTOP_UX_FLOWS F3).
      </p>
      {tauriReady && status ? (
        <p className="muted" style={{ marginBottom: "0.75rem" }}>
          {status.configured ? (
            <>
              Gemini key is saved (last 4: <code>{status.last4}</code>). Re-open
              Settings anytime to replace it.
            </>
          ) : (
            <>No Gemini key saved yet — paste below and click Save.</>
          )}
        </p>
      ) : null}
      <label className="muted" htmlFor="gemini-key">
        Gemini API key
      </label>
      <div className="row" style={{ gap: "0.75rem", marginTop: "0.5rem" }}>
        <input
          id="gemini-key"
          type="password"
          value={key}
          placeholder={
            status?.configured
              ? `Configured ending in ${status.last4}`
              : "Paste key"
          }
          onChange={(event) => setKey(event.target.value)}
          disabled={!tauriReady || busy}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={onSaveGeminiKey}
          disabled={!tauriReady || busy || !key.trim()}
        >
          Save
        </button>
        <button
          type="button"
          className="btn"
          onClick={onValidateGemini}
          disabled={!client || busy}
        >
          Validate
        </button>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <label className="muted" htmlFor="groq-key">
          Groq API key
        </label>
        <div className="row" style={{ gap: "0.75rem", marginTop: "0.5rem" }}>
          <input
            id="groq-key"
            type="password"
            value={groqKey}
            placeholder={
              groqStatus?.configured
                ? `Configured ending in ${groqStatus.last4}`
                : "Paste key"
            }
            onChange={(event) => setGroqKey(event.target.value)}
            disabled={!tauriReady || busy}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={onSaveGroqKey}
            disabled={!tauriReady || busy || !groqKey.trim()}
          >
            Save
          </button>
          <button
            type="button"
            className="btn"
            onClick={onValidateGroq}
            disabled={!client || busy}
          >
            Validate
          </button>
        </div>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <label className="muted" htmlFor="cf-account-id">
          Cloudflare Credentials
        </label>
        <div className="row" style={{ gap: "0.75rem", marginTop: "0.5rem" }}>
          <input
            id="cf-account-id"
            type="text"
            value={cfAccountId}
            placeholder={
              cfStatus?.configured ? "Account ID configured" : "Account ID"
            }
            onChange={(event) => setCfAccountId(event.target.value)}
            disabled={!tauriReady || busy}
          />
          <input
            id="cf-api-token"
            type="password"
            value={cfApiToken}
            placeholder={
              cfStatus?.configured
                ? `Token ending in ${cfStatus.last4}`
                : "API Token"
            }
            onChange={(event) => setCfApiToken(event.target.value)}
            disabled={!tauriReady || busy}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={onSaveCfKey}
            disabled={
              !tauriReady || busy || !cfAccountId.trim() || !cfApiToken.trim()
            }
          >
            Save
          </button>
          <button
            type="button"
            className="btn"
            onClick={onValidateCf}
            disabled={!client || busy}
          >
            Validate
          </button>
        </div>
      </div>

      {!tauriReady ? (
        <p className="muted">Open the desktop shell to save provider keys.</p>
      ) : null}
      {message ? <p className="muted">{message}</p> : null}
    </section>
  );
}
