"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { StartupHealthScore } from "@/lib/api";

function scoreColor(s: number) {
  if (s >= 70) return { stroke: "#10b981", text: "#10b981", shadow: "rgba(16,185,129,0.3)" };
  if (s >= 45) return { stroke: "#f59e0b", text: "#f59e0b", shadow: "rgba(245,158,11,0.3)" };
  return          { stroke: "#ef4444", text: "#ef4444", shadow: "rgba(239,68,68,0.3)" };
}

function verdictLabel(s: number) {
  if (s >= 80) return { label: "Strong Approve",   color: "#10b981" };
  if (s >= 65) return { label: "Conditional",      color: "#f59e0b" };
  if (s >= 45) return { label: "Mixed Signals",    color: "#f59e0b" };
  return              { label: "Board Rejects",    color: "#ef4444" };
}

function RadialRing({ score }: { score: number }) {
  const R = 68; const C = R * 2 * Math.PI;
  const col = scoreColor(score);
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const duration = 1200;
    const raf = (ts: number) => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * score));
      if (progress < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [score]);

  return (
    <div style={{ position: "relative", width: 180, height: 180, margin: "0 auto" }}>
      <svg width="180" height="180" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="90" cy="90" r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10" />
        <motion.circle
          cx="90" cy="90" r={R}
          fill="none"
          stroke={col.stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C - (score / 100) * C }}
          transition={{ duration: 1.2, ease: [0.16,1,0.3,1] }}
          style={{ filter: `drop-shadow(0 0 12px ${col.shadow})` }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{
          fontSize: 42, fontWeight: 800, letterSpacing: "-0.04em",
          color: col.text,
          textShadow: `0 0 24px ${col.shadow}`,
          lineHeight: 1,
        }}>
          {displayed}
        </span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4, fontWeight: 600 }}>
          / 100
        </span>
      </div>
    </div>
  );
}

const CAT_COLORS: Record<string, string> = {
  Innovation:  "#4d5fff",
  Execution:   "#9b6dff",
  Market:      "#10b981",
  Financial:   "#f59e0b",
  Technology:  "#06b6d4",
  Competition: "#ef4444",
};

interface Props { score: StartupHealthScore | null; }

export default function ScoreGauge({ score }: Props) {
  if (!score) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: 300, flexDirection: "column", gap: 12, opacity: 0.5,
      }}>
        <div style={{ fontSize: 32 }}>📊</div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Score will appear after voting concludes.</p>
      </div>
    );
  }

  const col     = scoreColor(score.overall_score);
  const verdict = verdictLabel(score.overall_score);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
      {/* Left: Radial */}
      <div className="card" style={{ padding: "32px 24px", textAlign: "center" }}>
        <div className="label-xs" style={{ marginBottom: 24 }}>Viability Score</div>
        <RadialRing score={score.overall_score} />

        <div style={{ marginTop: 24 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 16px", borderRadius: 9999,
            background: `${col.stroke}10`, border: `1px solid ${col.stroke}30`,
            fontSize: 13, fontWeight: 700, color: verdict.color,
          }}>
            {verdict.label}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 24 }}>
          {[
            { label: "Approval Rate", value: `${Math.round(score.approval_ratio * 100)}%`, color: "#10b981" },
            { label: "Avg Confidence", value: `${score.average_confidence}%`, color: "#4d5fff" },
          ].map((s) => (
            <div key={s.label} style={{
              padding: "12px", borderRadius: 12,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {score.explainable_scores?.["Overall Health"] && (
          <div style={{
            marginTop: 20,
            padding: "14px 16px",
            borderRadius: 12,
            background: "rgba(77,95,255,0.03)",
            border: "1px solid rgba(77,95,255,0.12)",
            textAlign: "left"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Overall Recommendation Summary</span>
              <span style={{
                fontSize: 8, fontWeight: 800,
                color: score.explainable_scores["Overall Health"].risk_level === "HIGH" ? "#ef4444" : score.explainable_scores["Overall Health"].risk_level === "MEDIUM" ? "#f59e0b" : "#10b981",
                textTransform: "uppercase"
              }}>
                {score.explainable_scores["Overall Health"].risk_level} RISK LEVEL
              </span>
            </div>
            <p style={{ fontSize: 11, color: "rgba(168,168,192,0.85)", lineHeight: 1.5, margin: 0, fontStyle: "italic" }}>
              "{score.explainable_scores["Overall Health"].reason}"
            </p>
          </div>
        )}
      </div>

      {/* Right: Category bars */}
      <div className="card" style={{ padding: "24px" }}>
        <div className="label-xs" style={{ marginBottom: 20 }}>Category Breakdown</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {Object.entries(score.category_scores || {}).map(([cat, val], i) => {
            const color = CAT_COLORS[cat] || "#a8a8c0";
            const detail = score.explainable_scores?.[cat];
            
            const riskColors: Record<string, { text: string; bg: string; border: string }> = {
              LOW:    { text: "#10b981", bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.18)" },
              MEDIUM: { text: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.18)"  },
              HIGH:   { text: "#ef4444", bg: "rgba(239,68,68,0.06)",  border: "rgba(239,68,68,0.18)"   },
            };
            const rc = riskColors[detail?.risk_level || "LOW"];

            return (
              <div 
                key={cat}
                style={{
                  background: "rgba(255,255,255,0.01)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  borderRadius: 12,
                  padding: 14,
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#f4f4ff" }}>{cat}</span>
                    {detail && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, color: rc.text,
                        background: rc.bg, border: `1px solid ${rc.border}`,
                        padding: "2px 6px", borderRadius: 4, textTransform: "uppercase"
                      }}>
                        {detail.risk_level} RISK
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color }}>{val}</span>
                </div>
                <div className="progress-bar-bg" style={{ marginBottom: 10 }}>
                  <motion.div
                    className="progress-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${val}%` }}
                    transition={{ delay: 0.1 * i + 0.2, duration: 0.8, ease: [0.16,1,0.3,1] }}
                    style={{
                      background: `linear-gradient(90deg, ${color}80, ${color})`,
                      boxShadow: `0 0 8px ${color}40`,
                    }}
                  />
                </div>
                {detail ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <p style={{ fontSize: 11, color: "rgba(168,168,192,0.85)", lineHeight: 1.5, margin: 0 }}>
                      {detail.reason}
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>
                        Confidence: <strong style={{ color: "#fff" }}>{detail.confidence}%</strong>
                      </span>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 11, color: "rgba(168,168,192,0.6)", lineHeight: 1.5, margin: 0 }}>
                    {score.score_explanations?.[cat] || "Standard evaluation metric."}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
