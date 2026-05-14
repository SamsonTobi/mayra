import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client (publishable key only — spec §3.3, PRD §4).
 * Returns null when env is not configured (local web dev without cloud).
 */
export function createSupabaseBrowser(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Anonymous session + optional `device_id` in JWT user_metadata (F2, spec §8).
 */
export async function ensureAnonymousSession(
  client: SupabaseClient,
  deviceId: string | null,
): Promise<void> {
  const { data } = await client.auth.getSession();
  if (data.session) {
    if (deviceId) {
      await client.auth.updateUser({ data: { device_id: deviceId } });
    }
    return;
  }
  const { error } = await client.auth.signInAnonymously();
  if (error) throw error;
  if (deviceId) {
    await client.auth.updateUser({ data: { device_id: deviceId } });
  }
}
