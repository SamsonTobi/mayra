"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useCloudAuth } from "@/providers/cloud-auth-context";
import { isWebMode } from "@/lib/mode";

/**
 * Client-side auth gate for web-deployed mode.
 *
 * - Pages wrapped with <AuthGate loginPage> are always rendered (the login page).
 * - All other pages: show a loading state until auth is resolved, then
 *   either render children (authenticated) or redirect to /login.
 * - In desktop mode: no gating at all.
 */
export function WebAuthGate({
  children,
  loginPage = false,
}: {
  children: ReactNode;
  loginPage?: boolean;
}) {
  const router = useRouter();
  const { authenticated } = useCloudAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isWebMode()) return;
    if (loginPage) return;
    if (!authenticated) {
      router.replace("/login" as never);
    }
  }, [isWebMode(), authenticated, loginPage, router]);

  // Desktop mode: no gate
  if (!isWebMode()) return <>{children}</>;

  // Login page: always render
  if (loginPage) return <>{children}</>;

  // Web mode, non-login pages:
  // Before mount: show a minimal loader (prevents flash of content)
  if (!mounted) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "var(--bg, #0a0a0a)",
          color: "var(--fg-muted, #888)",
          fontSize: "0.9rem",
        }}
      >
        Loading…
      </div>
    );
  }

  // After mount: if not authenticated, show nothing (redirect is in flight)
  if (!authenticated) return null;

  return <>{children}</>;
}
