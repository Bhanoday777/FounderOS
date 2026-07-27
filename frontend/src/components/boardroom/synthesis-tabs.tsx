"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SynthesisResult, API_BASE } from "@/lib/api";
import { 
  FileText, Server, ShieldAlert, Map, ChevronRight, Coins, 
  Megaphone, Scale, Palette, ShieldCheck, Compass, CheckCircle2, 
  TrendingUp, AlertTriangle, Download, FileDown, Printer
} from "lucide-react";

function parseCEOSummary(text: string) {
  const sections: Record<string, string> = {};
  const regex = /###\s+([^\n]+)\n([\s\S]*?)(?=(?:###\s+|$))/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const header = match[1].trim();
    const content = match[2].trim();
    sections[header] = content;
  }
  return sections;
}

function parseRoadmapItem(line: string) {
  const match = line.match(/^(Week \d+|Launch|Phase \d+):/i);
  return {
    phase: match ? match[1] : "Step",
    content: match ? line.slice(match[0].length).trim() : line,
  };
}

import VentureSimulator from "./venture-simulator";

interface Props {
  synthesis: SynthesisResult | null;
  sessionState: string;
  turns?: any[];
  healthScore?: any;
}

const TABS = [
  { id: "strategy", label: "Executive & Strategy", icon: FileText   },
  { id: "product",  label: "Product & Engineering", icon: Map        },
  { id: "finance",  label: "Finance & Governance",  icon: Coins      },
];

