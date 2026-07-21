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
import { useCloudAuth } from "@/providers/cloud-auth-context";
import { isWebMode, getCloudOrchestratorUrl } from "@/lib/mode";

const STORAGE_KEY = "mayra.onboarding.v1";

export type OrchestratorContextValue = {
  handshake: SidecarHandshake | null;
  port: number | null;
  baseUrl: string | null;
  token: string | null;
  client: OrchestratorClient | null;
  // Cloud orchestrator client (for desktop cloud toggle; in web mode, same as `client`)
  cloudBaseUrl: string | null;
  cloudToken: string | null;
  cloudClient: OrchestratorClient | null;
  cloudAvailable: boolean;
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

  // Cloud auth — used in web mode and for the desktop cloud toggle
  const cloudAuth = useCloudAuth();
  const cloudUrl = getCloudOrchestratorUrl();
  const webMode = isWebMode();

  useEffect(() => {
    // In web mode, skip sidecar startup entirely
    if (webMode) {
      setSidecarStatus("ready");
      setSidecarError(null);
      return;
    }

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
  }, [handshake, webMode]);

  // Web mode: construct client from cloud URL + cloud auth token
  // Desktop mode: construct client from local sidecar handshake
  const baseUrl = useMemo(() => {
    if (webMode) {
      return cloudAuth.token && cloudUrl ? cloudUrl : null;
    }
    return handshake && handshake.port !== 0
      ? `http://127.0.0.1:${handshake.port}`
      : null;
  }, [webMode, cloudAuth.token, cloudUrl, handshake]);

  const token = useMemo(() => {
    if (webMode) return cloudAuth.token;
    return handshake?.token ?? null;
  }, [webMode, cloudAuth.token, handshake]);

  const client = useMemo(() => {
    if (!baseUrl || !token) return null;
    return new OrchestratorClient(baseUrl, token, webMode ? cloudAuth.handleUnauthorized : null);
  }, [baseUrl, token, webMode, cloudAuth.handleUnauthorized]);

  // Cloud client: in web mode this is the same as `client`; in desktop mode
  // it's a separate client targeting the cloud orchestrator (when authenticated).
  const cloudBaseUrl = useMemo(() => {
    if (webMode) return baseUrl;
    return cloudAuth.token && cloudUrl ? cloudUrl : null;
  }, [webMode, baseUrl, cloudAuth.token, cloudUrl]);

  const cloudToken = useMemo(() => {
    if (webMode) return token;
    return cloudAuth.token;
  }, [webMode, token, cloudAuth.token]);

  const cloudClient = useMemo(() => {
    if (!cloudBaseUrl || !cloudToken) return null;
    return new OrchestratorClient(cloudBaseUrl, cloudToken, cloudAuth.handleUnauthorized);
  }, [cloudBaseUrl, cloudToken, cloudAuth.handleUnauthorized]);

  // Cloud is available when: web mode (always, if URL set) or desktop mode with cloud URL + auth
  const cloudAvailable = useMemo(() => {
    return cloudClient !== null;
  }, [cloudClient]);

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
      baseUrl,
      token,
      client,
      cloudBaseUrl,
      cloudToken,
      cloudClient,
      cloudAvailable,
      sidecarStatus,
      sidecarError,
      onboardingComplete,
      markOnboardingComplete,
      chromeMode,
      setChromeMode,
    }),
    [
      handshake,
      baseUrl,
      token,
      client,
      cloudBaseUrl,
      cloudToken,
      cloudClient,
      cloudAvailable,
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
