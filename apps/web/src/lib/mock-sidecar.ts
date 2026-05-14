import type { SidecarHandshake } from "./tauri";

const READY = "orchestrator-ready" as const;

/**
 * Dispatch a synthetic sidecar-ready event (tests + dev without Tauri).
 */
export function emitMockOrchestratorReady(detail: SidecarHandshake): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(READY, { detail }));
}