export default function SynthesisTabs({ synthesis, sessionState, turns, healthScore }: Props) {
  const { id: sessionId } = useParams<{ id: string }>();
  const [tab, setTab] = useState("strategy");
  const [subTab, setSubTab] = useState("summary");
  const [expandedMemoParas, setExpandedMemoParas] = useState<Record<number, boolean>>({});

  const isSynthesizing = sessionState === "SYNTHESIS" && !synthesis;

  const downloadReport = (format: "json" | "markdown" | "html") => {
    if (!sessionId) return;
    window.open(`${API_BASE}/api/board/session/${sessionId}/export/${format}`, "_blank");
  };

  if (isSynthesizing) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: 320, gap: 20,
      }}>
        <div style={{
          display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 400,
        }}>
          {["Compiling executive summary…", "Drafting architecture…", "Evaluating runway and GTM…", "Finalizing compliance audit…"].map((label, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.4 }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", borderRadius: 12,
                background: "rgba(74,95,255,0.05)", border: "1px solid rgba(74,95,255,0.12)",
              }}
            >
              <span className="led led-blue led-pulse" />
              <span style={{ fontSize: 13, color: "rgba(168,184,255,0.8)" }}>{label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (!synthesis) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: 300, flexDirection: "column", gap: 12, opacity: 0.5,
      }}>
        <div style={{ fontSize: 32 }}>📋</div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Report will appear after synthesis completes.</p>
      </div>
    );
  }

  const handleMainTabChange = (mainId: string) => {
    setTab(mainId);
    if (mainId === "strategy") setSubTab("summary");
    else if (mainId === "product") setSubTab("roadmap");
    else if (mainId === "finance") setSubTab("financial");
  };

  const summarySections = parseCEOSummary(synthesis.executive_summary || "");
  const hasParsedSummary = Object.keys(summarySections).length > 0;

  return (
    <div>
      {/* Category Tabs & Export Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div className="tab-bar" style={{ display: "inline-flex" }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                className={`tab-btn ${tab === t.id ? "active" : ""}`}
                onClick={() => handleMainTabChange(t.id)}
              >
                <Icon size={13} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Action Export Buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          <button 
            onClick={() => downloadReport("markdown")}
            className="btn btn-ghost" 
            style={{ padding: "6px 12px", height: 34, fontSize: 11, gap: 6, border: "1px solid rgba(255,255,255,0.06)" }}
            title="Download report in Markdown format"
          >
            <FileDown size={14} />
            Markdown
          </button>
          <button 
            onClick={() => downloadReport("json")}
            className="btn btn-ghost" 
            style={{ padding: "6px 12px", height: 34, fontSize: 11, gap: 6, border: "1px solid rgba(255,255,255,0.06)" }}
            title="Export raw session data in JSON"
          >
            <Download size={14} />
            JSON
          </button>
          <button 
            onClick={() => downloadReport("html")}
            className="btn btn-ghost" 
            style={{ padding: "6px 12px", height: 34, fontSize: 11, gap: 6, border: "1px solid rgba(255,255,255,0.06)" }}
            title="Open print-ready styled HTML report"
          >
            <Printer size={14} />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Sub-Tabs Row */}
      <div style={{
        display: "flex",
        gap: 8,
        marginBottom: 24,
        paddingBottom: 10,
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        flexWrap: "wrap"
      }}>
        {tab === "strategy" && [
          { id: "summary", label: "Executive Summary" },
          { id: "risk_matrix", label: "Risk Matrix" },
          { id: "opportunity_matrix", label: "Opportunity Matrix" },
          { id: "investor", label: "Investment Memo" },
          { id: "gtm", label: "Go-To-Market" },
          { id: "competition", label: "Competitive Analysis" },
        ].map(sub => (
          <button
            key={sub.id}
            onClick={() => setSubTab(sub.id)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              background: subTab === sub.id ? "rgba(74,95,255,0.12)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${subTab === sub.id ? "rgba(74,95,255,0.3)" : "rgba(255,255,255,0.05)"}`,
              color: subTab === sub.id ? "#818cf8" : "rgba(255,255,255,0.5)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {sub.label}
          </button>
        ))}

        {tab === "product" && [
          { id: "roadmap", label: "Roadmap" },
          { id: "action_plan", label: "Action Plan Matrix" },
          { id: "arch", label: "System Architecture" },
          { id: "ux", label: "UX Friction Review" },
          { id: "security", label: "Security Risk Assessment" },
        ].map(sub => (
          <button
            key={sub.id}
            onClick={() => setSubTab(sub.id)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              background: subTab === sub.id ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${subTab === sub.id ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.05)"}`,
              color: subTab === sub.id ? "#34d399" : "rgba(255,255,255,0.5)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {sub.label}
          </button>
        ))}

        {tab === "finance" && [
          { id: "financial", label: "Runway Forecast" },
          { id: "compliance", label: "Compliance Checklist" },
          { id: "simulator", label: "Venture Simulator" },
        ].map(sub => (
          <button
            key={sub.id}
            onClick={() => setSubTab(sub.id)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              background: subTab === sub.id ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${subTab === sub.id ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.05)"}`,
              color: subTab === sub.id ? "#60a5fa" : "rgba(255,255,255,0.5)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {sub.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${tab}-${subTab}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* ── SECTION 1: STRATEGY TABS ── */}
          {tab === "strategy" && subTab === "summary" && (
            synthesis.executive_summary_v2 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                  <div className="card" style={{ padding: 20, borderLeft: "3px solid #4d5fff", background: "rgba(77,95,255,0.02)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#4d5fff", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                      Core Vision & Value Prop
                    </div>
                    <p style={{ fontSize: 13, color: "rgba(244,244,255,0.9)", lineHeight: 1.65 }}>
                      {synthesis.executive_summary_v2.vision}
                    </p>
                  </div>
                  <div className="card" style={{ padding: 20, borderLeft: "3px solid #9b6dff", background: "rgba(155,109,255,0.02)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#9b6dff", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                      Strategic Moat & Defense
                    </div>
                    <p style={{ fontSize: 13, color: "rgba(244,244,255,0.9)", lineHeight: 1.65 }}>
                      {synthesis.executive_summary_v2.strategic_moat}
                    </p>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                  <div className="card" style={{ padding: 20, borderLeft: "3px solid #10b981", background: "rgba(16,185,129,0.02)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                      Capital Efficiency
                    </div>
                    <p style={{ fontSize: 13, color: "rgba(244,244,255,0.9)", lineHeight: 1.65 }}>
                      {synthesis.executive_summary_v2.capital_efficiency}
                    </p>
                  </div>
                  <div className="card" style={{ padding: 20, borderLeft: "3px solid #ef4444", background: "rgba(239,68,68,0.02)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                      Overall Verdict
                    </div>
                    <p style={{ fontSize: 13, color: "rgba(244,244,255,0.9)", lineHeight: 1.65 }}>
                      {synthesis.executive_summary_v2.overall_verdict}
                    </p>
                  </div>
                </div>
              </div>
            ) : hasParsedSummary ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {summarySections["Startup Summary"] && (
                  <div className="card" style={{ padding: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                      Startup Summary
                    </div>
                    <p style={{ fontSize: 13, color: "rgba(244,244,255,0.9)", lineHeight: 1.65 }}>
                      {summarySections["Startup Summary"]}
                    </p>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {summarySections["Strengths"] && (
                    <div className="card" style={{ padding: 20, borderLeft: "3px solid #10b981", background: "rgba(16,185,129,0.02)" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                        <CheckCircle2 size={13} />
                        Strengths
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(168,168,192,0.9)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {summarySections["Strengths"]}
                      </div>
                    </div>
                  )}
                  {summarySections["Weaknesses"] && (
                    <div className="card" style={{ padding: 20, borderLeft: "3px solid #f59e0b", background: "rgba(245,158,11,0.02)" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                        <AlertTriangle size={13} />
                        Weaknesses
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(168,168,192,0.9)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {summarySections["Weaknesses"]}
                      </div>
                    </div>
                  )}
                </div>

                {summarySections["Critical Risks"] && (
                  <div className="card" style={{ padding: 20, borderLeft: "3px solid #ef4444", background: "rgba(239,68,68,0.02)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <ShieldAlert size={13} />
                      Critical Risks
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(168,168,192,0.9)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {summarySections["Critical Risks"]}
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {summarySections["Immediate Next Steps"] && (
                    <div className="card" style={{ padding: 20, borderLeft: "3px solid #06b6d4", background: "rgba(6,182,212,0.02)" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#06b6d4", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                        <Map size={13} />
                        Immediate Next Steps
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(168,168,192,0.9)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {summarySections["Immediate Next Steps"]}
                      </div>
                    </div>
                  )}
                  {summarySections["Final Recommendation"] && (
                    <div className="card" style={{ padding: 20, borderLeft: "3px solid #9b6dff", background: "rgba(155,109,255,0.02)" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#9b6dff", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                        <FileText size={13} />
                        Final Recommendation
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(168,168,192,0.9)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {summarySections["Final Recommendation"]}
                      </div>
                    </div>
                  )}
                </div>

                {summarySections["Board Consensus"] && (
                  <div className="card" style={{ padding: 20, borderLeft: "3px solid #4d5fff", background: "rgba(74,95,255,0.02)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#4d5fff", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <ShieldCheck size={13} />
                      Board Consensus
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(168,168,192,0.9)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {summarySections["Board Consensus"]}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ padding: "28px 32px" }}>
                <div className="label-xs" style={{ marginBottom: 16 }}>Executive Summary</div>
                <p style={{ fontSize: 14, color: "rgba(244,244,255,0.85)", lineHeight: 1.85, whiteSpace: "pre-wrap" }}>
                  {synthesis.executive_summary}
                </p>
              </div>
            )
          )}

          {tab === "strategy" && subTab === "risk_matrix" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {synthesis.risk_matrix && synthesis.risk_matrix.length > 0 ? (
                synthesis.risk_matrix.map((r, i) => {
                  const color = r.level.toLowerCase() === "high" ? "#ef4444" : r.level.toLowerCase() === "medium" ? "#f59e0b" : "#10b981";
                  return (
                    <div key={i} className="card" style={{ padding: "20px 22px", borderLeft: `3px solid ${color}`, background: `${color}02` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color }}>
                          {r.level} Risk
                        </span>
                      </div>
                      <div style={{ fontSize: 14, color: "#f4f4ff", fontWeight: 700, marginBottom: 8 }}>
                        {r.risk}
                      </div>
                      <div style={{ fontSize: 12.5, color: "rgba(168,168,192,0.95)", lineHeight: 1.6 }}>
                        <strong style={{ color: "#a8b8ff" }}>Mitigation: </strong>{r.mitigation}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>No risk matrix generated.</p>
              )}
            </div>
          )}

          {tab === "strategy" && subTab === "opportunity_matrix" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {synthesis.opportunity_matrix && synthesis.opportunity_matrix.length > 0 ? (
                synthesis.opportunity_matrix.map((o, i) => {
                  return (
                    <div key={i} className="card" style={{ padding: "20px 22px", borderLeft: "3px solid #84cc16", background: "rgba(132,204,22,0.02)" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#84cc16", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                        {o.horizon} Horizon
                      </div>
                      <div style={{ fontSize: 14, color: "#f4f4ff", fontWeight: 700, marginBottom: 8 }}>
                        {o.opportunity}
                      </div>
                      <div style={{ fontSize: 12.5, color: "rgba(168,168,192,0.95)", lineHeight: 1.6 }}>
                        <strong style={{ color: "#a8b8ff" }}>Value Justification: </strong>{o.value}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>No opportunity matrix generated.</p>
              )}
            </div>
          )}

          {tab === "strategy" && subTab === "investor" && (
            <div className="card" style={{ padding: "24px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <TrendingUp size={16} style={{ color: "#f59e0b" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Investment Memorandum (Annotated)
                </span>
              </div>
              
              {(() => {
                const paragraphs = (synthesis.investment_memo || "")
                  .split("\n\n")
                  .filter((p) => p.trim().length > 0);

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {paragraphs.map((p, idx) => {
                      const lower = p.toLowerCase();
                      let matchedRole = "";
                      let matchedComment = "";
                      let matchedIcon = "💬";

                      if (turns && turns.length > 0) {
                        if (lower.includes("tech") || lower.includes("architect") || lower.includes("scale") || lower.includes("database")) {
                          const turn = turns.find((t) => t.role === "CTO" || t.role === "Security Architect");
                          if (turn) {
                            matchedRole = turn.role;
                            matchedComment = turn.content;
                            matchedIcon = "💻";
                          }
                        } else if (lower.includes("market") || lower.includes("tam") || lower.includes("competition") || lower.includes("moat")) {
                          const turn = turns.find((t) => t.role === "Investor" || t.role === "Competition Analyst");
                          if (turn) {
                            matchedRole = turn.role;
                            matchedComment = turn.content;
                            matchedIcon = "📈";
                          }
                        } else if (lower.includes("legal") || lower.includes("compliance") || lower.includes("regulation")) {
                          const turn = turns.find((t) => t.role === "Legal Advisor");
                          if (turn) {
                            matchedRole = turn.role;
                            matchedComment = turn.content;
                            matchedIcon = "⚖️";
                          }
                        } else if (lower.includes("ux") || lower.includes("design") || lower.includes("onboarding") || lower.includes("user")) {
                          const turn = turns.find((t) => t.role === "UX Advisor");
                          if (turn) {
                            matchedRole = turn.role;
                            matchedComment = turn.content;
                            matchedIcon = "🎨";
                          }
                        }
                      }

                      const isExpanded = !!expandedMemoParas[idx];

                      return (
                        <div
                          key={idx}
                          style={{
                            background: matchedRole ? "rgba(255,255,255,0.01)" : "transparent",
                            border: matchedRole ? "1px solid rgba(255,255,255,0.03)" : "none",
                            borderRadius: matchedRole ? 12 : 0,
                            padding: matchedRole ? "14px 16px" : 0,
                            transition: "all 0.25s",
                            position: "relative"
                          }}
                        >
                          <p style={{ fontSize: 13, color: "rgba(244,244,255,0.85)", lineHeight: 1.8, margin: 0 }}>
                            {p}
                          </p>

                          {matchedRole && (
                            <div style={{ marginTop: 10 }}>
                              <button
                                className="btn btn-outline"
                                onClick={() => setExpandedMemoParas(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                style={{
                                  fontSize: 10,
                                  padding: "4px 10px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <span>{matchedIcon}</span>
                                {isExpanded ? "Hide Transcript Link" : `Highlight Debate Stance (${matchedRole})`}
                              </button>

                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    style={{
                                      marginTop: 10,
                                      padding: "10px 14px",
                                      background: "rgba(74,95,255,0.04)",
                                      border: "1px solid rgba(74,95,255,0.12)",
                                      borderRadius: 8,
                                      overflow: "hidden"
                                    }}
                                  >
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                      <span style={{ fontSize: 10, fontWeight: 700, color: "#818cf8", textTransform: "uppercase" }}>
                                        {matchedRole} Cross-Talk Snippet
                                      </span>
                                      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>Source Transcript Annotation</span>
                                    </div>
                                    <p style={{ fontSize: 11, color: "rgba(244,244,255,0.8)", fontStyle: "italic", lineHeight: 1.5, margin: 0 }}>
                                      "{matchedComment}"
                                    </p>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {tab === "strategy" && subTab === "gtm" && (
            <div className="card" style={{ padding: "24px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Megaphone size={16} style={{ color: "#ec4899" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Go-To-Market Strategy
                </span>
              </div>
              <p style={{ fontSize: 13, color: "rgba(244,244,255,0.85)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                {synthesis.go_to_market}
              </p>
            </div>
          )}

          {tab === "strategy" && subTab === "competition" && (
            <div className="card" style={{ padding: "24px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Compass size={16} style={{ color: "#84cc16" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Competitive Landscape Matrix
                </span>
              </div>
              <p style={{ fontSize: 13, color: "rgba(244,244,255,0.85)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                {synthesis.competitive_landscape}
              </p>
            </div>
          )}

          {/* ── SECTION 2: PRODUCT & TECH TABS ── */}
          {tab === "product" && subTab === "roadmap" && (
            <div className="card" style={{ padding: "28px 32px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
                <Map size={16} style={{ color: "#10b981" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  MVP Execution Roadmap
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative" }}>
                {/* Vertical line */}
                <div style={{
                  position: "absolute", left: 15, top: 8, bottom: 8,
                  width: 1,
                  background: "linear-gradient(180deg, rgba(16,185,129,0.4), rgba(16,185,129,0.05))",
                }} />

                {synthesis.roadmap.map((item, i) => {
                  const { phase, content } = parseRoadmapItem(item);
                  const isLast = i === synthesis.roadmap.length - 1;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.12 }}
                      style={{
                        display: "flex", gap: 20, alignItems: "flex-start",
                        paddingBottom: isLast ? 0 : 24,
                        position: "relative",
                      }}
                    >
                      {/* Dot */}
                      <div className="timeline-dot" style={{ marginTop: 3, zIndex: 1 }} />

                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: "#10b981",
                            letterSpacing: "0.08em", textTransform: "uppercase",
                          }}>
                            {phase}
                          </span>
                          <ChevronRight size={10} style={{ color: "rgba(16,185,129,0.4)" }} />
                        </div>
                        <p style={{ fontSize: 13, color: "rgba(244,244,255,0.85)", lineHeight: 1.65 }}>
                          {content}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "product" && subTab === "action_plan" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {synthesis.action_plan && synthesis.action_plan.length > 0 ? (
                synthesis.action_plan.map((a, i) => {
                  return (
                    <div key={i} className="card" style={{ padding: "20px 22px", borderLeft: "3px solid #06b6d4", background: "rgba(6,182,212,0.02)" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#06b6d4", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                        {a.phase}
                      </div>
                      <div style={{ fontSize: 14, color: "#f4f4ff", fontWeight: 700, marginBottom: 8 }}>
                        {a.priority}
                      </div>
                      <div style={{ fontSize: 12.5, color: "rgba(168,168,192,0.95)", lineHeight: 1.6 }}>
                        <strong style={{ color: "#a8b8ff" }}>Target Milestone: </strong>{a.milestone}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>No action plan matrix generated.</p>
              )}
            </div>
          )}

          {tab === "product" && subTab === "arch" && (
            <div className="card" style={{ padding: "28px 32px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Server size={16} style={{ color: "#9b6dff" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  System Architecture Specification
                </span>
              </div>
              <div style={{
                padding: "20px 22px", borderRadius: 12,
                background: "rgba(5,5,14,0.8)", border: "1px solid rgba(255,255,255,0.06)",
                fontFamily: "JetBrains Mono, monospace", fontSize: 13,
                color: "rgba(168,184,255,0.9)", lineHeight: 1.8,
                whiteSpace: "pre-wrap",
              }}>
                {synthesis.architecture}
              </div>
            </div>
          )}

          {tab === "product" && subTab === "ux" && (
            <div className="card" style={{ padding: "24px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Palette size={16} style={{ color: "#06b6d4" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  UX Friction & Interaction Review
                </span>
              </div>
              <p style={{ fontSize: 13, color: "rgba(244,244,255,0.85)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                {synthesis.ux_review}
              </p>
            </div>
          )}

          {tab === "product" && subTab === "security" && (
            <div className="card" style={{ padding: "24px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <ShieldAlert size={16} style={{ color: "#ef4444" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Security Risk Assessment
                </span>
              </div>
              <p style={{ fontSize: 13, color: "rgba(244,244,255,0.85)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                {synthesis.security_assessment}
              </p>
            </div>
          )}

          {/* ── SECTION 3: FINANCE & GOVERNANCE TABS ── */}
          {tab === "finance" && subTab === "financial" && (
            <div className="card" style={{ padding: "24px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Coins size={16} style={{ color: "#3b82f6" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Financial Runway Forecast
                </span>
              </div>
              <p style={{ fontSize: 13, color: "rgba(244,244,255,0.85)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                {synthesis.financial_report}
              </p>
            </div>
          )}

          {tab === "finance" && subTab === "compliance" && (
            <div className="card" style={{ padding: "28px 32px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
                <Scale size={16} style={{ color: "#a8a8c0" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Compliance Audit Checklist
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {synthesis.compliance_checklist && synthesis.compliance_checklist.length > 0 ? (
                  synthesis.compliance_checklist.map((item, i) => (
                    <div 
                      key={i}
                      style={{
                        display: "flex",
                        gap: 12,
                        padding: "12px 16px",
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: 8,
                        alignItems: "center"
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4d5fff" }} />
                      <span style={{ fontSize: 13, color: "rgba(244,244,255,0.85)" }}>{item}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>No compliance items listed.</p>
                )}
              </div>
            </div>
          )}
          {tab === "finance" && subTab === "simulator" && (
            <VentureSimulator
              marketOpp={healthScore?.category_scores?.["Market Opportunity"] || 60}
              techFeas={healthScore?.category_scores?.["Technical Feasibility"] || 60}
              riskScore={healthScore?.category_scores?.["Risk"] || 60}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
