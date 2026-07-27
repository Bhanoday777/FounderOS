"use client";

// Simple Voice mapping configuration for advisor characters
const ROLE_VOICE_CONFIGS: Record<string, { pitch: number; rate: number; lang?: string }> = {
  CEO: { pitch: 1.0, rate: 0.95 },
  CTO: { pitch: 0.8, rate: 0.85 },
  Investor: { pitch: 1.1, rate: 1.1 },
  "Product Manager": { pitch: 1.05, rate: 0.95 },
  "Marketing Strategist": { pitch: 1.15, rate: 1.05 },
  "Legal Advisor": { pitch: 0.9, rate: 0.85 },
  "Finance Advisor": { pitch: 0.85, rate: 0.9 },
  "Security Architect": { pitch: 0.75, rate: 0.85 },
  "UX Advisor": { pitch: 1.2, rate: 1.0 },
  "Competition Analyst": { pitch: 0.95, rate: 0.95 },
};

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speakText(text: string, role: string, isMuted: boolean) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  // Stop any active speech
  window.speechSynthesis.cancel();

  if (isMuted) return;

  // Strip markdown styling (asterisks, brackets, quotes) for cleaner TTS output
  const cleanText = text
    .replace(/[\*\_\`\-\#]/g, "")
    .replace(/\[.*?\]/g, "")
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  const config = ROLE_VOICE_CONFIGS[role] || { pitch: 1.0, rate: 1.0 };
  utterance.pitch = config.pitch;
  utterance.rate = config.rate;

  // Attempt to select an English voice matching gender preference if possible
  const voices = window.speechSynthesis.getVoices();
  const enVoices = voices.filter(v => v.lang.startsWith("en"));
  
  if (enVoices.length > 0) {
    if (role === "UX Advisor" || role === "Marketing Strategist") {
      // Prefer female-sounding voice or specific indices
      const femaleVoice = enVoices.find(v => v.name.toLowerCase().includes("zira") || v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("google"));
      if (femaleVoice) utterance.voice = femaleVoice;
    } else {
      const maleVoice = enVoices.find(v => v.name.toLowerCase().includes("david") || v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("microsoft"));
      if (maleVoice) utterance.voice = maleVoice;
    }
  }

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// Browser Web Speech Recognition dictation utility
export function initializeDictation(onResult: (text: string) => void, onError: (err: any) => void) {
  if (typeof window === "undefined") return null;

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn("Speech recognition is not supported in this browser.");
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onresult = (event: any) => {
    if (event.results && event.results[0]) {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    }
  };

  recognition.onerror = (event: any) => {
    onError(event);
  };

  return recognition;
}
