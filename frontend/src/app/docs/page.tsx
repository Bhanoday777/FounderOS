"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Layers, Calculator, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const STAGES = [
  {
    round: "Round 1",
    title: "Independent Analysis",
    color: "#4d5fff",
    desc: "Each advisor evaluates the startup concept independently against their domain weight priorities, generating initial grades.",
  },
  {
    round: "Round 2",
    title: "Cross-Examination",
    color: "#9b6dff",
    desc: "Advisors review each other's analyses, explicitly challenging margin, feasibility, or moat flags to build a consensus pivot.",
  },
  {
    round: "Round 3",
    title: "Executive Ballot",
    color: "#f59e0b",
    desc: "Each advisor casts a structured vote (Approve / Conditional / Reject) with a self-rated confidence index from 0–100.",
  },
  {
    round: "Round 4",
    title: "Synthesis",
    color: "#10b981",
    desc: "The engine compiles deliverables — Executive Summary, Architecture, Risk Register, and Roadmap — in parallel.",
  },
];

const VOTE_MULTIPLIERS = [
  { vote: "APPROVE",               mult: "1.0", color: "#10b981", icon: CheckCircle },
  { vote: "CONDITIONALLY_APPROVE", mult: "0.5", color: "#f59e0b", icon: AlertCircle },
  { vote: "REJECT",                mult: "0.0", color: "#ef4444", icon: XCircle     },
];

export default function DocsPage() {
  const [innovation, setInnovation] = useState(70);
  const [margins, setMargins]       = useState(65);
  const [complexity, setComplexity] = useState(50);
  const [tam, setTam]               = useState(60);

  const calculatedScore = Math.max(0, Math.min(100, Math.round(
    innovation * 0.3 + tam * 0.25 + margins * 0.35 - complexity * 0.1
  )));

  const ceoOk      = innovation >= 60;
  const ctoOk      = complexity <= 75;
  const investorOk = margins >= 65 && tam >= 60;
  const pmOk       = complexity <= 70;

  const R = 38; const C = R * 2 * Math.PI;
  const scoreColor = calculatedScore >= 70 ? "#10b981" : calculatedScore >= 45 ? "#f59e0b" : "#ef4444";

  const SLIDERS = [
    { label: "Innovation Index",   value: innovation,  set: setInnovation, color: "#4d5fff" },
    { label: "Market TAM Scale",   value: tam,         set: setTam,        color: "#f59e0b" },
    { label: "Financial Margins",  value: margins,     set: setMargins,    color: "#10b981" },
    { label: "System Complexity",  value: complexity,  set: setComplexity, color: "#9b6dff" },
  ];

  const APPROVALS = [
    { label: "CEO",      ok: ceoOk      },
    { label: "CTO",      ok: ctoOk      },
    { label: "Investor", ok: investorOk },
    { label: "PM",       ok: pmOk       },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ marginBottom: 36 }}>
        <div className="label-xs" style={{ marginBottom: 10 }}>FounderOS — Technical Reference</div>
        <h1 className="heading-md" style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
          <BookOpen size={22} style={{ color: "#4d5fff", filter: "drop-shadow(0 0 8px rgba(74,95,255,0.5))" }} />
          Technical Specifications
        </h1>
        <p style={{ fontSize: 13, color: "rgba(168,168,192,0.6)", lineHeight: 1.5, maxWidth: 500 }}>
          Multi-agent consensus algorithms, viability scoring equations, and SSE event-driven state architecture.
        </p>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Meeting Stages */}
          <div className="card" style={{ padding: "24px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <Layers size={15} style={{ color: "#4d5fff" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#4d5fff", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Operational Stages
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative" }}>
              <div style={{
                position: "absolute", left: 16, top: 8, bottom: 8, width: 1,
                background: "linear-gradient(180deg, rgba(74,95,255,0.3), transparent)",
              }} />
              {STAGES.map((s, i) => (
                <motion.div
                  key={s.round}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  style={{ display: "flex", gap: 20, paddingBottom: i < STAGES.length - 1 ? 24 : 0 }}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 5, zIndex: 1,
                    background: s.color, boxShadow: `0 0 8px ${s.color}60`,
                    border: `2px solid ${s.color}40`,
                  }} />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.round}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#f4f4ff" }}>{s.title}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "rgba(168,168,192,0.7)", lineHeight: 1.65 }}>{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Scoring Formula */}
          <div className="card" style={{ padding: "24px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <Calculator size={15} style={{ color: "#9b6dff" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#9b6dff", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Viability Score Formula
              </span>
            </div>

            <div style={{
              padding: "16px 20px", borderRadius: 12, marginBottom: 20,
              background: "rgba(5,5,14,0.8)", border: "1px solid rgba(255,255,255,0.06)",
              fontFamily: "JetBrains Mono, monospace", fontSize: 13,
              color: "rgba(168,184,255,0.9)", textAlign: "center", lineHeight: 1.8,
            }}>
              Score = Round( TotalWeighted / TotalConfidence × 100 )
            </div>

            <p style={{ fontSize: 12, color: "rgba(168,168,192,0.7)", lineHeight: 1.65, marginBottom: 16 }}>
              Each advisor's weighted contribution is <code style={{ fontFamily: "JetBrains Mono,monospace", background: "rgba(255,255,255,0.05)", padding: "1px 6px", borderRadius: 4, fontSize: 11 }}>multiplier × confidence</code>. The sum is normalized by total confidence to produce a meaningful 0–100 viability score.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {VOTE_MULTIPLIERS.map((v) => {
                const Icon = v.icon;
                return (
                  <div key={v.vote} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", borderRadius: 10,
                    background: `${v.color}08`, border: `1px solid ${v.color}20`,
                  }}>
                    <Icon size={14} style={{ color: v.color, flexShrink: 0 }} />
                    <code style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 11, color: v.color, flex: 1 }}>{v.vote}</code>
                    <span style={{ fontSize: 11, fontWeight: 700, color: v.color }}>× {v.mult}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Strategy Sandbox */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="card"
          style={{ padding: "22px", position: "sticky", top: 32 }}
        >
          <div className="label-xs" style={{ marginBottom: 16 }}>Strategy Sandbox</div>

          {/* Radial score */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
            <div style={{ position: "relative", width: 100, height: 100 }}>
              <svg width="100" height="100" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
                <circle
                  cx="50" cy="50" r={R} fill="none" stroke={scoreColor}
                  strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={C - (calculatedScore / 100) * C}
                  style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease", filter: `drop-shadow(0 0 8px ${scoreColor}60)` }}
                />
              </svg>
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{calculatedScore}</span>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>/ 100</span>
              </div>
            </div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>Synthetic Grade</span>
          </div>

          {/* Sliders */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
            {SLIDERS.map(s => (
              <div key={s.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)", fontFamily: "JetBrains Mono, monospace" }}>
                    {s.label}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{s.value}%</span>
                </div>
                <input
                  type="range" min={0} max={100}
                  value={s.value}
                  onChange={e => s.set(Number(e.target.value))}
                  style={{ width: "100%", accentColor: s.color }}
                />
              </div>
            ))}
          </div>

          {/* Board decision LEDs */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16 }}>
            <div className="label-xs" style={{ marginBottom: 12 }}>Board Decision</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {APPROVALS.map(a => (
                <div key={a.label} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 10px", borderRadius: 8,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{a.label}</span>
                  <span className={`led ${a.ok ? "led-green" : "led-red"}`} />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
