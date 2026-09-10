"use client";

import { loginPath, navigateApp, useAuth } from "../../auth-client";

export default function VipBrokerActivation() {
  const { user } = useAuth();
  if (user)
    return (
      <div className="vip-active-state">
        <b>JIBU Beta წვდომა აქტიურია</b>
        <a href="/real-estate">ქონების გვერდზე დაბრუნება</a>
      </div>
    );

  return (
    <div className="vip-activate">
      <button
        onClick={() => navigateApp(loginPath("/real-estate/vip-broker"))}
      >
        შესვლა და უფასოდ გამოყენება
      </button>
      <small>ბეტა პერიოდში ყველა რეგისტრირებული მომხმარებლისთვის უფასოა</small>
    </div>
  );
}
