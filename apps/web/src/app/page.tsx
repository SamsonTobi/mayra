"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrchestrator } from "@/providers/orchestrator-context";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

/**
 * Onboarding gate (MAYRA_TECHNICAL_SPEC §3.2, MAYRA_DESKTOP_UX_FLOWS §3).
 */
export default function HomePage() {
  const router = useRouter();
  const { handshake, onboardingComplete } = useOrchestrator();

  useEffect(() => {
    if (handshake && onboardingComplete) {
      router.replace("/chat");
    }
  }, [handshake, onboardingComplete, router]);

  if (!handshake) {
    return (
      <section>
        <h1>Mayra</h1>
        <p className="muted">Starting engine…</p>
        <p className="muted">
          Waiting for <code>orchestrator-ready</code> from the desktop shell.
        </p>
      </section>
    );
  }

  if (onboardingComplete) {
    return (
      <section>
        <p className="muted">Opening chat…</p>
      </section>
    );
  }

  return (
    <section>
      <h1>Welcome</h1>
      <p className="muted">Complete setup to continue.</p>
      <OnboardingFlow />
    </section>
  );
}
