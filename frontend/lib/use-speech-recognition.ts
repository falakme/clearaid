"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Thin wrapper around the Web Speech API (SpeechRecognition).
 *
 * Starts continuous, interim-result recognition for `lang` on mount and stops
 * it on unmount (or via the returned `stop`). Finalized chunks accumulate in a
 * ref; `value` is the live final-plus-interim transcript, whitespace-collapsed.
 * Everything is client-side and offline — no network.
 */
export interface SpeechRecognitionState {
  /** Finalized transcript so far (trimmed). */
  transcript: string;
  /** The current, not-yet-finalized chunk. */
  interim: string;
  /** Convenience: `${transcript} ${interim}` collapsed and trimmed. */
  value: string;
  /** Stop recognition and release the engine. Safe to call multiple times. */
  stop: () => void;
}

export function useSpeechRecognition(lang: string): SpeechRecognitionState {
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<any>(null);
  const finalRef = useRef("");

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    finalRef.current = "";
    setTranscript("");
    setInterim("");

    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e: any) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalRef.current += res[0].transcript + " ";
        else interimText += res[0].transcript;
      }
      setTranscript(finalRef.current.trim());
      setInterim(interimText);
    };
    rec.onerror = () => {};
    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      /* already started */
    }

    return () => {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, [lang]);

  const value = `${finalRef.current} ${interim}`.replace(/\s+/g, " ").trim();
  return { transcript, interim, value, stop };
}
