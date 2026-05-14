"use client";

import { useEffect } from "react";
import {
  createSupabaseBrowser,
  ensureAnonymousSession,
} from "@/lib/supabase-browser";

/**
 * Fire-and-forget anonymous auth when Supabase env is present (checklist T9 Supabase rows).
 */
export function SupabaseBootstrap() {
  useEffect(() => {
    const client = createSupabaseBrowser();
    if (!client) return;
    void ensureAnonymousSession(client, null).catch(() => {
      /* non-fatal in dev when project URL/key missing or network blocked */
    });
  }, []);
  return null;
}
