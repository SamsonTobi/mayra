"use client";

import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { useOrchestrator } from "@/providers/orchestrator-context";
import { getTauriBridge } from "@/lib/tauri";
import { isWebMode } from "@/lib/mode";

type KeyStatus = {
  configured: boolean;
  last4: string;
};

export function ProviderSettings() {
  const { client } = useOrchestrator();
  const [key, setKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");

  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [openrouterStatus, setOpenrouterStatus] = useState<KeyStatus | null>(null);

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

    void invoke<KeyStatus>("provider_key_status", { provider: "openrouter" })
      .then((next) => {
        if (!cancelled) setOpenrouterStatus(next);
      })
      .catch(() => {
        if (!cancelled) setOpenrouterStatus({ configured: false, last4: "" });
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

  async function onSaveOpenrouterKey() {
    if (!openrouterKey.trim()) return;
    setBusy(true);
    setMessage("Saving OpenRouter key...");
    try {
      await invoke("save_provider_key", {
        provider: "openrouter",
        key: openrouterKey.trim(),
      });
      setOpenrouterKey("");
      const next = await invoke<KeyStatus>("provider_key_status", {
        provider: "openrouter",
      });
      setOpenrouterStatus(next);
      setMessage("OpenRouter key saved. The sidecar restarted.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save OpenRouter key.");
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

  async function onValidateOpenrouter() {
    if (!client) return;
    setBusy(true);
    setMessage("Validating OpenRouter...");
    try {
      const result = await client.validateSettings({
        provider: "openrouter",
        model: "qwen/qwen3-vl-30b-a3b",
      });
      setMessage(`OpenRouter responded in ${result.latency_ms} ms.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "OpenRouter validation failed.");
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
        <label className="muted" htmlFor="openrouter-key">
          OpenRouter API key
        </label>
        {tauriReady && openrouterStatus ? (
          <p className="muted" style={{ marginBottom: "0.75rem" }}>
            {openrouterStatus.configured ? (
              <>
                OpenRouter key is saved (last 4:{" "}
                <code>{openrouterStatus.last4}</code>).
              </>
            ) : (
              <>No OpenRouter key saved yet — paste below and click Save.</>
            )}
          </p>
        ) : null}
        <div className="row" style={{ gap: "0.75rem", marginTop: "0.5rem" }}>
          <input
            id="openrouter-key"
            type="password"
            value={openrouterKey}
            placeholder={
              openrouterStatus?.configured
                ? `Configured ending in ${openrouterStatus.last4}`
                : "Paste key (sk-or-v1-...)"
            }
            onChange={(event) => setOpenrouterKey(event.target.value)}
            disabled={!tauriReady || busy}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={onSaveOpenrouterKey}
            disabled={!tauriReady || busy || !openrouterKey.trim()}
          >
            Save
          </button>
          <button
            type="button"
            className="btn"
            onClick={onValidateOpenrouter}
            disabled={!client || busy}
          >
            Validate
          </button>
        </div>
      </div>

      {!tauriReady ? (
        isWebMode() ? (
          <p className="muted">Provider keys are managed by your administrator on the cloud orchestrator.</p>
        ) : (
          <p className="muted">Open the desktop shell to save provider keys.</p>
        )
      ) : null}
      {message ? <p className="muted">{message}</p> : null}
    </section>
  );
}
