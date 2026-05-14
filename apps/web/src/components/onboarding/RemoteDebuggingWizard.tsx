"use client";

type Props = { onBack: () => void; onDone: () => void };

/**
 * Guided flow for `--remote-debugging-port` (F4, Windows hint).
 */
export function RemoteDebuggingWizard({ onBack, onDone }: Props) {
  const cmd =
    '"C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe" --remote-debugging-port=9222';

  return (
    <section className="card">
      <h2>Remote debugging</h2>
      <div className="banner">
        On Windows, Chrome is commonly under{" "}
        <code>Program Files\\Google\\Chrome\\Application\\</code>. Close all Chrome windows
        before launching with a debug port.
      </div>
      <p className="muted">Example launch command (copy and adjust the path):</p>
      <textarea readOnly rows={3} defaultValue={cmd} />
      <p className="muted">
        After Chrome starts, the orchestrator adapter will verify the CDP endpoint (T7).
      </p>
      <div className="row">
        <button type="button" className="btn" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn btn-primary" onClick={onDone}>
          Continue
        </button>
      </div>
    </section>
  );
}
