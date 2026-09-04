"use client";

import { useEffect, useState } from "react";

export default function SidebarToggle() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("jibu-sidebar-collapsed") === "true";
    setCollapsed(saved);
    document.documentElement.classList.toggle("sidebar-collapsed", saved);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.documentElement.classList.toggle("sidebar-collapsed", next);
    window.localStorage.setItem("jibu-sidebar-collapsed", String(next));
  }

  return (
    <button className="sidebar-toggle" onClick={toggle} aria-label={collapsed ? "Sidebar-ის გახსნა" : "Sidebar-ის დახურვა"} aria-pressed={collapsed}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16" />
        <path d={collapsed ? "m13 9 3 3-3 3" : "m16 9-3 3 3 3"} />
      </svg>
    </button>
  );
}
