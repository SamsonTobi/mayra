"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { OrchestratorClient } from "@/lib/orchestrator-client";
import type { SidecarHandshake } from "@/lib/tauri";
import { useSidecarReady } from "@/hooks/useSidecarReady";

const STORAGE_KEY = "mayra.onboarding.v1";

export type OrchestratorContextValue = {
  handshake: SidecarHandshake | null;
  port: number | null;
  token: string | null;
  client: OrchestratorClient | null;
  /** True once user completed onboarding wizard this tab session (spec §3.2 gate). */
  onboardingComplete: boolean;
  markOnboardingComplete: () => void;
  /** Chrome / agent-browser mode chosen at onboarding (F4). */
  chromeMode: "managed" | "remote" | null;
  setChromeMode: (m: "managed" | "remote") => void;
};

const OrchestratorCtx = createContext<OrchestratorContextValue | null>(null);

function readOnboardingFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const v = JSON.parse(raw) as { ok?: boolean };
    return v.ok === true;
  } catch {
    return false;
  }
}

export function OrchestratorProvider({ children }: { children: ReactNode }) {
  const handshake = useSidecarReady();
  const [onboardingComplete, setOnboardingComplete] = useState(readOnboardingFlag);
  const [chromeMode, setChromeMode] = useState<"managed" | "remote" | null>(null);

  const client = useMemo(() => {
    if (!handshake) return null;
    return new OrchestratorClient(handshake.port, handshake.token);
  }, [handshake]);

  const markOnboardingComplete = useCallback(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ok: true, ts: Date.now() }));
    setOnboardingComplete(true);
  }, []);

  const value = useMemo(
    () => ({
      handshake,
      port: handshake?.port ?? null,
      token: handshake?.token ?? null,
      client,
      onboardingComplete,
      markOnboardingComplete,
      chromeMode,
      setChromeMode,
    }),
    [
      handshake,
      client,
      onboardingComplete,
      markOnboardingComplete,
      chromeMode,
    ],
  );

  return (
    <OrchestratorCtx.Provider value={value}>{children}</OrchestratorCtx.Provider>
  );
}

export function useOrchestrator(): OrchestratorContextValue {
  const v = useContext(OrchestratorCtx);
  if (!v) {
    throw new Error("useOrchestrator must be used within OrchestratorProvider");
  }
  return v;
}
