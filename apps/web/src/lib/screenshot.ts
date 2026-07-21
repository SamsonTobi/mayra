/**
 * Screenshot URL resolver — centralizes the logic for converting a screenshot
 * path to a displayable URL.
 *
 * - Cloud mode: the orchestrator returns a `screenshot_url` (HTTP URL).
 *   We fetch it with the auth token (the route requires Bearer auth) and
 *   create a blob URL for the <img src>.
 * - Local mode: the orchestrator returns a filesystem `screenshot_path`.
 *   We resolve it via Tauri's `asset_url` command + `convertFileSrc`.
 */

import { getTauriBridge } from "@/lib/tauri";

const CLOUD_TOKEN_KEY = "mayra.cloud.token";

function getCloudToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CLOUD_TOKEN_KEY);
}

// Cache blob URLs so we don't re-fetch the same screenshot
const blobUrlCache = new Map<string, string>();

/**
 * Resolve a screenshot path (and optional HTTP URL) to a displayable src.
 *
 * @param path - The filesystem path from the orchestrator (always provided).
 * @param url - The HTTP URL from the orchestrator (cloud mode only).
 * @returns A URL string suitable for `<img src>`, or null if unresolvable.
 */
export async function resolveScreenshotSrc(
  path: string,
  url?: string | null,
): Promise<string | null> {
  // Cloud mode: HTTP URL — fetch with auth token, return blob URL
  if (url) {
    // Check cache first
    const cached = blobUrlCache.get(url);
    if (cached) return cached;

    const token = getCloudToken();
    if (!token) return null;

    try {
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return null;
      const blob = await r.blob();
      const blobUrl = URL.createObjectURL(blob);
      blobUrlCache.set(url, blobUrl);
      return blobUrl;
    } catch {
      return null;
    }
  }

  // Local mode: Tauri asset protocol
  if (!getTauriBridge().isTauri) {
    // Non-Tauri without a URL — can't resolve
    return null;
  }

  try {
    const mod = await import("@tauri-apps/api/core");
    let pathForSrc = path;
    try {
      pathForSrc = await mod.invoke<string>("asset_url", { path });
    } catch {
      /* path may already be asset-safe */
    }
    return mod.convertFileSrc(pathForSrc);
  } catch {
    return null;
  }
}
