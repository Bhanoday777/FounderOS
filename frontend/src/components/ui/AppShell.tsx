"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Command, LayoutDashboard, Archive, Users, BookOpen,
  ChevronRight, Zap, Shield, Wifi, ChevronLeft, Menu, X
} from "lucide-react";

const NAV = [
  {
    group: "Operations",
    items: [
      { href: "/",         label: "Command Center",  icon: LayoutDashboard, accent: "#4d5fff" },
      { href: "/vault",    label: "Strategy Vault",  icon: Archive,         accent: "#10b981" },
    ],
  },
  {
    group: "Intelligence",
    items: [
      { href: "/advisors", label: "Advisor Roster",  icon: Users,           accent: "#9b6dff" },
      { href: "/docs",     label: "Specifications",  icon: BookOpen,        accent: "#f59e0b" },
    ],
  },
];

function SidebarContent({ collapsed, pathname }: { collapsed: boolean; pathname: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Brand */}
      <div style={{
        padding: collapsed ? "20px 12px" : "20px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: "linear-gradient(135deg,#2a3aff,#7c3aed)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 0 20px rgba(74,95,255,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
        }}>
          <Command size={15} color="#fff" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f4f4ff", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              FounderOS
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Exec Operations
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }} role="navigation">
        {NAV.map((section) => (
          <div key={section.group} style={{ marginBottom: 24 }}>
            {!collapsed && (
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                color: "rgba(255,255,255,0.2)", padding: "0 8px 8px",
              }}>
                {section.group}
              </div>
            )}
            {section.items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-nav-item ${active ? "active" : ""}`}
                  style={{ justifyContent: collapsed ? "center" : undefined, marginBottom: 2 }}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    size={16}
                    style={{
                      color: active ? item.accent : "currentColor",
                      flexShrink: 0,
                      filter: active ? `drop-shadow(0 0 4px ${item.accent}80)` : undefined,
                    }}
                  />
                  {!collapsed && (
                    <span style={{ flex: 1, fontSize: 13 }}>{item.label}</span>
                  )}
                  {!collapsed && active && (
                    <ChevronRight size={12} style={{ color: "rgba(255,255,255,0.25)" }} />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Status footer */}
      {!collapsed && (
        <div style={{
          padding: "12px 16px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <div className="label-xs" style={{ marginBottom: 4 }}>System Status</div>
          {[
            { icon: Wifi,   label: "API Gateway",  value: "Online",  color: "#10b981" },
            { icon: Shield, label: "TLS 1.3",      value: "Active",  color: "#10b981" },
            { icon: Zap,    label: "Gemini 2.5",   value: "Live",    color: "#4d5fff" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon size={11} style={{ color: "rgba(255,255,255,0.25)" }} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{s.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span className="led led-green led-pulse" />
                  <span style={{ fontSize: 10, fontWeight: 600, color: s.color }}>{s.value}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarW = collapsed ? 60 : 220;

  const sidebarStyle: React.CSSProperties = {
    position: "fixed",
    left: 0, top: 0, bottom: 0,
    width: sidebarW,
    zIndex: 40,
    background: "rgba(6,6,16,0.82)",
    backdropFilter: "blur(24px) saturate(150%)",
    WebkitBackdropFilter: "blur(24px) saturate(150%)",
    borderRight: "1px solid rgba(255,255,255,0.05)",
    boxShadow: "2px 0 40px rgba(0,0,0,0.4)",
    transition: "width 0.25s cubic-bezier(0.16,1,0.3,1)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside style={sidebarStyle} className="hidden-mobile">
        <SidebarContent collapsed={collapsed} pathname={pathname} />

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            position: "absolute",
            right: -12,
            top: "50%",
            transform: "translateY(-50%)",
            width: 24, height: 24,
            borderRadius: "50%",
            background: "rgba(10,10,24,0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            transition: "all 0.2s ease",
            color: "rgba(255,255,255,0.4)",
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
            zIndex: 38, display: "none",
          }}
          className="show-mobile"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        style={{
          ...sidebarStyle,
          width: 240,
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          display: "none",
        }}
        className="show-mobile"
      >
        <button
          onClick={() => setMobileOpen(false)}
          style={{
            position: "absolute", top: 12, right: 12,
            background: "transparent", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          <X size={16} />
        </button>
        <SidebarContent collapsed={false} pathname={pathname} />
      </aside>

      {/* Main content area */}
      <div style={{
        marginLeft: `${sidebarW}px`,
        minHeight: "100vh",
        position: "relative",
        zIndex: 1,
        transition: "margin-left 0.25s cubic-bezier(0.16,1,0.3,1)",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Mobile topbar */}
        <div className="show-mobile" style={{
          position: "sticky", top: 0, zIndex: 30,
          background: "rgba(6,6,16,0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          padding: "12px 16px",
          display: "none",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: "linear-gradient(135deg,#2a3aff,#7c3aed)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Command size={13} color="#fff" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#f4f4ff" }}>FounderOS</span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="btn-icon"
            style={{ background: "transparent", border: "none", cursor: "pointer" }}
          >
            <Menu size={18} style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
        </div>

        <main style={{ flex: 1 }}>{children}</main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
          div[style*="margin-left"] { margin-left: 0 !important; }
        }
      `}</style>
    </>
  );
}
