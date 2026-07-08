"use client";

import { motion } from "framer-motion";
import { Vote } from "@/lib/api";
import { 
  Briefcase, Cpu, TrendingUp, Layers, Megaphone, Scale, Coins, ShieldAlert, Palette, Compass, Bot, CheckCircle, AlertCircle, XCircle 
} from "lucide-react";

const ROLE_CONFIG: Record<string, { icon: any; label: string; accent: string; border: string }> = {
  CEO:                     { icon: Briefcase,   label: "Chief Executive",      accent: "#4d5fff", border: "rgba(74,95,255,0.2)"   },
  CTO:                     { icon: Cpu,         label: "Chief Technology",     accent: "#9b6dff", border: "rgba(155,109,255,0.2)" },
  Investor:                { icon: TrendingUp,  label: "Lead Investor",        accent: "#f59e0b", border: "rgba(245,158,11,0.2)"  },
  "Product Manager":       { icon: Layers,      label: "Product Manager",      accent: "#10b981", border: "rgba(16,185,129,0.2)"  },
  "Marketing Strategist":  { icon: Megaphone,   label: "Marketing Strategist", accent: "#ec4899", border: "rgba(236,72,153,0.2)"  },
  "Legal Advisor":         { icon: Scale,       label: "Legal Advisor",        accent: "#a8a8c0", border: "rgba(168,168,192,0.2)" },
  "Finance Advisor":       { icon: Coins,       label: "Finance Advisor",      accent: "#3b82f6", border: "rgba(59,130,246,0.2)"  },
  "Security Architect":    { icon: ShieldAlert, label: "Security Architect",   accent: "#ef4444", border: "rgba(239,68,68,0.2)"   },
  "UX Advisor":            { icon: Palette,     label: "UX Advisor",           accent: "#06b6d4", border: "rgba(6,182,212,0.2)"   },
  "Competition Analyst":   { icon: Compass,     label: "Competition Analyst",  accent: "#84cc16", border: "rgba(132,204,22,0.2)"  },
};

const VOTE_CONFIGS = {
  APPROVE:               { label: "Approved",    icon: CheckCircle,  color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)" },
  CONDITIONALLY_APPROVE: { label: "Conditional", icon: AlertCircle,  color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" },
  REJECT:                { label: "Rejected",    icon: XCircle,      color: "#ef4444", bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.2)"  },
};

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Confidence
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{value}%</span>
      </div>
      <div className="progress-bar-bg">
        <motion.div
          className="progress-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.16,1,0.3,1] }}
          style={{ background: `linear-gradient(90deg, ${color}80, ${color})` }}
        />
      </div>
    </div>
  );
}

interface Props { votes: Vote[]; }

export default function VotePanel({ votes }: Props) {
  if (!votes.length) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: 240, flexDirection: "column", gap: 12, opacity: 0.5,
      }}>
        <div style={{ fontSize: 32 }}>🗳</div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Votes will appear here once the board ballots.</p>
      </div>
    );
  }

  const approved    = votes.filter(v => v.vote === "APPROVE").length;
  const conditional = votes.filter(v => v.vote === "CONDITIONALLY_APPROVE").length;
  const rejected    = votes.filter(v => v.vote === "REJECT").length;

  return (
    <div>
      {/* Summary row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
        {[
          { label: "Approved", count: approved, color: "#10b981", bg: "rgba(16,185,129,0.08)" },
          { label: "Conditional", count: conditional, color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
          { label: "Rejected", count: rejected, color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
          { label: "Total Votes", count: votes.length, color: "#a8b8ff", bg: "rgba(74,95,255,0.06)" },
        ].map((s) => (
          <div key={s.label} style={{
            flex: 1, minWidth: 100,
            padding: "14px 16px",
            background: s.bg,
            border: `1px solid ${s.color}22`,
            borderRadius: 14, textAlign: "center",
          }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.count}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 4, fontWeight: 600, letterSpacing: "0.06em" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Vote cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {votes.map((vote, i) => {
          const role = ROLE_CONFIG[vote.role] || { icon: Bot, label: vote.role, accent: "#a8a8c0", border: "rgba(168,168,192,0.2)" };
          const vc   = VOTE_CONFIGS[vote.vote] || VOTE_CONFIGS.REJECT;
          const Icon = role.icon;
          const VIcon = vc.icon;

          return (
            <motion.div
              key={vote.role}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1, duration: 0.4, ease: [0.16,1,0.3,1] }}
              className="card"
              style={{ padding: 0 }}
            >
              {/* Card header */}
              <div style={{
                padding: "16px 18px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: `${role.accent}14`, border: `1px solid ${role.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon size={16} style={{ color: role.accent }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#f4f4ff" }}>{vote.role}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{role.label}</div>
                  </div>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "4px 10px", borderRadius: 9999,
                  background: vc.bg, border: `1px solid ${vc.border}`,
                  fontSize: 11, fontWeight: 700, color: vc.color,
                }}>
                  <VIcon size={12} />
                  {vc.label}
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
                <ConfidenceBar value={vote.confidence} color={vc.color} />
                <p style={{
                  fontSize: 12, color: "rgba(168,168,192,0.85)", lineHeight: 1.65,
                  borderLeft: `2px solid ${role.accent}40`, paddingLeft: 12,
                  fontStyle: "italic",
                }}>
                  "{vote.reasoning}"
                </p>
                {vote.blocking_concern && (
                  <div style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.18)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    marginTop: 4
                  }}>
                    <XCircle size={13} style={{ color: "#ef4444", marginTop: 1, flexShrink: 0 }} />
                    <div style={{ fontSize: 11, color: "#f87171", lineHeight: 1.4 }}>
                      <strong style={{ display: "block", marginBottom: 2 }}>Blocking Concern</strong>
                      {vote.blocking_concern}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
