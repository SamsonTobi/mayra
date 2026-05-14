"use client";

type Props = { onContinue: () => void };

/**
 * Provider + goal capture (F3). API keys are never written to web storage — Tauri keyring only.
 */
export function ProviderSetupCard({ onContinue }: Props) {
  return (
    <section className="card">
      <h2>Provider</h2>
      <p className="muted">
        In the packaged app, keys are saved via Tauri <code>save_provider_key</code> and
        never synced to Supabase (PRD §6).
      </p>
      <label className="muted" htmlFor="goal">
        Example task goal (optional)
      </label>
      <input id="goal" type="text" placeholder="e.g. Download my transcript" />
      <div className="row" style={{ marginTop: "0.75rem" }}>
        <button type="button" className="btn btn-primary" onClick={onContinue}>
          Continue
        </button>
      </div>
    </section>
  );
}
