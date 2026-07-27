"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { StartupHealthScore, API_BASE } from "@/lib/api";

interface Props {
  sessionId: string;
  initialHealthScore: StartupHealthScore;
}

const CAT_COLORS: Record<string, string> = {
  "Market Opportunity": "#10b981",
  "Technical Feasibility": "#06b6d4",
  "Financial Viability": "#f59e0b",
  "Execution Readiness": "#9b6dff",
  "Competitive Advantage": "#ec4899",
  Risk: "#ef4444",
};

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
  const [displayed, setDisplayed] = useState(score);

  useEffect(() => {
    setDisplayed(score);
  }, [score]);

  return (
    <div style={{ position: "relative", width: 160, height: 160, margin: "0 auto" }}>
      <svg width="160" height="160" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="80" cy="80" r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10" />
        <circle
          cx="80" cy="80" r={R}
          fill="none"
          stroke={col.stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C - (score / 100) * C}
          style={{ 
            filter: `drop-shadow(0 0 12px ${col.shadow})`,
            transition: "stroke-dashoffset 0.15s ease-out, stroke 0.3s ease"
          }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{
          fontSize: 38, fontWeight: 800, letterSpacing: "-0.04em",
          color: col.text,
          textShadow: `0 0 24px ${col.shadow}`,
          lineHeight: 1,
        }}>
          {displayed}
        </span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4, fontWeight: 600 }}>
          / 100
        </span>
      </div>
    </div>
  );
}

