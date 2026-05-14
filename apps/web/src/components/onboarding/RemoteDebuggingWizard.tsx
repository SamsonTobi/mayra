"use client";

type Props = {
  onBack: () => void;
  onDone: () => void;
  /** Compact copy when embedded under Settings (vs full onboarding step). */
  variant?: "onboarding" | "embedded";
};

/**
 * Guided flow for `--remote-debugging-port` (F4, Windows hint).
 */
export function RemoteDebuggingWizard({ onBack, onDone, variant = "onboarding" }: Props) {
  const cmd =
    '"C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe" --remote-debugging-port=9222';

  const embedded = variant === "embedded";

  return (
    <section className="card" style={{ marginTop: embedded ? "0.5rem" : undefined }}>
      <h2>{embedded ? "Enable remote debugging" : "Remote debugging"}</h2>
      <div className="banner">
        On Windows, Chrome is commonly under{" "}
        <code>Program Files\\Google\\Chrome\\Application\\</code>. Close all Chrome windows
        before launching with a debug port.
      </div>
      <p className="muted">Example launch command (copy and adjust the path):</p>
      <textarea readOnly rows={3} defaultValue={cmd} />
      <p className="muted">
        After Chrome starts, use &quot;Detect browsers&quot; in Settings (Phase 2) or the orchestrator
        CDP connect flow (Phase 3).
      </p>
      <div className="row">
        <button type="button" className="btn" onClick={onBack}>
          {embedded ? "Close" : "Back"}
        </button>
        {!embedded ? (
          <button type="button" className="btn btn-primary" onClick={onDone}>
            Continue
          </button>
        ) : null}
      </div>
    </section>
  );
}
