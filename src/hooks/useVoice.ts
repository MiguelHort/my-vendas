"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySpeechRecognition = any;

type UseVoiceOptions = {
  onTranscript: (text: string) => void;
  lang?: string;
};

export function useVoice({ onTranscript, lang = "pt-BR" }: UseVoiceOptions) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<AnySpeechRecognition>(null);
  // Keep a stable ref to the latest callback so we don't stale-close over it
  const callbackRef = useRef(onTranscript);
  callbackRef.current = onTranscript;

  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const start = useCallback(() => {
    if (!supported) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const Rec = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    const recognition = new Rec();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (e: AnySpeechRecognition) => {
      const text = e.results[0][0].transcript as string;
      callbackRef.current(text);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.start();
    recRef.current = recognition;
    setListening(true);
  }, [supported, lang]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  useEffect(() => () => recRef.current?.abort(), []);

  return { listening, start, stop, supported };
}

/** Read a Jacson response aloud (strips ** markdown). */
export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const clean = text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\n/g, " ");
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = "pt-BR";
  utterance.rate = 1.05;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
