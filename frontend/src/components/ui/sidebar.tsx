"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Terminal, Users, Database, FileText, Zap, Shield } from "lucide-react";
import { API_BASE } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/", label: "Launch Console", icon: Terminal, accent: "blue" },
  { href: "/vault", label: "Strategy Vault", icon: Database, accent: "emerald" },
  { href: "/advisors", label: "Advisor Roster", icon: Users, accent: "violet" },
  { href: "/docs", label: "Consensus Specs", icon: FileText, accent: "amber" },
];

const ACCENT_STYLES: Record<string, { active: string; dot: string; glow: string }> = {
  blue:   { active: "text-blue-400 bg-blue-500/8 border-blue-500/20",   dot: "bg-blue-500",   glow: "shadow-[0_0_12px_rgba(59,130,246,0.25)]" },
  emerald:{ active: "text-emerald-400 bg-emerald-500/8 border-emerald-500/20", dot: "bg-emerald-500", glow: "shadow-[0_0_12px_rgba(16,185,129,0.25)]" },
  violet: { active: "text-violet-400 bg-violet-500/8 border-violet-500/20", dot: "bg-violet-500",  glow: "shadow-[0_0_12px_rgba(139,92,246,0.25)]" },
  amber:  { active: "text-amber-400 bg-amber-500/8 border-amber-500/20",  dot: "bg-amber-500",  glow: "shadow-[0_0_12px_rgba(245,158,11,0.25)]" },
};

export default function Sidebar() {
  const pathname = usePathname();
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      const start = Date.now();
      try {
        const res = await fetch(`${API_BASE}/`);
        if (res.ok) {
          setApiOk(true);
          setLatency(Date.now() - start);
        } else {
          setApiOk(false);
        }
      } catch {
        setApiOk(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside
      className="w-[220px] shrink-0 h-screen flex flex-col z-20 select-none font-mono"
      style={{
        background: "rgba(7,7,9,0.85)",
        backdropFilter: "blur(20px) saturate(130%)",
        WebkitBackdropFilter: "blur(20px) saturate(130%)",
        borderRight: "1px solid rgba(39,39,42,0.5)",
        boxShadow: "1px 0 0 rgba(255,255,255,0.02), 4px 0 30px rgba(0,0,0,0.4)",
      }}
    >
      {/* ── Brand Header ── */}
      <div
        className="px-5 py-5"
        style={{ borderBottom: "1px solid rgba(39,39,42,0.4)" }}
      >
        <div className="flex items-center gap-3">
          {/* Logo Mark */}
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{
              background: "linear-gradient(135deg, #1d4ed8, #7c3aed)",
              boxShadow: "0 0 20px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            Φ
          </div>
          <div>
            <span className="font-bold tracking-tight text-white text-[13px] block leading-tight">
              FounderOS
            </span>
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold leading-tight block">
              Executive Operations
            </span>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-4 space-y-1" role="navigation" aria-label="Main Navigation">
        <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold px-2 pb-2">
          Workspace
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const accent = ACCENT_STYLES[item.accent];

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""} flex items-center gap-3 px-3 py-2.5 rounded-lg border text-[11px] font-semibold tracking-wide transition-all duration-200 ${
                isActive
                  ? `${accent.active} ${accent.glow}`
                  : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/[0.03] hover:border-zinc-800/50"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
              {isActive && (
                <span className={`ml-auto h-1.5 w-1.5 rounded-full shrink-0 ${accent.dot}`} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── System Status Footer ── */}
      <div
        className="p-4 space-y-3"
        style={{
          borderTop: "1px solid rgba(39,39,42,0.4)",
          background: "rgba(0,0,0,0.2)",
        }}
      >
        <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">
          System Status
        </p>

        {/* API Health */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <Zap className="h-3 w-3" />
            <span>API Gateway</span>
          </div>
          {apiOk === null ? (
            <span className="text-[9px] text-zinc-600 animate-pulse">Checking…</span>
          ) : apiOk ? (
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full led-online" />
              <span className="text-[9px] text-emerald-400 font-bold">Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full led-critical animate-pulse" />
              <span className="text-[9px] text-red-400 font-bold">Offline</span>
            </div>
          )}
        </div>

        {/* Latency */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-500">Latency</span>
          <span className={`text-[10px] font-bold tabular-nums ${latency !== null && latency < 100 ? "text-emerald-400" : latency !== null && latency < 300 ? "text-amber-400" : "text-zinc-500"}`}>
            {latency !== null ? `${latency}ms` : "—"}
          </span>
        </div>

        {/* Security */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <Shield className="h-3 w-3" />
            <span>Encryption</span>
          </div>
          <span className="text-[9px] text-emerald-400 font-bold">TLS 1.3</span>
        </div>
      </div>
    </aside>
  );
}
