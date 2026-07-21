/**
 * Mode helpers — determines whether the UI is running in desktop (Tauri)
 * or web-deployed mode, and provides the cloud orchestrator URL.
 *
 * In desktop mode, the UI can talk to both a local sidecar (Tauri handshake)
 * and a cloud orchestrator (Phase 3 toggle). In web mode, only the cloud
 * orchestrator is available.
 */

export function isWebMode(): boolean {
  return process.env.NEXT_PUBLIC_MAYRA_MODE === "web";
}

export function isDesktopMode(): boolean {
  return !isWebMode();
}

export function getCloudOrchestratorUrl(): string | null {
  return process.env.NEXT_PUBLIC_CLOUD_ORCHESTRATOR_URL ?? null;
}
