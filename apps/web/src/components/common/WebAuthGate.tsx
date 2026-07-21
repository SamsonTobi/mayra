"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useCloudAuth } from "@/providers/cloud-auth-context";
import { isWebMode } from "@/lib/mode";

/**
 * Client-side auth gate for web-deployed mode.
 *
 * In web mode, redirects to /login if not authenticated.
 * In desktop mode, renders children unconditionally (no auth gate).
 *
 * With static export (`output: "export"`), there are no server-side
 * redirects — this is a client-only check. The orchestrator is the
 * real security boundary; this gate just improves UX.
 */
export function WebAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { authenticated } = useCloudAuth();

  useEffect(() => {
    if (!isWebMode()) return;
    // Allow the login page itself
    if (pathname === "/login") return;
    if (!authenticated) {
      router.replace("/login" as never);
    }
  }, [isWebMode(), authenticated, pathname, router]);

  // In desktop mode, always render
  if (!isWebMode()) return <>{children}</>;

  // In web mode, always render the login page (even before mount/auth check)
  if (pathname === "/login") return <>{children}</>;

  // In web mode, gate other pages until we know auth state.
  // authenticated is false until CloudAuthProvider mounts + reads localStorage,
  // so we must return null to avoid flashing protected content.
  if (!authenticated) return null;

  return <>{children}</>;
}
