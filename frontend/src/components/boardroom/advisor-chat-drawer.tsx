"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, Bot, Volume2, VolumeX, Mic, MicOff } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { speakText, stopSpeaking, initializeDictation } from "@/lib/speech";

interface Message {
  sender: "user" | "advisor";
  text: string;
}

interface Props {
  role: string;
  sessionId: string;
  initialReasoning?: string;
  onClose: () => void;
  accentColor: string;
}

export default function AdvisorChatDrawer({ role, sessionId, initialReasoning, onClose, accentColor }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  
  const feedEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize with advisor's voting reason
  useEffect(() => {
    const initialMsgs: Message[] = [];
    if (initialReasoning) {
      initialMsgs.push({
        sender: "advisor",
        text: `My final vote is based on this stance: "${initialReasoning}". Let me know if you have any questions regarding my analysis.`,
      });
    } else {
      initialMsgs.push({
        sender: "advisor",
        text: `I'm ready. Let me know what specific questions you have about my domain's evaluation of this startup.`,
      });
    }
    setMessages(initialMsgs);
  }, [initialReasoning]);

  // Clean up speaking and recording on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      recognitionRef.current?.stop();
    };
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      const rec = initializeDictation(
        (transcript) => {
          setInputText((prev) => (prev ? prev + " " + transcript : transcript));
          setIsRecording(false);
        },
        (err) => {
          console.error("Dictation error:", err);
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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    // Stop speaking if user types a new question
    stopSpeaking();

    const userText = inputText.trim();
    setInputText("");
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/board/session/${sessionId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: role,
          message: userText,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to receive response from advisor");
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { sender: "advisor", text: data.message }]);
      speakText(data.message, role, isMuted);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { sender: "advisor", text: "Sorry, I encountered an error reflecting on that. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        maxWidth: 440,
        background: "rgba(6, 6, 16, 0.88)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
        borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "-10px 0 40px rgba(0,0,0,0.6)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        animation: "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Q&A with {role}</h3>
          <span style={{ fontSize: 10, color: accentColor, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Direct Cross-Examination
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto" }}>
          <button
            onClick={() => {
              const nextMute = !isMuted;
              setIsMuted(nextMute);
              if (nextMute) stopSpeaking();
              else {
                const lastAdvisorMsg = [...messages].reverse().find(m => m.sender === "advisor");
                if (lastAdvisorMsg) speakText(lastAdvisorMsg.text, role, false);
              }
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: isMuted ? "rgba(255, 255, 255, 0.35)" : accentColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title={isMuted ? "Enable Advisor Voice" : "Mute Advisor Voice"}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} style={{ filter: `drop-shadow(0 0 6px ${accentColor})` }} />}
          </button>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "rgba(255, 255, 255, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Chat Feed */}
      <div
        style={{
          flex: 1,
          padding: "24px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {messages.map((msg, idx) => {
          const isUser = msg.sender === "user";
          return (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "85%",
                  padding: "12px 16px",
                  borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: isUser ? "rgba(77, 95, 255, 0.15)" : "rgba(255, 255, 255, 0.03)",
                  border: isUser ? "1px solid rgba(77, 95, 255, 0.3)" : "1px solid rgba(255, 255, 255, 0.05)",
                  fontSize: 13,
                  color: "rgba(244, 244, 255, 0.9)",
                  lineHeight: 1.6,
                }}
              >
                {msg.text}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 8 }}>
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "16px 16px 16px 4px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                display: "flex",
                gap: 4,
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: accentColor,
                    animation: `blink 1.2s ${i * 0.2}s infinite ease-in-out`,
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{role} reflecting...</span>
          </div>
        )}
        <div ref={feedEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSend}
        style={{
          padding: "20px 24px",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          display: "flex",
          gap: 12,
        }}
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Ask the ${role} a question...`}
          disabled={isLoading}
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: "10px 16px",
            fontSize: 13,
            color: "#fff",
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={toggleRecording}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: isRecording ? "rgba(239, 68, 68, 0.12)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${isRecording ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}`,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isRecording ? "#ef4444" : "rgba(255,255,255,0.45)",
            transition: "all 0.2s"
          }}
          title={isRecording ? "Listening..." : "Dictate Question"}
        >
          {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
        </button>

        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: accentColor,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: isLoading || !inputText.trim() ? 0.4 : 1,
            transition: "opacity 0.2s",
          }}
        >
          <Send size={15} color="#fff" />
        </button>
      </form>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
