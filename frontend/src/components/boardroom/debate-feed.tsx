"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { DebateTurn } from "@/lib/api";
import HolographicBoardroom from "./holographic-boardroom";
import AdvisorChatDrawer from "./advisor-chat-drawer";
import { 
  Briefcase, Cpu, TrendingUp, Layers, Megaphone, Scale, Coins, ShieldAlert, Palette, Compass, Bot, Volume2, VolumeX 
} from "lucide-react";

const ROLE_CONFIG: Record<string, {
  icon: any; label: string;
  accent: string; border: string; glow: string;
}> = {
  CEO:                     { icon: Briefcase,   label: "Chief Executive",      accent: "#4d5fff", border: "rgba(74,95,255,0.2)",   glow: "rgba(74,95,255,0.08)"  },
  CTO:                     { icon: Cpu,         label: "Chief Technology",     accent: "#9b6dff", border: "rgba(155,109,255,0.2)", glow: "rgba(155,109,255,0.08)" },
  Investor:                { icon: TrendingUp,  label: "Lead Investor",        accent: "#f59e0b", border: "rgba(245,158,11,0.2)",  glow: "rgba(245,158,11,0.06)"  },
  "Product Manager":       { icon: Layers,      label: "Product Manager",      accent: "#10b981", border: "rgba(16,185,129,0.2)",  glow: "rgba(16,185,129,0.06)"  },
  "Marketing Strategist":  { icon: Megaphone,   label: "Marketing Strategist", accent: "#ec4899", border: "rgba(236,72,153,0.2)",  glow: "rgba(236,72,153,0.06)"  },
  "Legal Advisor":         { icon: Scale,       label: "Legal Advisor",        accent: "#a8a8c0", border: "rgba(168,168,192,0.2)", glow: "rgba(168,168,192,0.06)" },
  "Finance Advisor":       { icon: Coins,       label: "Finance Advisor",      accent: "#3b82f6", border: "rgba(59,130,246,0.2)",  glow: "rgba(59,130,246,0.06)"  },
  "Security Architect":    { icon: ShieldAlert, label: "Security Architect",   accent: "#ef4444", border: "rgba(239,68,68,0.2)",   glow: "rgba(239,68,68,0.06)"   },
  "UX Advisor":            { icon: Palette,     label: "UX Advisor",           accent: "#06b6d4", border: "rgba(6,182,212,0.2)",   glow: "rgba(6,182,212,0.06)"   },
  "Competition Analyst":   { icon: Compass,     label: "Competition Analyst",  accent: "#84cc16", border: "rgba(132,204,22,0.2)",  glow: "rgba(132,204,22,0.06)"  },
};

