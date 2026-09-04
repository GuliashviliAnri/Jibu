"use client";
import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { SESSION_KEY, authChanged, verifiedUser, safeNext } from "../auth-client";
type Mode = "login" | "register";
type Session = {
  access_token: string;
  user: {
    email?: string;
    user_metadata?: { full_name?: string; phone?: string };
  };
};
export default function AccountClient({
  url,
  publishableKey,
}: {
  url: string;
  publishableKey: string;
}) {
  const [mode, setMode] = useState<Mode>("login"),
    [session, setSession] = useState<Session | null>(null),
    [loading, setLoading] = useState(false),
    [message, setMessage] = useState(""),
    [switching, setSwitching] = useState(false);
  useEffect(() => {
    void verifiedUser().then(user => {
      if (user) { try { const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); if(saved) setSession({...saved,user}); } catch {} }
    });
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const data = new FormData(e.currentTarget),
      email = String(data.get("email") || "").trim(),
      password = String(data.get("password") || "");
    const endpoint =
      mode === "login"
        ? "/auth/v1/token?grant_type=password"
        : "/auth/v1/signup";
    const body: Record<string, unknown> = { email, password };
    if (mode === "register")
      body.data = {
        full_name: String(data.get("name") || "").trim(),
        phone: String(data.get("phone") || "").trim(),
      };
    try {
      const res = await fetch(url + endpoint, {
          method: "POST",
          headers: {
            apikey: publishableKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }),
        result = await res.json();
      if (!res.ok)
        throw new Error(
          result.msg ||
            result.error_description ||
            result.message ||
            "მოთხოვნა ვერ შესრულდა",
        );
      if (result.access_token) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(result));
        setSession(result);
        authChanged();
        const next = safeNext(new URLSearchParams(location.search).get("next"));
        location.assign(next || "/");
      } else
        setMessage(
          "რეგისტრაცია დასრულდა. ელფოსტაზე გამოგზავნილი ბმულით დაადასტურე ანგარიში.",
        );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setLoading(false);
    }
  }
  function changeMode(next: Mode) {
    if (next === mode || switching) return;
    setSwitching(true);
    window.setTimeout(() => {
      setMode(next);
      setMessage("");
      window.setTimeout(() => setSwitching(false), 40);
    }, 170);
  }
  function logout() {
    localStorage.removeItem(SESSION_KEY);
    authChanged();
    setSession(null);
    setMessage("");
  }
  const name =
    session?.user.user_metadata?.full_name ||
    session?.user.email?.split("@")[0] ||
    "JIBU მომხმარებელი";
  return (
    <main className="new-auth-page">
      <div className="new-auth-glow" aria-hidden />
      <header className="new-auth-header">
        <a className="new-auth-brand" href="/" aria-label="JIBU მთავარი გვერდი">
          <Image
            unoptimized
            src="/assets/logo-transparent.png"
            alt="JIBU"
            width={650}
            height={300}
            priority
          />
        </a>
        <a className="new-auth-home" href="/">
          <span>←</span> მთავარი გვერდი
        </a>
      </header>
      <section className={`new-auth-card${switching ? " switching" : ""}`}>
        {session ? (
          <div className="new-auth-signed">
            <span>{name.slice(0, 2)}</span>
            <small>ანგარიში აქტიურია</small>
            <h1>{name}</h1>
            <p>{session.user.email}</p>
            <div>
              <a href="/real-estate/cabinet">ჩემი კაბინეტი</a>
              <button onClick={logout}>გასვლა</button>
            </div>
          </div>
        ) : (
          <>
            <div className="new-auth-heading">
              <span>JIBU ACCOUNT</span>
              <h1>
                {mode === "login"
                  ? "კეთილი იყოს შენი დაბრუნება"
                  : "შექმენი JIBU ანგარიში"}
              </h1>
              <p>
                {mode === "login"
                  ? "შედი ანგარიშზე და მართე ყველაფერი ერთ სივრცეში."
                  : "ერთი ანგარიში JIBU-ს ყველა შესაძლებლობისთვის."}
              </p>
            </div>
            <div
              className="new-auth-tabs"
              role="tablist"
              aria-label="ავტორიზაციის ტიპი"
            >
              <button
                className={mode === "login" ? "active" : ""}
                onClick={() => changeMode("login")}
              >
                შესვლა
              </button>
              <button
                className={mode === "register" ? "active" : ""}
                onClick={() => changeMode("register")}
              >
                რეგისტრაცია
              </button>
            </div>
            <form key={mode} onSubmit={submit}>
              {mode === "register" && (
                <div className="new-auth-row">
                  <label>
                    სახელი და გვარი
                    <input name="name" placeholder="ანრი გულიაშვილი" required />
                  </label>
                  <label>
                    ტელეფონი
                    <input
                      name="phone"
                      type="tel"
                      placeholder="+995 5XX XX XX XX"
                      required
                    />
                  </label>
                </div>
              )}
              <label>
                ელფოსტა
                <input
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                />
              </label>
              <label>
                პაროლი
                <input
                  name="password"
                  type="password"
                  minLength={6}
                  placeholder="მინიმუმ 6 სიმბოლო"
                  required
                />
              </label>
              {mode === "login" && (
                <button type="button" className="new-auth-forgot">
                  დაგავიწყდა პაროლი?
                </button>
              )}
              {message && <p className="account-message">{message}</p>}
              <button
                className="new-auth-submit"
                disabled={loading || !url || !publishableKey}
              >
                {loading
                  ? "გთხოვ მოიცადე..."
                  : mode === "login"
                    ? "შესვლა"
                    : "რეგისტრაცია"}
              </button>
            </form>
            <p className="new-auth-switch">
              {mode === "login"
                ? "ჯერ არ გაქვს ანგარიში? "
                : "უკვე გაქვს ანგარიში? "}
              <button
                onClick={() =>
                  changeMode(mode === "login" ? "register" : "login")
                }
              >
                {mode === "login" ? "რეგისტრაცია" : "შესვლა"}
              </button>
            </p>
          </>
        )}
      </section>
      <p className="new-auth-note">ერთი ანგარიში · მთელი JIBU</p>
    </main>
  );
}
