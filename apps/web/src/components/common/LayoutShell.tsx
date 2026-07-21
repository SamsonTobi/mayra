"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { AppLayout } from "@/components/common/AppLayout";

/**
 * Conditional layout shell — renders AppLayout (sidebar + main content)
 * for all pages except /login, which is full-screen.
 *
 * This is a client component because usePathname() is a client hook.
 * The Suspense boundary is in the root layout, so this renders after
 * the initial hydration.
 */
export function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Login page: full-screen, no sidebar
  if (pathname === "/login") return <>{children}</>;
  // All other pages: sidebar + main content
  return <AppLayout>{children}</AppLayout>;
}
