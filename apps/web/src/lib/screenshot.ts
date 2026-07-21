/**
 * Screenshot URL resolver — centralizes the logic for converting a screenshot
 * path to a displayable URL.
 *
 * - Cloud mode: the orchestrator returns a `screenshot_url` (HTTP URL).
 *   We use it directly — no Tauri asset protocol needed.
 * - Local mode: the orchestrator returns a filesystem `screenshot_path`.
 *   We resolve it via Tauri's `asset_url` command + `convertFileSrc`.
 */

import { getTauriBridge } from "@/lib/tauri";

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
  // Cloud mode: HTTP URL takes precedence
  if (url) return url;

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
