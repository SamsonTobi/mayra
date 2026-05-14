"use client";

import { useState } from "react";
import { useOrchestrator } from "@/providers/orchestrator-context";
import { ProviderSetupCard } from "./ProviderSetupCard";
import { ChromeChoiceCard } from "./ChromeChoiceCard";
import { RemoteDebuggingWizard } from "./RemoteDebuggingWizard";

type Step = "provider" | "chrome" | "remote" | "ready";

export function OnboardingFlow() {
  const { setChromeMode, markOnboardingComplete } = useOrchestrator();
  const [step, setStep] = useState<Step>("provider");

  return (
    <div>
      {step === "provider" && (
        <ProviderSetupCard onContinue={() => setStep("chrome")} />
      )}
      {step === "chrome" && (
        <ChromeChoiceCard
          onBack={() => setStep("provider")}
          onSelect={(mode) => {
            setChromeMode(mode);
            setStep(mode === "remote" ? "remote" : "ready");
          }}
        />
      )}
      {step === "remote" && (
        <RemoteDebuggingWizard
          onBack={() => setStep("chrome")}
          onDone={() => setStep("ready")}
        />
      )}
      {step === "ready" && (
        <section className="card">
          <p className="muted">You&apos;re ready to chat.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={markOnboardingComplete}
          >
            Enter Mayra
          </button>
        </section>
      )}
    </div>
  );
}
