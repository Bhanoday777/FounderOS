"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Briefcase, Cpu, TrendingUp, Layers, Megaphone, Scale, Coins, ShieldAlert, Palette, Compass,
  ArrowRight, ChevronDown, AlertTriangle,
} from "lucide-react";

import { createSession } from "@/lib/api";

const EXEC_SEATS = [
  {
    role: "CEO",  title: "Chief Executive",       icon: Briefcase,
    desc: "Vision, strategy & pivots",
    accent: "#4d5fff", glow: "rgba(74,95,255,0.12)",
    border: "rgba(74,95,255,0.2)",
  },
  {
    role: "CTO",  title: "Chief Technology",      icon: Cpu,
    desc: "Architecture & scalability",
    accent: "#9b6dff", glow: "rgba(155,109,255,0.12)",
    border: "rgba(155,109,255,0.2)",
  },
  {
    role: "VC",   title: "Lead Investor",          icon: TrendingUp,
    desc: "Unit economics & moat",
    accent: "#f59e0b", glow: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.18)",
  },
  {
    role: "PM",   title: "Product Manager",        icon: Layers,
    desc: "MVP scope & user validation",
    accent: "#10b981", glow: "rgba(16,185,129,0.10)",
    border: "rgba(16,185,129,0.2)",
  },
  {
    role: "MKT",  title: "Marketing Strategist",   icon: Megaphone,
    desc: "GTM & organic growth loops",
    accent: "#ec4899", glow: "rgba(236,72,153,0.10)",
    border: "rgba(236,72,153,0.2)",
  },
  {
    role: "FIN",  title: "Finance Advisor",         icon: Coins,
    desc: "Margins, burn & runway",
    accent: "#3b82f6", glow: "rgba(59,130,246,0.10)",
    border: "rgba(59,130,246,0.2)",
  },
  {
    role: "LGL",  title: "Legal Advisor",           icon: Scale,
    desc: "Compliance & IP risk",
    accent: "#a8a8c0", glow: "rgba(168,168,192,0.08)",
    border: "rgba(168,168,192,0.18)",
  },
  {
    role: "SEC",  title: "Security Architect",      icon: ShieldAlert,
    desc: "Threat models & zero-trust",
    accent: "#ef4444", glow: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.2)",
  },
  {
    role: "UX",   title: "UX Advisor",              icon: Palette,
    desc: "Friction, retention & flow",
    accent: "#06b6d4", glow: "rgba(6,182,212,0.10)",
    border: "rgba(6,182,212,0.2)",
  },
  {
    role: "CPT",  title: "Competition Analyst",     icon: Compass,
    desc: "Competitive moat & positioning",
    accent: "#84cc16", glow: "rgba(132,204,22,0.10)",
    border: "rgba(132,204,22,0.2)",
  },
];

const FEATURES = [
  { label: "10 AI Executive Advisors", color: "#4d5fff" },
  { label: "Live Boardroom Debate",    color: "#9b6dff" },
  { label: "Executive Voting",         color: "#10b981" },
  { label: "Risk & Penalty Engine",    color: "#ef4444" },
  { label: "Consensus Scoring",        color: "#f59e0b" },
  { label: "10 Specialized Reports",   color: "#06b6d4" },
];

const MAX_CHARS = 600;

