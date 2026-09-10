"use client";

import { useEffect, useState } from "react";
import {
  activateBrokerAccess,
  brokerAccessStatus,
  requireUser,
  useAuth,
} from "../../auth-client";

export default function VipBrokerActivation() {
  const { user } = useAuth();
  const [daysLeft, setDaysLeft] = useState(0);
  const [active, setActive] = useState(false);
  const [beta, setBeta] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let disposed = false;
    if (!user) return;
    brokerAccessStatus(user.id)
      .then((status) => {
        if (disposed) return;
        const expiry = status.expiresAt
          ? new Date(status.expiresAt).getTime()
          : 0;
        const betaAccess = status.source === "beta";
        setBeta(betaAccess);
        setActive(status.active && (betaAccess || expiry > Date.now()));
        setDaysLeft(
          status.active
            ? Math.max(0, Math.ceil((expiry - Date.now()) / 86400000))
            : 0,
        );
      })
      .catch((error) => {
        if (!disposed)
          setMessage(
            error instanceof Error ? error.message : "სტატუსი ვერ ჩაიტვირთა.",
          );
      })
      .finally(() => {
        if (!disposed) setChecking(false);
      });
    return () => {
      disposed = true;
    };
  }, [user]);

  const purchase = async () => {
    setBusy(true);
    setMessage("");
    const verified = await requireUser("/real-estate/vip-broker");
    if (!verified) {
      setBusy(false);
      return;
    }
    try {
      const status = await activateBrokerAccess("purchase");
      const expiry = status.expiresAt
        ? new Date(status.expiresAt).getTime()
        : 0;
      const betaAccess = status.source === "beta";
      setBeta(betaAccess);
      setActive(status.active && (betaAccess || expiry > Date.now()));
      setDaysLeft(Math.max(0, Math.ceil((expiry - Date.now()) / 86400000)));
      setMessage("VIP Broker წარმატებით გააქტიურდა ყველა მოწყობილობაზე.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "გააქტიურება ვერ შესრულდა.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (user && active)
    return (
      <div className="vip-active-state">
        <b>
          {beta
            ? "JIBU Beta წვდომა აქტიურია"
            : `VIP Broker აქტიურია · დარჩა ${daysLeft} დღე`}
        </b>
        <a href="/real-estate">ქონების გვერდზე დაბრუნება</a>
        {message && <small>{message}</small>}
      </div>
    );

  return (
    <div className="vip-activate">
      <button disabled={busy || (!!user && checking)} onClick={purchase}>
        {user && checking
          ? "სტატუსის შემოწმება…"
          : busy
            ? "გააქტიურება…"
            : "VIP Broker-ის შეძენა"}
      </button>
      <small>19.99 ₾ · წვდომა აქტიურდება 30 დღით</small>
      {message && <p className="account-message">{message}</p>}
    </div>
  );
}
