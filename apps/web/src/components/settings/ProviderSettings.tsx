"use client";

export function ProviderSettings() {
  return (
    <section className="card">
      <h2>Providers</h2>
      <p className="muted">
        Model provider, API keys via Tauri keyring, and validate via{" "}
        <code>POST /v1/settings/validate</code> (MAYRA_DESKTOP_UX_FLOWS F3).
      </p>
    </section>
  );
}
