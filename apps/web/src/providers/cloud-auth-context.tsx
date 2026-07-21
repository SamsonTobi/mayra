"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const TOKEN_KEY = "mayra.cloud.token";
const USER_ID_KEY = "mayra.cloud.userId";
const EXPIRES_KEY = "mayra.cloud.expiresAt";

export type CloudAuthState = {
  authenticated: boolean;
  token: string | null;
  userId: string | null;
  login: (password: string) => Promise<void>;
  logout: () => void;
  /** True while validating the stored token against the orchestrator */
  validating: boolean;
};

const CloudAuthCtx = createContext<CloudAuthState | null>(null);

function getCloudUrl(): string | null {
  return process.env.NEXT_PUBLIC_CLOUD_ORCHESTRATOR_URL ?? null;
}

function readStoredToken(): { token: string; userId: string; expiresAt: string } | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  const userId = localStorage.getItem(USER_ID_KEY);
  const expiresAt = localStorage.getItem(EXPIRES_KEY);
  if (!token || !userId || !expiresAt) return null;
  // Check expiry
  const expiry = new Date(expiresAt).getTime();
  if (isNaN(expiry) || Date.now() > expiry) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(EXPIRES_KEY);
    return null;
  }
  return { token, userId, expiresAt };
}

/**
 * Validate a token against the orchestrator by calling /healthz with the token.
 * Returns true if the orchestrator accepts the token, false otherwise.
 * Also serves as a warm-up call — the container starts booting when this fires.
 */
async function validateToken(cloudUrl: string, token: string): Promise<boolean> {
  try {
    const r = await fetch(`${cloudUrl}/v1/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30_000), // 30s — cold start can take 15s
    });
    return r.ok;
  } catch {
    // Network error (cold start timeout) — assume token is still valid,
    // the container just needs more time. Don't log the user out.
    return true;
  }
}

export function CloudAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [validating, setValidating] = useState(false);

  // Load stored token on mount + validate it + warm up the orchestrator
  useEffect(() => {
    const stored = readStoredToken();
    if (stored) {
      setToken(stored.token);
      setUserId(stored.userId);

      // Validate the token against the orchestrator.
      // This also warms up the container (triggers cold start if scaled to zero).
      const cloudUrl = getCloudUrl();
      if (cloudUrl) {
        setValidating(true);
        validateToken(cloudUrl, stored.token).then((valid) => {
          setValidating(false);
          if (!valid) {
            // Token is invalid (expired on server, container restarted, etc.)
            // Clear it — user will need to log in again
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_ID_KEY);
            localStorage.removeItem(EXPIRES_KEY);
            setToken(null);
            setUserId(null);
          }
        });
      } else {
        setMounted(true);
      }
    }
    setMounted(true);
  }, []);

  // Also warm up the orchestrator on login page mount (even without a token)
  // so the container is ready by the time the user submits the password.
  useEffect(() => {
    const cloudUrl = getCloudUrl();
    if (!cloudUrl || token) return; // skip if already have a token
    // Fire-and-forget healthz call to warm up the container
    fetch(`${cloudUrl}/healthz`, { signal: AbortSignal.timeout(30_000) }).catch(
      () => {},
    );
  }, [token]);

  const login = useCallback(async (password: string) => {
    const cloudUrl = getCloudUrl();
    if (!cloudUrl) {
      throw new Error("Cloud orchestrator URL not configured.");
    }
    const r = await fetch(`${cloudUrl}/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!r.ok) {
      const body = await r.text();
      let msg = `Login failed: ${r.status}`;
      try {
        const j = JSON.parse(body) as { detail?: string };
        if (j.detail) msg = j.detail;
      } catch {
        /* use default */
      }
      throw new Error(msg);
    }
    const body = (await r.json()) as {
      token: string;
      user_id: string;
      expires_at: string;
    };
    localStorage.setItem(TOKEN_KEY, body.token);
    localStorage.setItem(USER_ID_KEY, body.user_id);
    localStorage.setItem(EXPIRES_KEY, body.expires_at);
    setToken(body.token);
    setUserId(body.user_id);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(EXPIRES_KEY);
    setToken(null);
    setUserId(null);
  }, []);

  const value: CloudAuthState = {
    authenticated: mounted && token !== null,
    token,
    userId,
    login,
    logout,
    validating,
  };

  return (
    <CloudAuthCtx.Provider value={value}>{children}</CloudAuthCtx.Provider>
  );
}

export function useCloudAuth(): CloudAuthState {
  const v = useContext(CloudAuthCtx);
  if (!v) {
    throw new Error("useCloudAuth must be used within CloudAuthProvider");
  }
  return v;
}
