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
  Trash,
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
  const [historyCollapsed, setHistoryCollapsed] = useState(false);

  const loadHistory = () => {
    try {
      const raw = localStorage.getItem("mayra.chat.history");
      if (raw) {
        const items = JSON.parse(raw) as HistoryItem[];
        items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
        setHistory(items);
      } else {
        setHistory([]);
      }
    } catch (e) {
      console.error("Failed to load chat history:", e);
    }
  };

  const deleteChat = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const raw = localStorage.getItem("mayra.chat.history");
      if (raw) {
        const items = JSON.parse(raw) as HistoryItem[];
        const filtered = items.filter((item) => item.id !== id);
        localStorage.setItem("mayra.chat.history", JSON.stringify(filtered));
      }
      localStorage.removeItem(`mayra.chat.task.${id}`);
      loadHistory();
    } catch (err) {
      console.error("Failed to delete chat:", err);
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
            <button
              type="button"
              onClick={() => setHistoryCollapsed((v) => !v)}
              className="caret-hover-show sidebar-history-toggle"
              aria-label={historyCollapsed ? "Expand recent chats" : "Collapse recent chats"}
              aria-expanded={!historyCollapsed}
              title={historyCollapsed ? "Expand recent chats" : "Collapse recent chats"}
            >
              <CaretDown
                size={14}
                style={{
                  cursor: "pointer",
                  transition: "transform 0.15s ease",
                  transform: historyCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                }}
              />
            </button>
          </div>
        </div>

        {!historyCollapsed && (history.length === 0 ? (
          <div style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "var(--accent-muted)" }}>
            No recent chats
          </div>
        ) : (
          history.map((item) => {
            const isActive = activeTaskId === item.id;
            return (
              <div
                key={item.id}
                className={`sidebar-history-item ${isActive ? "active" : ""}`}
              >
                <Link
                  href={`/?t=${item.id}`}
                  className="sidebar-history-item-link"
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
                <button
                  type="button"
                  className="sidebar-history-item-delete"
                  onClick={(e) => deleteChat(item.id, e)}
                  title="Delete chat"
                  aria-label="Delete chat"
                >
                  <Trash size={14} />
                </button>
              </div>
            );
          })
        ))}
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
