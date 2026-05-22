"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { OrchestratorClient } from "@/lib/orchestrator-client";
import type { SidecarHandshake } from "@/lib/tauri";
import { getTauriBridge } from "@/lib/tauri";
import { useSidecarReady } from "@/hooks/useSidecarReady";

const STORAGE_KEY = "mayra.onboarding.v1";

export type OrchestratorContextValue = {
  handshake: SidecarHandshake | null;
  port: number | null;
  token: string | null;
  client: OrchestratorClient | null;
  sidecarStatus: "starting" | "ready" | "error";
  sidecarError: string | null;
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
  const eventHandshake = useSidecarReady();
  const [startedHandshake, setStartedHandshake] =
    useState<SidecarHandshake | null>(null);
  const handshake = eventHandshake ?? startedHandshake;
  const [sidecarStatus, setSidecarStatus] = useState<
    "starting" | "ready" | "error"
  >("starting");
  const [sidecarError, setSidecarError] = useState<string | null>(null);
  const [onboardingComplete, setOnboardingComplete] =
    useState(readOnboardingFlag);
  const [chromeMode, setChromeMode] = useState<"managed" | "remote" | null>(
    null,
  );

  useEffect(() => {
    // Automatically start the sidecar when the app boots
    const bridge = getTauriBridge();
    if (handshake) {
      setSidecarStatus("ready");
      setSidecarError(null);
      return;
    }
    if (bridge.isTauri) {
      setSidecarStatus("starting");
      import("@tauri-apps/api/core").then(({ invoke }) => {
        invoke<SidecarHandshake>("start_sidecar")
          .then((payload) => {
            setStartedHandshake(payload);
            setSidecarStatus("ready");
            setSidecarError(null);
          })
          .catch((e) => {
            if (String(e).includes("already running")) return;
            setSidecarStatus("error");
            setSidecarError(e instanceof Error ? e.message : String(e));
            console.error("Failed to start sidecar:", e);
          });
      });
    } else {
      setSidecarStatus("error");
      setSidecarError(
        "Open Mayra in the desktop shell to start the orchestrator.",
      );
    }
  }, [handshake]);

  const client = useMemo(() => {
    if (!handshake || handshake.port === 0) return null;
    if (!handshake.token) return null;
    return new OrchestratorClient(handshake.port, handshake.token);
  }, [handshake]);

  const markOnboardingComplete = useCallback(() => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ok: true, ts: Date.now() }),
    );
    setOnboardingComplete(true);
  }, []);

  const value = useMemo(
    () => ({
      handshake,
      port: handshake?.port ?? null,
      token: handshake?.token ?? null,
      client,
      sidecarStatus,
      sidecarError,
      onboardingComplete,
      markOnboardingComplete,
      chromeMode,
      setChromeMode,
    }),
    [
      handshake,
      client,
      sidecarStatus,
      sidecarError,
      onboardingComplete,
      markOnboardingComplete,
      chromeMode,
    ],
  );

  return (
    <OrchestratorCtx.Provider value={value}>
      {children}
    </OrchestratorCtx.Provider>
  );
}

export function useOrchestrator(): OrchestratorContextValue {
  const v = useContext(OrchestratorCtx);
  if (!v) {
    throw new Error("useOrchestrator must be used within OrchestratorProvider");
  }
  return v;
}
