"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useBoardroomStream } from "@/lib/api";
import DebateFeed from "@/components/boardroom/debate-feed";
import VotePanel from "@/components/boardroom/vote-panel";
import ScoreGauge from "@/components/boardroom/score-gauge";
import SynthesisTabs from "@/components/boardroom/synthesis-tabs";
import SandboxTab from "@/components/boardroom/sandbox-tab";
import PitchDrill from "@/components/boardroom/pitch-drill";

const STATE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  INITIALIZED:       { label: "Initializing",      color: "#a8b8ff", bg: "rgba(74,95,255,0.08)"  },
  ROUND_1_ANALYSIS:  { label: "Round 1 — Analysis", color: "#9b6dff", bg: "rgba(155,109,255,0.08)" },
  ROUND_2_DEBATE:    { label: "Round 2 — Debate",   color: "#4d5fff", bg: "rgba(74,95,255,0.08)"  },
  ROUND_3_REVISION:  { label: "Round 3 — Consensus", color: "#3b82f6", bg: "rgba(59,130,246,0.08)"  },
  VOTING:            { label: "Executive Voting",   color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  SYNTHESIS:         { label: "Synthesizing",       color: "#10b981", bg: "rgba(16,185,129,0.08)" },
  COMPLETED:         { label: "Session Complete",   color: "#10b981", bg: "rgba(16,185,129,0.06)" },
  FAILED:            { label: "Session Failed",     color: "#ef4444", bg: "rgba(239,68,68,0.08)"  },
};

const TABS = [
  { id: "debate",    label: "Debate" },
  { id: "votes",     label: "Votes" },
  { id: "score",     label: "Score" },
  { id: "synthesis", label: "Report" },
  { id: "sandbox",   label: "Sandbox" },
  { id: "drill",     label: "Pitch Drill" },
];

export default function BoardroomPage() {
  const { id } = useParams<{ id: string }>();
  const { turns, votes, healthScore, synthesis, status, sessionState, activeAgents, advisorStates, error } =
    useBoardroomStream(id);

  const [activeTab, setActiveTab] = useState("debate");
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toUTCString().split(" ").slice(4, 5)[0] + " UTC");
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-advance tabs on state changes
  useEffect(() => {
    if (sessionState === "VOTING") setActiveTab("votes");
    if (sessionState === "SYNTHESIS") setActiveTab("synthesis");
    if (sessionState === "COMPLETED") setActiveTab("synthesis");
  }, [sessionState]);

  const stateInfo = STATE_LABELS[sessionState] || STATE_LABELS["INITIALIZED"];

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div style={{
          maxWidth: 440, width: "100%", textAlign: "center",
          padding: "48px 32px",
          background: "rgba(239,68,68,0.04)",
          border: "1px solid rgba(239,68,68,0.15)",
          borderRadius: 20,
        }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>⚠</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f4f4ff", marginBottom: 10 }}>Session Error</h3>
          <p style={{ fontSize: 13, color: "rgba(248,113,113,0.9)", lineHeight: 1.6, marginBottom: 24 }}>{error}</p>
          <Link href="/">
            <button className="btn btn-primary" style={{ width: "100%" }}>
              Back to Executive Center
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
      {/* ── Session Header ── */}
      <div style={{ marginBottom: 32, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="label-xs" style={{ marginBottom: 8, letterSpacing: "0.12em" }}>
            Board Session — {id?.slice(0, 8).toUpperCase()}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "4px 12px", borderRadius: 9999,
                background: stateInfo.bg,
                border: `1px solid ${stateInfo.color}30`,
                fontSize: 12, fontWeight: 600, color: stateInfo.color,
              }}
            >
              <span className="led led-pulse" style={{ background: stateInfo.color, boxShadow: `0 0 6px ${stateInfo.color}60` }} />
              {stateInfo.label}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <span className="mono" style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{clock}</span>
          <div style={{
            padding: "6px 14px", borderRadius: 10,
            background: "rgba(10,10,22,0.7)",
            border: "1px solid rgba(255,255,255,0.07)",
            fontSize: 11, color: "rgba(255,255,255,0.4)", maxWidth: 300,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {status}
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div style={{ marginBottom: 24 }}>
        <div className="tab-bar" style={{ display: "inline-flex" }}>
          {TABS.map((t) => {
            const locked =
              (t.id === "votes" && votes.length === 0) ||
              (t.id === "score" && !healthScore) ||
              (t.id === "synthesis" && !synthesis) ||
              (t.id === "sandbox" && !healthScore) ||
              (t.id === "drill" && !healthScore);
            return (
              <button
                key={t.id}
                className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
                onClick={() => !locked && setActiveTab(t.id)}
                style={{ opacity: locked ? 0.4 : 1, cursor: locked ? "not-allowed" : "pointer" }}
              >
                {t.label}
                {t.id === "debate" && turns.length > 0 && (
                  <span style={{
                    marginLeft: 4, padding: "1px 6px", borderRadius: 9999,
                    background: "rgba(74,95,255,0.2)", fontSize: 10, fontWeight: 700,
                    color: "#a8b8ff",
                  }}>
                    {turns.length}
                  </span>
                )}
                {t.id === "votes" && votes.length > 0 && (
                  <span style={{
                    marginLeft: 4, padding: "1px 6px", borderRadius: 9999,
                    background: "rgba(245,158,11,0.15)", fontSize: 10, fontWeight: 700,
                    color: "#fbbf24",
                  }}>
                    {votes.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Panels ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {activeTab === "debate"    && <DebateFeed turns={turns} sessionState={sessionState} activeAgents={activeAgents} advisorStates={advisorStates} />}
          {activeTab === "votes"     && <VotePanel votes={votes} />}
          {activeTab === "score"     && <ScoreGauge score={healthScore} />}
          {activeTab === "synthesis" && <SynthesisTabs synthesis={synthesis} sessionState={sessionState} turns={turns} healthScore={healthScore} />}
          {activeTab === "sandbox"   && healthScore && <SandboxTab sessionId={id} initialHealthScore={healthScore} />}
          {activeTab === "drill"     && healthScore && <PitchDrill sessionId={id} activeAgents={activeAgents} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
