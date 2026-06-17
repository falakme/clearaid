"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Mic, X } from "lucide-react";

const BAR_COUNT = 36;
const IDLE = new Array(BAR_COUNT).fill(0.08);

/**
 * Immersive, full-screen "voice mode" — a split-screen experience inspired by
 * Gemini Live. One half is a live audio visualizer (a ring of bars + a pulsing
 * orb that react to the microphone in real time via the Web Audio API); the
 * other half shows the running transcript and the confirm / cancel controls.
 *
 * Speech-to-text uses the Web Speech API; the visualizer uses an AnalyserNode
 * over a getUserMedia stream, with a graceful animated fallback if mic access
 * for the analyser is unavailable.
 */
export function VoiceMode({
  open,
  onClose,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  onComplete: (text: string) => void;
}) {
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [levels, setLevels] = useState<number[]>(IDLE);

  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const finalRef = useRef("");

  const stopAll = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setLevels(IDLE);
  }, []);

  useEffect(() => {
    if (!open) return;
    finalRef.current = "";
    setTranscript("");
    setInterim("");

    // --- Speech-to-text ---
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.lang = "en-US";
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
    }

    // --- Audio visualizer (with animated fallback) ---
    let cancelled = false;
    const startFallback = () => {
      let t = 0;
      const loop = () => {
        t += 0.16;
        setLevels(
          Array.from({ length: BAR_COUNT }, (_, i) =>
            Math.min(1, 0.18 + 0.55 * Math.abs(Math.sin(t + i * 0.45)) * (0.6 + Math.random() * 0.4)),
          ),
        );
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    };

    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new Ctx();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const loop = () => {
          analyser.getByteFrequencyData(data);
          const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
            const idx = Math.floor((i / BAR_COUNT) * (data.length * 0.7));
            return Math.max(0.08, data[idx] / 255);
          });
          setLevels(bars);
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      })
      .catch(() => {
        if (!cancelled) startFallback();
      });

    return () => {
      cancelled = true;
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function done() {
    const text = `${finalRef.current} ${interim}`.replace(/\s+/g, " ").trim();
    stopAll();
    onComplete(text);
    onClose();
  }

  function cancel() {
    stopAll();
    onClose();
  }

  const energy = levels.reduce((a, b) => a + b, 0) / levels.length;
  const shown = `${transcript} ${interim}`.trim();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex flex-col bg-slate-950 text-white lg:flex-row"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Half 1 — reactive visualizer */}
          <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-700">
            {/* Pulsing orb */}
            <motion.div
              className="absolute h-56 w-56 rounded-full bg-white/20 blur-2xl"
              animate={{ scale: 1 + energy * 0.9, opacity: 0.4 + energy * 0.5 }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
            />
            <motion.div
              className="absolute h-72 w-72 rounded-full border border-white/20"
              animate={{ scale: 1 + energy * 0.5 }}
              transition={{ type: "spring", stiffness: 90, damping: 20 }}
            />

            {/* Wave bars */}
            <div className="relative flex h-44 items-center justify-center gap-[3px] px-8">
              {levels.map((l, i) => (
                <span
                  key={i}
                  className="w-1.5 rounded-full bg-white"
                  style={{
                    height: `${Math.max(6, l * 100)}%`,
                    opacity: 0.55 + l * 0.45,
                    transition: "height 90ms linear, opacity 90ms linear",
                  }}
                />
              ))}
            </div>

            <div className="absolute bottom-6 flex items-center gap-2 text-sm font-semibold text-white/80">
              <Mic className="h-4 w-4" /> Listening…
            </div>
          </div>

          {/* Half 2 — transcript + controls */}
          <div className="flex flex-1 flex-col p-6 sm:p-10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold uppercase tracking-wide text-white/60">
                Speak your situation
              </p>
              <button
                type="button"
                onClick={cancel}
                aria-label="Close voice mode"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 flex-1 overflow-y-auto">
              {shown ? (
                <p className="text-2xl font-medium leading-snug">
                  {transcript}{" "}
                  <span className="text-white/50">{interim}</span>
                </p>
              ) : (
                <p className="text-2xl font-medium leading-snug text-white/40">
                  Start talking, for example: &ldquo;I got a letter saying I have three days
                  to pay my rent or leave.&rdquo;
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={cancel}
                className="rounded-md px-5 py-3 text-base font-bold text-white/70 transition-colors hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={done}
                disabled={!shown}
                className="flex items-center gap-2 rounded-md bg-white px-6 py-3 text-base font-extrabold text-slate-900 shadow-lg transition-all active:translate-y-0.5 disabled:opacity-40"
              >
                <Check className="h-5 w-5" /> Use this
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