export default function SandboxTab({ sessionId, initialHealthScore }: Props) {
  // Extract initial categories and baseline values
  const initScores = initialHealthScore.category_scores || {
    "Market Opportunity": 60,
    "Technical Feasibility": 60,
    "Financial Viability": 60,
    "Execution Readiness": 60,
    "Competitive Advantage": 60,
    Risk: 60,
  };

  const initialPenaltiesSum = initialHealthScore.penalties
    ? initialHealthScore.penalties.reduce((sum: number, p: any) => sum + p.points, 0)
    : 0;

  // Compute exact consensus adjustment applied originally
  const initWeightedSum =
    (initScores["Market Opportunity"] || 60) * 0.20 +
    (initScores["Technical Feasibility"] || 60) * 0.20 +
    (initScores["Financial Viability"] || 60) * 0.20 +
    (initScores["Execution Readiness"] || 60) * 0.15 +
    (initScores["Competitive Advantage"] || 60) * 0.15 +
    (initScores["Risk"] || 60) * 0.10;

  const consensusAdj = initialHealthScore.overall_score - Math.round(initWeightedSum - initialPenaltiesSum);

  // Sandbox modifiers state
  const [modifiers, setModifiers] = useState({
    "Market Opportunity": 1.0,
    "Technical Feasibility": 1.0,
    "Financial Viability": 1.0,
    "Execution Readiness": 1.0,
    "Competitive Advantage": 1.0,
    Risk: 1.0,
  });

  const [penaltyOverride, setPenaltyOverride] = useState<number>(initialPenaltiesSum);
  const [isSaving, setIsSaving] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Instantly recalculate scores locally for 60fps responsiveness
  const recalculatedCategories = {
    "Market Opportunity": Math.min(100, Math.max(0, Math.round((initScores["Market Opportunity"] || 60) * modifiers["Market Opportunity"]))),
    "Technical Feasibility": Math.min(100, Math.max(0, Math.round((initScores["Technical Feasibility"] || 60) * modifiers["Technical Feasibility"]))),
    "Financial Viability": Math.min(100, Math.max(0, Math.round((initScores["Financial Viability"] || 60) * modifiers["Financial Viability"]))),
    "Execution Readiness": Math.min(100, Math.max(0, Math.round((initScores["Execution Readiness"] || 60) * modifiers["Execution Readiness"]))),
    "Competitive Advantage": Math.min(100, Math.max(0, Math.round((initScores["Competitive Advantage"] || 60) * modifiers["Competitive Advantage"]))),
    Risk: Math.min(100, Math.max(0, Math.round((initScores["Risk"] || 60) * modifiers["Risk"]))),
  };

  const newWeightedSum =
    recalculatedCategories["Market Opportunity"] * 0.20 +
    recalculatedCategories["Technical Feasibility"] * 0.20 +
    recalculatedCategories["Financial Viability"] * 0.20 +
    recalculatedCategories["Execution Readiness"] * 0.15 +
    recalculatedCategories["Competitive Advantage"] * 0.15 +
    recalculatedCategories["Risk"] * 0.10;

  const overallScore = Math.min(100, Math.max(0, Math.round(newWeightedSum - penaltyOverride + consensusAdj)));
  const col = scoreColor(overallScore);
  const verdict = verdictLabel(overallScore);

  // Debounced persist endpoint call
  const persistRecalculation = useCallback((updatedMods: typeof modifiers, updatedPenalty: number) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    setIsSaving(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        await fetch(`${API_BASE}/api/board/session/${sessionId}/recalculate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            market_opp_modifier: updatedMods["Market Opportunity"],
            tech_feas_modifier: updatedMods["Technical Feasibility"],
            fin_viab_modifier: updatedMods["Financial Viability"],
            exec_read_modifier: updatedMods["Execution Readiness"],
            comp_adv_modifier: updatedMods["Competitive Advantage"],
            risk_modifier: updatedMods["Risk"],
            penalty_override: updatedPenalty,
          }),
        });
      } catch (err) {
        console.error("Failed to persist sandbox recalculation:", err);
      } finally {
        setIsSaving(false);
      }
    }, 800);
  }, [sessionId]);

  const handleModifierChange = (category: keyof typeof modifiers, val: number) => {
    const nextMods = { ...modifiers, [category]: val };
    setModifiers(nextMods);
    persistRecalculation(nextMods, penaltyOverride);
  };

  const handlePenaltyChange = (val: number) => {
    setPenaltyOverride(val);
    persistRecalculation(modifiers, val);
  };

  const resetSandbox = () => {
    const defaultMods = {
      "Market Opportunity": 1.0,
      "Technical Feasibility": 1.0,
      "Financial Viability": 1.0,
      "Execution Readiness": 1.0,
      "Competitive Advantage": 1.0,
      Risk: 1.0,
    };
    setModifiers(defaultMods);
    setPenaltyOverride(initialPenaltiesSum);
    persistRecalculation(defaultMods, initialPenaltiesSum);
  };

  const applyPreset = (presetMods: Record<keyof typeof modifiers, number>) => {
    setModifiers(presetMods);
    persistRecalculation(presetMods, penaltyOverride);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, alignItems: "start" }}>
      {/* Left: Interactive Modifiers Sliders */}
      <div className="card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Interactive Pivot Controls</h3>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
              Drag sliders or click a pivot preset to recalculate boardroom scores.
            </p>
          </div>
          <button 
            className="btn btn-outline" 
            onClick={resetSandbox}
            style={{ padding: "6px 12px", fontSize: 11 }}
          >
            Reset
          </button>
        </div>

        {/* Quick Pivot Presets */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          <button
            onClick={() => applyPreset({ "Market Opportunity": 1.3, "Technical Feasibility": 0.9, "Financial Viability": 1.4, "Execution Readiness": 1.1, "Competitive Advantage": 1.2, Risk: 0.9 })}
            style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(77,95,255,0.12)", border: "1px solid rgba(77,95,255,0.3)", color: "#a8b8ff", fontSize: 11, cursor: "pointer" }}
          >
            🚀 B2B Enterprise Pivot
          </button>
          <button
            onClick={() => applyPreset({ "Market Opportunity": 1.4, "Technical Feasibility": 1.2, "Financial Viability": 0.8, "Execution Readiness": 1.2, "Competitive Advantage": 0.9, Risk: 1.2 })}
            style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399", fontSize: 11, cursor: "pointer" }}
          >
            ⚡ Freemium B2C
          </button>
          <button
            onClick={() => applyPreset({ "Market Opportunity": 1.0, "Technical Feasibility": 0.85, "Financial Viability": 1.1, "Execution Readiness": 1.0, "Competitive Advantage": 1.3, Risk: 0.6 })}
            style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: 11, cursor: "pointer" }}
          >
            🛡️ Security First
          </button>
          <button
            onClick={() => applyPreset({ "Market Opportunity": 0.9, "Technical Feasibility": 1.25, "Financial Viability": 1.3, "Execution Readiness": 1.3, "Competitive Advantage": 1.0, Risk: 0.8 })}
            style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "#fbbf24", fontSize: 11, cursor: "pointer" }}
          >
            💰 Lean Bootstrap
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {Object.entries(modifiers).map(([cat, mod]) => {
            const color = CAT_COLORS[cat] || "#a8a8c0";
            const baseScore = initScores[cat] || 60;
            const updatedScore = recalculatedCategories[cat as keyof typeof recalculatedCategories];

            return (
              <div 
                key={cat}
                style={{
                  background: "rgba(255,255,255,0.01)",
                  border: "1px solid rgba(255,255,255,0.03)",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#f4f4ff" }}>{cat}</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                      Base: <strong style={{ color: "#fff" }}>{baseScore}</strong>
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 11, color, fontWeight: 700, marginRight: 8 }}>
                      {mod.toFixed(2)}x
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 800, color }}>
                      {updatedScore}
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={mod}
                  onChange={(e) => handleModifierChange(cat as keyof typeof modifiers, e.target.valueAsNumber)}
                  style={{
                    width: "100%",
                    accentColor: color,
                    cursor: "pointer",
                    height: 4,
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: 2
                  }}
                />
              </div>
            );
          })}

          {/* Penalty deduction control */}
          <div 
            style={{
              background: "rgba(255,255,255,0.01)",
              border: "1px solid rgba(255,255,255,0.03)",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#f4f4ff" }}>Penalty Points Deduction</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: 8 }}>
                  Base: <strong style={{ color: "#fff" }}>-{initialPenaltiesSum}</strong>
                </span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#ef4444" }}>
                -{penaltyOverride} pts
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={penaltyOverride}
              onChange={(e) => handlePenaltyChange(e.target.valueAsNumber)}
              style={{
                width: "100%",
                accentColor: "#ef4444",
                cursor: "pointer",
                height: 4,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 2
              }}
            />
          </div>
        </div>
      </div>

      {/* Right: Live Recalculated Score Gauge */}
      <div className="card" style={{ padding: "32px 24px", textAlign: "center", position: "relative" }}>
        {/* HUD Indicator */}
        <div style={{ 
          position: "absolute", top: 12, right: 16, 
          fontSize: 8, fontWeight: 700, color: isSaving ? "#9b6dff" : "rgba(255,255,255,0.25)",
          textTransform: "uppercase", letterSpacing: "0.08em",
          fontFamily: "monospace", display: "flex", alignItems: "center", gap: 4
        }}>
          {isSaving && <span className="led led-pulse" style={{ width: 4, height: 4, background: "#9b6dff" }} />}
          {isSaving ? "Syncing DB..." : "Synced"}
        </div>

        <div className="label-xs" style={{ marginBottom: 24 }}>Recalculated Score</div>
        <RadialRing score={overallScore} />

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

        <div 
          style={{
            marginTop: 24,
            padding: "16px",
            background: "rgba(255,255,255,0.01)",
            border: "1px solid rgba(255,255,255,0.04)",
            borderRadius: 12,
            textAlign: "left"
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "#f4f4ff", marginBottom: 6 }}>Recalculation Breakdown</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Weighted category avg:</span>
              <span style={{ color: "#fff", fontWeight: 600 }}>{newWeightedSum.toFixed(1)} / 100</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Applied penalties:</span>
              <span style={{ color: "#ef4444", fontWeight: 600 }}>-{penaltyOverride}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Debate consensus adjustment:</span>
              <span style={{ color: consensusAdj >= 0 ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                {consensusAdj >= 0 ? "+" : ""}{consensusAdj.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
