"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SynthesisResult } from "@/lib/api";
import { 
  FileText, Server, ShieldAlert, Map, ChevronRight, Coins, 
  Megaphone, Scale, Palette, ShieldCheck, Compass, CheckCircle2, 
  TrendingUp, AlertTriangle 
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

interface Props {
  synthesis: SynthesisResult | null;
  sessionState: string;
}

const TABS = [
  { id: "strategy", label: "Executive & Strategy", icon: FileText   },
  { id: "product",  label: "Product & Engineering", icon: Map        },
  { id: "finance",  label: "Finance & Governance",  icon: Coins      },
];

export default function SynthesisTabs({ synthesis, sessionState }: Props) {
  const [tab, setTab] = useState("strategy");
  const [subTab, setSubTab] = useState("summary");

  const isSynthesizing = sessionState === "SYNTHESIS" && !synthesis;

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
      {/* Category Tabs */}
      <div className="tab-bar" style={{ marginBottom: 16, display: "inline-flex" }}>
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
            hasParsedSummary ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {summarySections["Startup Summary"] && (
                  <div className="card" style={{ padding: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                      Startup Summary
                    </div>
                    <p style={{ fontSize: 13, color: "rgba(244,244,255,0.9)", lineHeight: 1.6 }}>
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

          {tab === "strategy" && subTab === "investor" && (
            <div className="card" style={{ padding: "24px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <TrendingUp size={16} style={{ color: "#f59e0b" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Investment Memorandum
                </span>
              </div>
              <p style={{ fontSize: 13, color: "rgba(244,244,255,0.85)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                {synthesis.investment_memo}
              </p>
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
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