export default function CommandCenterPage() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"landing" | "console">("landing");

  const charCount = idea.length;
  const charPct = Math.min(charCount / MAX_CHARS, 1);

  async function handleConvene() {
    if (!idea.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const session = await createSession(idea.trim());
      router.push(`/boardroom/${session.id}`);
    } catch {
      setError("Could not connect to the executive server. Ensure the backend is running.");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <AnimatePresence mode="wait">
        {phase === "landing" ? (
          /* ───────────────────────── LANDING GATEWAY ───────────────────────── */
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.5 }}
            style={{
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 24px",
              textAlign: "center",
              position: "relative",
            }}
          >
            {/* ── Status pill ── */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.16,1,0.3,1] }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "5px 14px 5px 8px",
                borderRadius: 9999,
                background: "rgba(74,95,255,0.08)",
                border: "1px solid rgba(74,95,255,0.18)",
                marginBottom: 40,
              }}
            >
              <span className="led led-green led-pulse" />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#a8b8ff", letterSpacing: "0.04em" }}>
                Executive Board Online — 10 AI Advisors Ready
              </span>
            </motion.div>

            {/* ── Hero wordmark ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.6, ease: [0.16,1,0.3,1] }}
            >
              <h1 className="heading-xl" style={{ marginBottom: 8 }}>
                Your startup idea,<br />
                <span style={{
                  background: "linear-gradient(135deg,#4d5fff 0%,#9b6dff 50%,#10b981 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>
                  boardroom-tested.
                </span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.5 }}
              style={{
                fontSize: 17,
                color: "rgba(168,168,192,0.9)",
                maxWidth: 540,
                lineHeight: 1.65,
                margin: "20px auto 40px",
                fontWeight: 400,
              }}
            >
              FounderOS convenes 10 specialized AI executives who independently analyze,
              cross-examine, vote, and deliver investor-grade reports on your startup concept —
              powered by a deterministic scoring engine.
            </motion.p>

            {/* ── Feature tags ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.42, duration: 0.5 }}
              style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 52 }}
            >
              {FEATURES.map((f) => (
                <span
                  key={f.label}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: "4px 12px",
                    borderRadius: 9999,
                    background: `${f.color}10`,
                    border: `1px solid ${f.color}28`,
                    color: f.color,
                    letterSpacing: "0.02em",
                  }}
                >
                  {f.label}
                </span>
              ))}
            </motion.div>

            {/* ── CTA ── */}
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="btn-hero"
              onClick={() => setPhase("console")}
              style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
            >
              <Zap size={18} style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.6))" }} />
              Enter Operations Center
              <ArrowRight size={16} />
            </motion.button>

            {/* Scroll cue */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              style={{ position: "absolute", bottom: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
            >
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Learn More
              </span>
              <ChevronDown size={14} style={{ color: "rgba(255,255,255,0.2)" }} className="led-pulse" />
            </motion.div>
          </motion.div>
        ) : (
          /* ─────────────────────── COMMAND CONSOLE ─────────────────────── */
          <motion.div
            key="console"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16,1,0.3,1] }}
            style={{ maxWidth: 800, margin: "0 auto", padding: "60px 24px" }}
          >
            {/* Header */}
            <div style={{ marginBottom: 48 }}>
              <div className="label-xs" style={{ marginBottom: 12 }}>
                FounderOS — Command Center
              </div>
              <h2 className="heading-lg" style={{ marginBottom: 12 }}>
                Brief the Executive Board
              </h2>
              <p style={{ color: "rgba(168,168,192,0.75)", fontSize: 15, lineHeight: 1.6, maxWidth: 480 }}>
                Describe your startup concept below. The AI board will independently analyze, debate, vote, and deliver a complete executive report.
              </p>
            </div>

            {/* Input Panel */}
            <div
              className="card"
              style={{ padding: 0, overflow: "visible", marginBottom: 24 }}
            >
              {/* Panel header */}
              <div style={{
                padding: "16px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="led led-green led-pulse" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>
                    STARTUP BRIEF — SECURE CHANNEL
                  </span>
                </div>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>
                  {charCount}/{MAX_CHARS}
                </span>
              </div>

              {/* Textarea */}
              <div style={{ padding: 20 }}>
                <textarea
                  className="input-field"
                  rows={7}
                  maxLength={MAX_CHARS}
                  placeholder={`Describe your startup concept in detail.\n\nInclude: what the product does, target audience, business model, and the key problem it solves.\n\nExample: "A B2B SaaS platform that automates enterprise contract management using AI, targeting legal teams at Fortune 500 companies..."`}
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  disabled={loading}
                  style={{ minHeight: 180, fontSize: 14, lineHeight: 1.7 }}
                />

                {/* Char progress */}
                <div style={{ marginTop: 8 }}>
                  <div className="progress-bar-bg">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${charPct * 100}%`,
                        background: charPct > 0.85 ? "#ef4444" : "linear-gradient(90deg,#4d5fff,#9b6dff)",
                        transition: "width 0.1s ease",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Error state */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "14px 16px", borderRadius: 12,
                    background: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    marginBottom: 20,
                  }}
                >
                  <AlertTriangle size={15} style={{ color: "#ef4444", marginTop: 1, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "rgba(248,113,113,0.95)", lineHeight: 1.5 }}>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Executive Board Preview */}
            <div style={{ marginBottom: 32 }}>
              <div className="sep-label" style={{ marginBottom: 20 }}>
                Executive Panel
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                {EXEC_SEATS.map((seat, i) => {
                  const Icon = seat.icon;
                  return (
                    <motion.div
                      key={seat.role}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 * i, duration: 0.4 }}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "14px 16px",
                        background: "rgba(10,10,22,0.5)",
                        border: `1px solid ${seat.border}`,
                        borderRadius: 14,
                        boxShadow: `0 4px 20px ${seat.glow}`,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 0% 50%, ${seat.glow}, transparent 70%)`, pointerEvents: "none" }} />
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: `${seat.accent}15`,
                        border: `1px solid ${seat.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <Icon size={16} style={{ color: seat.accent, filter: `drop-shadow(0 0 4px ${seat.accent}80)` }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#f4f4ff", lineHeight: 1.3 }}>{seat.title}</div>
                        <div style={{ fontSize: 11, color: "rgba(168,168,192,0.6)" }}>{seat.desc}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Convene Button */}
            <div style={{ textAlign: "center" }}>
              <button
                className="btn-hero"
                onClick={handleConvene}
                disabled={!idea.trim() || loading}
                style={{ width: "100%", maxWidth: 440, position: "relative" }}
              >
                {loading ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Assembling Executive Board…
                  </>
                ) : (
                  <>
                    <Zap size={18} />
                    ⚡ Convene Executive Board
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
              <p style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.25)", lineHeight: 1.5 }}>
                This initiates a live multi-agent session. Typically takes 60–90 seconds.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
