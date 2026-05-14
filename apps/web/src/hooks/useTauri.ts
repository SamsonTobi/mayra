"use client";

import { useEffect, useState } from "react";
import { getTauriBridge, type TauriBridge } from "@/lib/tauri";

/**
 * Returns `null` until client mount (spec nextjs-tauri rule — stable SSR shell).
 */
export function useTauri(): TauriBridge | null {
  const [state, setState] = useState<TauriBridge | null>(null);
  useEffect(() => {
    setState(getTauriBridge());
  }, []);
  return state;
}
