"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppLayout } from "@/components/common/AppLayout";

/**
 * Web-mode layout wrapper.
 *
 * The login page is rendered full-screen (no sidebar, no app chrome).
 * All other pages get the standard AppLayout with sidebar navigation.
 */
export function WebLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") {
    return <>{children}</>;
  }
  return <AppLayout>{children}</AppLayout>;
}
