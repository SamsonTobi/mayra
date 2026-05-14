"use client";

import type { CreateTaskInput, OrchestratorClient } from "@/lib/orchestrator-client";

export type ChromeMode = "managed" | "remote";

type Props = {
  onBack: () => void;
  onSelect: (mode: ChromeMode) => void;
  /** When set, selecting managed invokes createTask (§B.4 RTL test). */
  orchestrator?: OrchestratorClient | null;
  /** If true, run createTask on managed selection (tests only). */
  testCreateOnManaged?: boolean;
};

/**
 * Chrome connection choice (F4). Default: agent-managed Chrome.
 */
export function ChromeChoiceCard({
  onBack,
  onSelect,
  orchestrator,
  testCreateOnManaged,
}: Props) {
  const runManaged = async () => {
    if (testCreateOnManaged && orchestrator) {
      const body: CreateTaskInput = {
        goal: "smoke",
        allowed_domains: ["example.com"],
      };
      await orchestrator.createTask(body);
    }
    onSelect("managed");
  };

  return (
    <section className="card">
      <h2>Chrome</h2>
      <p className="muted">
        Headed browsing is default (PRD §5). You can attach to an existing Chrome with
        remote debugging (F4).
      </p>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={runManaged}>
          Managed Chrome
        </button>
        <button type="button" className="btn" onClick={() => onSelect("remote")}>
          Connect existing Chrome
        </button>
        <button type="button" className="btn" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}
