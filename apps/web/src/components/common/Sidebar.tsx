"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChatCircleText,
  Gear,
  ClockCounterClockwise,
  CaretLeft,
  MagnifyingGlass,
  CaretDown,
} from "@phosphor-icons/react";

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

type HistoryItem = {
  id: string;
  goal: string;
  ts: string;
};

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTaskId = searchParams.get("t");
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const loadHistory = () => {
    try {
      const raw = localStorage.getItem("mayra.chat.history");
      if (raw) {
        const items = JSON.parse(raw) as HistoryItem[];
        items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
        setHistory(items);
      }
    } catch (e) {
      console.error("Failed to load chat history:", e);
    }
  };

  useEffect(() => {
    loadHistory();

    const handleHistoryUpdate = () => {
      loadHistory();
    };

    window.addEventListener("mayra-history-updated", handleHistoryUpdate);
    return () => {
      window.removeEventListener("mayra-history-updated", handleHistoryUpdate);
    };
  }, []);

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <span className="sidebar-logo">
          <ChatCircleText size={22} weight="fill" />
          Mayra
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="btn"
          style={{ padding: "0.3rem", borderRadius: "8px", background: "transparent", border: "none" }}
          title="Minimize sidebar"
        >
          <CaretLeft size={18} />
        </button>
      </div>

      {/* New Chat Nav Link (Top) */}
      <nav className="sidebar-nav" style={{ paddingBottom: "0.5rem" }}>
        <Link
          href="/"
          className={`sidebar-nav-link ${pathname === "/" && !activeTaskId ? "active" : ""}`}
        >
          <ChatCircleText size={20} />
          New Chat
        </Link>
      </nav>

      {/* Recent Chats (Middle) */}
      <div className="sidebar-history-section">
        <div
          className="sidebar-history-title"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <span>Recent chats</span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--accent-muted)" }}>
            <MagnifyingGlass size={14} style={{ cursor: "pointer" }} />
            <CaretDown size={14} className="caret-hover-show" style={{ cursor: "pointer" }} />
          </div>
        </div>
        
        {history.length === 0 ? (
          <div style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "var(--accent-muted)" }}>
            No recent chats
          </div>
        ) : (
          history.map((item) => {
            const isActive = activeTaskId === item.id;
            return (
              <Link
                key={item.id}
                href={`/?t=${item.id}`}
                className={`sidebar-history-item ${isActive ? "active" : ""}`}
                style={{ textDecoration: "none" }}
              >
                <span className="sidebar-history-item-goal">{item.goal}</span>
                <span className="sidebar-history-item-date">
                  {new Date(item.ts).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </Link>
            );
          })
        )}
      </div>

      {/* Bottom Area (Nav links + Profile) */}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column" }}>
        {/* Navigation Links (Bottom) */}
        <nav className="sidebar-nav" style={{ paddingBottom: "0.5rem" }}>
          <Link
            href="/settings"
            className={`sidebar-nav-link ${pathname === "/settings" ? "active" : ""}`}
          >
            <Gear size={20} />
            Settings
          </Link>
          <Link
            href="/logs"
            className={`sidebar-nav-link ${pathname === "/logs" ? "active" : ""}`}
          >
            <ClockCounterClockwise size={20} />
            Logs
          </Link>
        </nav>

        {/* User Profile */}
        <div className="sidebar-profile">
          <div className="profile-avatar" />
          <div className="profile-details">
            <span className="profile-name">Guest Operator</span>
            <span className="profile-role">Local Developer</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