function RoleAvatar({ role, size = 36 }: { role: string; size?: number }) {
  const cfg = ROLE_CONFIG[role] || { icon: Bot, label: role, accent: "#a8a8c0", border: "rgba(168,168,192,0.2)", glow: "transparent" };
  const Icon = cfg.icon;
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.3),
      background: `${cfg.accent}14`,
      border: `1px solid ${cfg.border}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
      boxShadow: `0 0 12px ${cfg.glow}`,
    }}>
      <Icon size={size * 0.43} style={{ color: cfg.accent }} />
    </div>
  );
}

function speakText(text: string, role: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  const pitchMap: Record<string, number> = {
    CEO: 1.0, CTO: 1.1, Investor: 0.9, "Product Manager": 1.05,
    "Marketing Strategist": 1.2, "Legal Advisor": 0.85, "Finance Advisor": 0.95,
    "Security Architect": 0.8, "UX Advisor": 1.15, "Competition Analyst": 1.0
  };
  utterance.pitch = pitchMap[role] || 1.0;
  window.speechSynthesis.speak(utterance);
}

function MessageCard({ turn, index }: { turn: DebateTurn; index: number }) {
  const cfg = ROLE_CONFIG[turn.role] || { accent: "#a8a8c0", border: "rgba(168,168,192,0.15)", glow: "transparent", label: turn.role };
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSpeak = () => {
    if (isPlaying) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
    } else {
      speakText(turn.content, turn.role);
      setIsPlaying(true);
      setTimeout(() => setIsPlaying(false), Math.min(15000, turn.content.length * 60));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: "flex", gap: 14, alignItems: "flex-start" }}
    >
      <RoleAvatar role={turn.role} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Bubble header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: cfg.accent }}>{turn.role}</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>
              · Round {turn.round}
            </span>
          </div>

          <button
            onClick={handleSpeak}
            title={isPlaying ? "Stop Voice" : "Listen to Advisor Voice"}
            style={{
              background: isPlaying ? `${cfg.accent}25` : "rgba(255,255,255,0.04)",
              border: `1px solid ${isPlaying ? cfg.accent : "rgba(255,255,255,0.08)"}`,
              borderRadius: 6,
              padding: "3px 7px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              color: isPlaying ? cfg.accent : "rgba(255,255,255,0.5)",
              transition: "all 0.15s ease",
            }}
          >
            {isPlaying ? <VolumeX size={12} /> : <Volume2 size={12} />}
            <span>{isPlaying ? "Speaking..." : "Voice"}</span>
          </button>
        </div>

        {/* Message */}
        <div style={{
          background: "rgba(10,10,22,0.65)",
          border: `1px solid ${cfg.border}`,
          borderRadius: "12px 12px 12px 4px",
          padding: "14px 16px",
          fontSize: 13,
          color: "rgba(244,244,255,0.9)",
          lineHeight: 1.7,
          boxShadow: `0 4px 20px ${cfg.glow}`,
          position: "relative",
        }}>
          <div style={{
            position: "absolute", inset: 0, borderRadius: "inherit",
            background: `radial-gradient(circle at 0% 0%, ${cfg.glow}, transparent 60%)`,
            pointerEvents: "none",
          }} />
          <span style={{ position: "relative" }}>{turn.content}</span>
        </div>
      </div>
    </motion.div>
  );
}

function AssemblyCard({ role, config }: { role: string; config: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 14px",
        background: "rgba(10,10,22,0.6)",
        border: `1px solid ${config.border}`,
        borderRadius: 14,
      }}
    >
      <RoleAvatar role={role} size={32} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: config.accent }}>{role}</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{config.label}</div>
      </div>
      <div style={{ marginLeft: "auto" }}>
        <span className="led led-green led-pulse" />
      </div>
    </motion.div>
  );
}

interface Props {
  turns: DebateTurn[];
  sessionState: string;
  activeAgents?: string[];
  advisorStates?: Record<string, { state: string; details: string }>;
}



export default function DebateFeed({ turns, sessionState, activeAgents = [], advisorStates = {} }: Props) {
  const { id: sessionId } = useParams<{ id: string }>();
  const [activeChatRole, setActiveChatRole] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length]);

  const isIdle = !["ROUND_1_ANALYSIS", "ROUND_2_DEBATE"].includes(sessionState) && turns.length === 0;

  if (isIdle) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minHeight: 320, textAlign: "center", padding: 32,
      }}>
        {/* Assembly cards */}
        <div style={{ marginBottom: 32, width: "100%", maxWidth: 480 }}>
          <div className="label-xs" style={{ marginBottom: 16 }}>Assembling Board</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
            {activeAgents.length > 0 ? (
              activeAgents.map((role) => {
                const cfg = ROLE_CONFIG[role] || { icon: Bot, label: role, accent: "#a8a8c0", border: "rgba(168,168,192,0.2)", glow: "transparent" };
                return <AssemblyCard key={role} role={role} config={cfg} />;
              })
            ) : (
              Object.entries(ROLE_CONFIG).slice(0, 4).map(([role, cfg]) => (
                <AssemblyCard key={role} role={role} config={cfg} />
              ))
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1.2s linear infinite" }}>
            <circle cx="12" cy="12" r="10" stroke="rgba(74,95,255,0.2)" strokeWidth="3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#4d5fff" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 13, color: "rgba(168,168,192,0.7)" }}>
            Initializing executive session…
          </span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const round1 = turns.filter(t => t.round === 1);
  const round2 = turns.filter(t => t.round === 2);
  const round3 = turns.filter(t => t.round === 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Live active members projection */}
      {activeAgents.length > 0 && (
        <HolographicBoardroom 
          activeAgents={activeAgents} 
          advisorStates={advisorStates} 
          turns={turns} 
          onSelectAdvisor={(role) => setActiveChatRole(role)}
        />
      )}

      {/* Round 1 */}
      {round1.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div className="sep-label" style={{ marginBottom: 20 }}>
            Round 1 — Independent Analysis
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {round1.map((turn, i) => (
              <MessageCard key={turn.id} turn={turn} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Round 2 */}
      {round2.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div className="sep-label" style={{ marginBottom: 20 }}>
            Round 2 — Cross-Examination
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {round2.map((turn, i) => (
              <MessageCard key={turn.id} turn={turn} index={round1.length + i} />
            ))}
          </div>
        </div>
      )}

      {/* Round 3 */}
      {round3.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div className="sep-label" style={{ marginBottom: 20 }}>
            Round 3 — Consensus & Synthesis
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {round3.map((turn, i) => (
              <MessageCard key={turn.id} turn={turn} index={round1.length + round2.length + i} />
            ))}
          </div>
        </div>
      )}

      {/* Typing indicator while active */}
      <AnimatePresence>
        {["ROUND_1_ANALYSIS", "ROUND_2_DEBATE", "ROUND_3_REVISION"].includes(sessionState) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 9, background: "rgba(74,95,255,0.1)",
              border: "1px solid rgba(74,95,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {[0,1,2].map(d => (
                <span key={d} style={{
                  display: "inline-block", width: 3, height: 3, borderRadius: "50%",
                  background: "#4d5fff", margin: "0 1.5px",
                  animation: `blink 1.2s ${d * 0.2}s ease-in-out infinite`,
                }} />
              ))}
            </div>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              {(() => {
                const currentSpeaking = activeAgents.find(r => advisorStates[r]?.state === "THINKING" || advisorStates[r]?.state === "SPEAKING");
                return currentSpeaking ? `${currentSpeaking} deliberating...` : "Advisor deliberating...";
              })()}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={bottomRef} />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100% { opacity: 0.2; } 50% { opacity: 1; } }
      `}</style>

      {activeChatRole && (
        <AdvisorChatDrawer
          role={activeChatRole}
          sessionId={sessionId as string}
          onClose={() => setActiveChatRole(null)}
          accentColor={ROLE_CONFIG[activeChatRole]?.accent || "#4d5fff"}
        />
      )}
    </div>
  );
}
