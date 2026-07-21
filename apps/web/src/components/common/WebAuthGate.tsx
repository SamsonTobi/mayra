"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useCloudAuth } from "@/providers/cloud-auth-context";
import { isWebMode } from "@/lib/mode";

/**
 * Client-side auth gate for web-deployed mode.
 *
 * In web mode, redirects to /login if not authenticated.
 * In desktop mode, renders children unconditionally (no auth gate).
 *
 * During SSR/static build, always renders children so the HTML has content
 * (the actual gating happens client-side after hydration via useEffect).
 * With static export (`output: "export"`), there are no server-side
 * redirects — the orchestrator is the real security boundary.
 */
export function WebAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { authenticated } = useCloudAuth();
  // Only gate after mount — during SSR/build, always show children
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isWebMode()) return;
    if (pathname === "/login") return;
    if (!authenticated) {
      router.replace("/login" as never);
    }
  }, [isWebMode(), authenticated, pathname, router]);

  // During SSR/build (before mount), always render children
  if (!mounted) return <>{children}</>;

  // After mount:
  if (!isWebMode()) return <>{children}</>;
  if (pathname === "/login") return <>{children}</>;
  if (!authenticated) return null;

  return <>{children}</>;
}
