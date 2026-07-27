"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, Play, Send, Shield, Zap, RefreshCw, Volume2, VolumeX, Mic, MicOff } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { speakText, stopSpeaking, initializeDictation } from "@/lib/speech";

interface Props {
  sessionId: string;
  activeAgents: string[];
}

interface RoundHistory {
  advisor: string;
  question: string;
  answer: string;
  reaction: string;
  change: number;
}

const ROLE_COLORS: Record<string, string> = {
  CEO: "#4d5fff",
  CTO: "#9b6dff",
  Investor: "#f59e0b",
  "Product Manager": "#10b981",
  "Marketing Strategist": "#ec4899",
  "Legal Advisor": "#a8a8c0",
  "Finance Advisor": "#3b82f6",
  "Security Architect": "#ef4444",
  "UX Advisor": "#06b6d4",
  "Competition Analyst": "#84cc16",
};

export default function PitchDrill({ sessionId, activeAgents }: Props) {
  const [isStarted, setIsStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  
  const [confidence, setConfidence] = useState(50);
  const [currentRound, setCurrentRound] = useState(1);
  const [activeAdvisor, setActiveAdvisor] = useState("");
  const [activeQuestion, setActiveQuestion] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [history, setHistory] = useState<RoundHistory[]>([]);

  const recognitionRef = useRef<any>(null);

  // Stop speaking and recording on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      recognitionRef.current?.stop();
    };
  }, []);

  // Dictation toggle
  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      const rec = initializeDictation(
        (transcript) => {
          setAnswerText((prev) => (prev ? prev + " " + transcript : transcript));
          setIsRecording(false);
        },
        (err) => {
          console.error("Speech recognition error:", err);
          setIsRecording(false);
        }
      );
      if (rec) {
        recognitionRef.current = rec;
        setIsRecording(true);
        rec.start();
      } else {
        alert("Speech input is not supported in this browser.");
      }
    }
  };

  // Begin Pitch Drill
  const startDrill = () => {
    stopSpeaking();
    const validRoles = ["Investor", "CTO", "CEO", "Product Manager", "Marketing Strategist", "Finance Advisor", "Legal Advisor"];
    const firstRole = activeAgents.find(r => validRoles.includes(r)) || activeAgents[0] || "Investor";
    
    const questions: Record<string, string> = {
      CEO: "What is your ultimate 5-year vision for this company? Are we building a lifestyle business or a venture-scale unicorn?",
      CTO: "What is the single biggest technical bottleneck or scaling bottleneck you expect to face in the next 6 months?",
      Investor: "What is your unique competitive moat? What stops a well-funded competitor from cloning this database overnight?",
      "Product Manager": "What does your early MVP look like? What is the single core feature we are launching to validate user engagement?",
      "Marketing Strategist": "What is your low-cost customer acquisition strategy to get your first 100 active users?",
      "Legal Advisor": "How do you plan to navigate compliance and data privacy regulations in your target markets?",
      "Finance Advisor": "How do you plan to achieve unit economic profitability? What are your expected gross margins?",
    };

    const firstQuestion = questions[firstRole] || "What is your primary go-to-market strategy?";

    setActiveAdvisor(firstRole);
    setActiveQuestion(firstQuestion);
    setIsStarted(true);
    setIsCompleted(false);
    setConfidence(50);
    setCurrentRound(1);
    setHistory([]);
    setAnswerText("");

    // Speak initial question
    speakText(firstQuestion, firstRole, isMuted);
  };

  // Submit Answer
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerText.trim() || isLoading) return;

    stopSpeaking();
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/board/session/${sessionId}/drill/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: activeAdvisor,
          question: activeQuestion,
          answer: answerText.trim(),
          current_confidence: confidence,
        }),
      });

      if (!res.ok) throw new Error("Failed to evaluate answer");

      const data = await res.json();

      // Update history
      const newRound: RoundHistory = {
        advisor: activeAdvisor,
        question: activeQuestion,
        answer: answerText.trim(),
        reaction: data.reaction,
        change: data.confidence_change,
      };

      setHistory((prev) => [...prev, newRound]);
      setConfidence(data.new_confidence);

      // Queue speech feedback (Critique reaction + next question)
      speakText(data.reaction, activeAdvisor, isMuted);

      // Check if finished (after 3 rounds or if no more roles)
      if (currentRound >= 3 || !data.next_role) {
        setIsCompleted(true);
        speakText("Pitch session complete. I have updated the final board confidence scores.", "CEO", isMuted);
      } else {
        setActiveAdvisor(data.next_role);
        setActiveQuestion(data.next_question);
        setCurrentRound((r) => r + 1);
        setAnswerText("");

        // Speak the next question
        speakText(data.next_question, data.next_role, isMuted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const accentColor = ROLE_COLORS[activeAdvisor] || "#4d5fff";

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      {/* ────────────────────────────────────────────────────────
          STATE 1: INTRO SCREEN
          ──────────────────────────────────────────────────────── */}
      {!isStarted && (
        <div className="card" style={{ padding: "40px 32px", textAlign: "center" }}>
          <div style={{
            width: 54, height: 54, borderRadius: 16,
            background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
            boxShadow: "0 0 20px rgba(124,58,237,0.15)"
          }}>
            <Shield size={24} color="#9b6dff" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 12 }}>
            Enter the Executive Pitch Room
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, maxWidth: 500, margin: "0 auto 28px" }}>
            Test your pitch readiness by answering direct, domain-specific questions from the board advisors.
            Your answers will determine the live **Board Confidence Meter**.
          </p>

          <button className="btn btn-primary" onClick={startDrill} style={{ gap: 8 }}>
            <Play size={14} fill="#fff" />
            Begin Pitch Drill
          </button>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          STATE 2: ACTIVE DRILL
          ──────────────────────────────────────────────────────── */}
      {isStarted && !isCompleted && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Live Confidence HUD */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span className="mono" style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>
                Drill Round {currentRound} of 3
              </span>
              <span style={{ fontSize: 14, fontWeight: 800, color: confidence >= 70 ? "#10b981" : confidence >= 45 ? "#f59e0b" : "#ef4444" }}>
                Board Confidence: {confidence}%
              </span>
            </div>
            <div className="progress-bar-bg" style={{ height: 6 }}>
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${confidence}%`, 
                  background: confidence >= 70 ? "#10b981" : confidence >= 45 ? "#f59e0b" : "#ef4444",
                  transition: "width 0.4s ease-out, background 0.4s ease"
                }} 
              />
            </div>
          </div>

          {/* Active Question Box */}
          <div className="card" style={{ padding: "28px 24px", position: "relative", overflow: "hidden" }}>
            {/* Corner accent */}
            <div style={{
              position: "absolute", top: 0, left: 0, width: 4, bottom: 0,
              background: accentColor
            }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {activeAdvisor}
                </span>
                <span className="led led-pulse" style={{ width: 4, height: 4, background: accentColor }} />
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextMute = !isMuted;
                  setIsMuted(nextMute);
                  if (nextMute) stopSpeaking();
                  else speakText(activeQuestion, activeAdvisor, false);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: isMuted ? "rgba(255, 255, 255, 0.25)" : accentColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 2
                }}
                title={isMuted ? "Enable Voice Question" : "Mute Question"}
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} style={{ filter: `drop-shadow(0 0 4px ${accentColor})` }} />}
              </button>
            </div>

            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#f4f4ff", lineHeight: 1.6 }}>
              "{activeQuestion}"
            </h3>
          </div>

          {/* User Answer Input Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Type your strategic defense here (mention metrics or specific outcomes for better ratings)..."
              disabled={isLoading}
              rows={4}
              required
              style={{
                width: "100%",
                background: "rgba(10,10,24,0.65)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: "16px",
                fontSize: 13,
                color: "#fff",
                outline: "none",
                lineHeight: 1.6,
                resize: "none"
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, alignSelf: "flex-end" }}>
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isLoading}
                className="btn"
                style={{
                  background: isRecording ? "rgba(239, 68, 68, 0.12)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${isRecording ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}`,
                  color: isRecording ? "#ef4444" : "rgba(255,255,255,0.7)",
                  gap: 8,
                  fontSize: 12,
                  padding: "8px 16px",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center"
                }}
                title={isRecording ? "Listening..." : "Dictate Response"}
              >
                {isRecording ? <MicOff size={13} /> : <Mic size={13} />}
                {isRecording ? "Listening..." : "Speak Defense"}
              </button>

              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isLoading || !answerText.trim()}
                style={{ 
                  gap: 8,
                  fontSize: 12,
                  padding: "8px 20px",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center"
                }}
              >
                {isLoading ? (
                  <>Evaluating Answer...</>
                ) : (
                  <>
                    <Send size={13} color="#fff" />
                    Submit Defense
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          STATE 3: COMPLETED REPORT CARD
          ──────────────────────────────────────────────────────── */}
      {isStarted && isCompleted && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Final Score Header */}
          <div className="card" style={{ padding: "32px 24px", textAlign: "center" }}>
            <div style={{
              width: 50, height: 50, borderRadius: "50%",
              background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px"
            }}>
              <CheckCircle size={22} color="#10b981" />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
              Pitch Session Complete
            </h2>
            
            <div style={{ display: "inline-block", margin: "16px 0" }}>
              <div style={{
                fontSize: 48, fontWeight: 900,
                color: confidence >= 70 ? "#10b981" : confidence >= 45 ? "#f59e0b" : "#ef4444"
              }}>
                {confidence}%
              </div>
              <span className="label-xs" style={{ letterSpacing: "0.08em" }}>Board Confidence Rating</span>
            </div>

            <div style={{ marginTop: 12 }}>
              <button className="btn btn-outline" onClick={startDrill} style={{ gap: 8, margin: "0 auto" }}>
                <RefreshCw size={12} />
                Restart Pitch Drill
              </button>
            </div>
          </div>

          {/* Drill Recap Feed */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="label-xs">Boardroom Response Summary</div>
            
            {history.map((item, idx) => {
              const color = ROLE_COLORS[item.advisor] || "#a8a8c0";
              const isPositive = item.change >= 0;

              return (
                <div key={idx} className="card" style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {item.advisor}
                    </span>
                    <span style={{ 
                      fontSize: 11, fontWeight: 700, 
                      color: isPositive ? "#10b981" : "#ef4444",
                      background: isPositive ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
                      border: `1px solid ${isPositive ? "rgba(16,185,129,0.18)" : "rgba(239,68,68,0.18)"}`,
                      padding: "2px 8px", borderRadius: 4
                    }}>
                      {isPositive ? "+" : ""}{item.change} Confidence
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
                    <div>
                      <strong style={{ color: "rgba(255,255,255,0.3)" }}>Q: </strong>
                      <span style={{ color: "#fff", fontStyle: "italic" }}>"{item.question}"</span>
                    </div>
                    <div>
                      <strong style={{ color: "rgba(255,255,255,0.3)" }}>A: </strong>
                      <span style={{ color: "rgba(255,255,255,0.7)" }}>{item.answer}</span>
                    </div>
                    <div style={{
                      padding: "10px 12px", borderRadius: 8,
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.04)",
                      marginTop: 4
                    }}>
                      <strong style={{ color }}>Critique: </strong>
                      <span style={{ color: "rgba(244,244,255,0.85)" }}>{item.reaction}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
