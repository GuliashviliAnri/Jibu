"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const SESSION_KEY = "jibu.supabase.session";
export function currentAccessToken(){
  try{return JSON.parse(localStorage.getItem(SESSION_KEY)||"null")?.access_token||""}catch{return ""}
}
export const VIP_BROKER_DAYS = 30;
export function brokerAccessExpiry(userId:string){
  const key=`jibu-vip-broker:${userId}`;const value=localStorage.getItem(key);
  if(value==="active"){const migrated=Date.now()+VIP_BROKER_DAYS*86400000;localStorage.setItem(key,String(migrated));return migrated}
  const expires=Number(value);if(!Number.isFinite(expires)||expires<=Date.now()){if(value)localStorage.removeItem(key);return 0}return expires;
}
export function activateBrokerAccess(userId:string){const expires=Date.now()+VIP_BROKER_DAYS*86400000;localStorage.setItem(`jibu-vip-broker:${userId}`,String(expires));return expires}
export type AuthUser = { id: string; email?: string; user_metadata?: { full_name?: string; phone?: string } };
export function loginPath(next = "/real-estate/cabinet") {
  return `/account?next=${encodeURIComponent(next)}`;
}
export function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return null;
  return value;
}
export function authChanged() { window.dispatchEvent(new Event("jibu:auth")); }
export async function verifiedUser(): Promise<AuthUser | null> {
  let session;
  try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
  if (!session?.access_token) return null;
  try {
    const response = await fetch("/api/session", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
    // A logout or account switch during this request invalidates its response.
    if (JSON.parse(localStorage.getItem(SESSION_KEY) || "null")?.access_token !== session.access_token) return null;
    if (!response.ok) {
      if(response.status===401&&session.refresh_token){const refreshed=await fetch("/api/session/refresh",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({refresh_token:session.refresh_token})});if(refreshed.ok){const next=await refreshed.json();localStorage.setItem(SESSION_KEY,JSON.stringify(next));const retry=await fetch("/api/session",{headers:{Authorization:`Bearer ${next.access_token}`},cache:"no-store"});if(retry.ok)return(await retry.json()).user||null}}
      if (response.status === 401) { localStorage.removeItem(SESSION_KEY); authChanged(); }
      return null;
    }
    return (await response.json()).user || null;
  } catch { return null; }
}
export async function requireUser(next = location.pathname + location.search) {
  const user = await verifiedUser();
  if (!user) location.assign(loginPath(next));
  return user;
}
const Context = createContext<{ user: AuthUser | null; loading: boolean }>({ user: null, loading: true });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ user: AuthUser | null; loading: boolean }>({ user: null, loading: true });
  useEffect(() => {
    let disposed = false, revision = 0;
    const sync = async () => {
      const current = ++revision;
      setState({ user: null, loading: true });
      const user = await verifiedUser();
      if (!disposed && current === revision) setState({ user, loading: false });
    };
    void sync();
    const storage = (event: StorageEvent) => { if (event.key === SESSION_KEY || event.key === null) void sync(); };
    window.addEventListener("storage", storage);
    window.addEventListener("jibu:auth", sync);
    return () => { disposed = true; window.removeEventListener("storage", storage); window.removeEventListener("jibu:auth", sync); };
  }, []);
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export const useAuth = () => useContext(Context);
export function useBrokerAccess() {
  const { user } = useAuth();
  const [owner, setOwner] = useState<string | null>(null);
  useEffect(() => {
    let timer:ReturnType<typeof setTimeout>|undefined;
    const sync = () => {if(timer)clearTimeout(timer);const expires=user?brokerAccessExpiry(user.id):0;setOwner(user&&expires>Date.now()?user.id:null);if(expires>Date.now())timer=setTimeout(sync,Math.min(expires-Date.now()+50,2147483647))};
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("jibu:subscription", sync);
    return () => { if(timer)clearTimeout(timer);window.removeEventListener("storage", sync); window.removeEventListener("jibu:subscription", sync); };
  }, [user?.id]);
  return !!user && owner === user.id;
}
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  useEffect(() => { if (!loading && !user) location.replace(loginPath(location.pathname + location.search)); }, [user, loading]);
  return user ? children : <main className="form-card" role="status">{loading ? "ანგარიშის შემოწმება…" : "გასაგრძელებლად შედი ანგარიშში."}</main>;
}
