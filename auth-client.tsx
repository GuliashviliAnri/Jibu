"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export const SESSION_KEY = "jibu.supabase.session";
export const VIP_BROKER_DAYS = 30;
// Closed beta: every authenticated JIBU account receives Broker/Excel access.
// Set to false when paid subscriptions are enabled for production.
export const FREE_BETA_BROKER_ACCESS = true;

export type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; phone?: string };
};

export type BrokerAccessStatus = {
  active: boolean;
  expiresAt: string | null;
  source?: string | null;
};

export function currentAccessToken() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null")
      ?.access_token || "";
  } catch {
    return "";
  }
}

export function loginPath(next = "/real-estate/cabinet") {
  return `/account?next=${encodeURIComponent(next)}`;
}

export function navigateApp(path: string, replace = false) {
  window.dispatchEvent(
    new CustomEvent("jibu:navigate", { detail: { path, replace } }),
  );
}

export function safeNext(value: string | null) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\r\n]/.test(value)
  )
    return null;
  return value;
}

export function authChanged() {
  window.dispatchEvent(new Event("jibu:auth"));
}

type AuthCallback = {
  handled: boolean;
  error: string | null;
  type: string | null;
};

export function consumeAuthCallback(): AuthCallback {
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  const error = hash.get("error_description") || hash.get("error");
  if (!accessToken && !error)
    return { handled: false, error: null, type: null };

  const type = hash.get("type");
  history.replaceState({}, "", location.pathname + location.search);
  if (error) return { handled: true, error, type };

  const expiresIn = Number(hash.get("expires_in") || 3600);
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      access_token: accessToken,
      refresh_token: hash.get("refresh_token") || undefined,
      token_type: hash.get("token_type") || "bearer",
      expires_in: expiresIn,
      expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    }),
  );
  return { handled: true, error: null, type };
}

export async function verifiedUser(): Promise<AuthUser | null> {
  let session;
  try {
    session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
  if (!session?.access_token) return null;

  try {
    const response = await fetch("/api/session", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    if (
      JSON.parse(localStorage.getItem(SESSION_KEY) || "null")?.access_token !==
      session.access_token
    )
      return null;

    if (!response.ok) {
      if (response.status === 401 && session.refresh_token) {
        const refreshed = await fetch("/api/session/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: session.refresh_token }),
        });
        if (refreshed.ok) {
          const next = await refreshed.json();
          localStorage.setItem(SESSION_KEY, JSON.stringify(next));
          const retry = await fetch("/api/session", {
            headers: { Authorization: `Bearer ${next.access_token}` },
            cache: "no-store",
          });
          if (retry.ok) return (await retry.json()).user || null;
        }
      }
      if (response.status === 401) {
        localStorage.removeItem(SESSION_KEY);
        authChanged();
      }
      return null;
    }
    return (await response.json()).user || null;
  } catch {
    return null;
  }
}

export async function requireUser(next = location.pathname + location.search) {
  const user = await verifiedUser();
  if (!user) navigateApp(loginPath(next));
  return user;
}

function legacyBrokerAccess(userId: string) {
  const key = `jibu-vip-broker:${userId}`;
  const value = localStorage.getItem(key);
  if (!value) return false;
  if (value === "active") return true;
  const expires = Number(value);
  return Number.isFinite(expires) && expires > Date.now();
}

async function requestBrokerAccess(
  method: "GET" | "POST",
  action?: "trial" | "purchase",
): Promise<BrokerAccessStatus> {
  const token = currentAccessToken();
  if (!token) return { active: false, expiresAt: null };
  const response = await fetch("/api/broker/subscription", {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
    body: method === "POST" ? JSON.stringify({ action }) : undefined,
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(result?.error || "VIP Broker სტატუსი ვერ ჩაიტვირთა.");
  return {
    active: Boolean(result?.active),
    expiresAt: result?.expiresAt || null,
    source: result?.source || null,
  };
}

export async function brokerAccessStatus(
  userId?: string,
): Promise<BrokerAccessStatus> {
  if (FREE_BETA_BROKER_ACCESS && userId && currentAccessToken())
    return { active: true, expiresAt: null, source: "beta" };

  let status = await requestBrokerAccess("GET");
  if (!userId || status.active || !legacyBrokerAccess(userId)) return status;

  // Older builds kept access on one device only. Move that entitlement to
  // the authenticated account once, then stop using local state as authority.
  try {
    status = await requestBrokerAccess("POST", "trial");
  } catch {
    status = await requestBrokerAccess("GET");
  }
  if (status.active) localStorage.removeItem(`jibu-vip-broker:${userId}`);
  return status;
}

export async function activateBrokerAccess(
  action: "trial" | "purchase" = "trial",
) {
  const status = await requestBrokerAccess("POST", action);
  window.dispatchEvent(new Event("jibu:subscription"));
  return status;
}

const Context = createContext<{ user: AuthUser | null; loading: boolean }>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    user: AuthUser | null;
    loading: boolean;
  }>({ user: null, loading: true });

  useEffect(() => {
    let disposed = false;
    let revision = 0;
    const callback = consumeAuthCallback();
    const sync = async () => {
      const current = ++revision;
      setState({ user: null, loading: true });
      const user = await verifiedUser();
      if (!disposed && current === revision) {
        setState({ user, loading: false });
        if (user) {
          try {
            const saved = JSON.parse(
              localStorage.getItem(SESSION_KEY) || "null",
            );
            if (saved)
              localStorage.setItem(
                SESSION_KEY,
                JSON.stringify({ ...saved, user }),
              );
          } catch {}
        }
        if (callback.handled && callback.error) {
          const target = `/account?auth_error=${encodeURIComponent(callback.error)}`;
          if (location.pathname + location.search !== target)
            location.replace(target);
        } else if (
          callback.handled &&
          user &&
          callback.type !== "recovery"
        ) {
          const target =
            safeNext(new URLSearchParams(location.search).get("next")) || "/";
          if (location.pathname + location.search !== target)
            location.replace(target);
        }
      }
    };
    void sync();
    const storage = (event: StorageEvent) => {
      if (event.key === SESSION_KEY || event.key === null) void sync();
    };
    window.addEventListener("storage", storage);
    window.addEventListener("jibu:auth", sync);
    return () => {
      disposed = true;
      window.removeEventListener("storage", storage);
      window.removeEventListener("jibu:auth", sync);
    };
  }, []);

  return <Context.Provider value={state}>{children}</Context.Provider>;
}

export const useAuth = () => useContext(Context);

export function useBrokerAccess() {
  const { user } = useAuth();
  return Boolean(user);
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && !user)
      navigateApp(loginPath(location.pathname + location.search), true);
  }, [user, loading]);
  return user ? children : null;
}
