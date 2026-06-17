"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  FlaskConical,
  Lock,
  MapPin,
  Mic,
  MicOff,
  Paperclip,
  ShieldCheck,
  Wand2,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DEMO_DOCS, type DemoDoc } from "@/lib/demo-docs";
import { FileIntake } from "./file-intake";

/**
 * State 0 — the intake screen. Fills the viewport. Judge Demo Mode sits at the
 * top as a collapsible, horizontally-scrollable carousel to conserve vertical
 * space. Below it: the hero, a free-text area with voice dictation, an optional
 * location, and a document upload. Inputs are controlled by the orchestrator.
 */
export function IntakeView({
  text,
  onTextChange,
  file,
  onFileChange,
  location,
  onLocationChange,
  canSubmit,
  error,
  onSubmit,
  onLoadDemo,
}: {
  text: string;
  onTextChange: (v: string) => void;
  file: File | null;
  onFileChange: (f: File | null) => void;
  location: string;
  onLocationChange: (v: string) => void;
  canSubmit: boolean;
  error: string;
  onSubmit: () => void;
  onLoadDemo: (doc: DemoDoc) => void;
}) {
  const [demoOpen, setDemoOpen] = useState(true);

  // --- Voice intake (Web Speech API) ---
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!SR);
  }, []);

  function toggleVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) onTextChange((text ? text + " " : "") + transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-xl flex-col px-5 py-6">
      <header className="flex items-center justify-between">
        <Brand href="/" />
        <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <Lock className="h-4 w-4" /> No sign-in needed
        </span>
      </header>

      {/* Judge Demo Mode — collapsible, compact horizontal carousel */}
      <section className="mt-5 rounded-xl border-2 border-primary/40 bg-primary/5">
        <button
          type="button"
          onClick={() => setDemoOpen((o) => !o)}
          aria-expanded={demoOpen}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-primary"
        >
          <span className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide">
            <FlaskConical className="h-4 w-4" /> Judge Demo Mode
          </span>
          <ChevronDown
            className={"h-5 w-5 transition-transform " + (demoOpen ? "rotate-180" : "")}
          />
        </button>
        <AnimatePresence initial={false}>
          {demoOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <p className="px-4 text-sm text-muted-foreground">
                One tap loads a complex synthetic document and runs the full pipeline.
              </p>
              <div className="flex snap-x gap-2 overflow-x-auto px-4 pb-4 pt-3">
                {DEMO_DOCS.map((doc) => (
                  <button
                    key={doc.key}
                    type="button"
                    onClick={() => onLoadDemo(doc)}
                    title={doc.caption}
                    className="flex min-w-[8.5rem] shrink-0 snap-start flex-col gap-1 rounded-lg border border-white/70 bg-card p-3 text-left shadow-clay-sm transition-all hover:brightness-[1.02] active:translate-y-0.5"
                  >
                    <span className="text-sm font-bold text-foreground">{doc.label}</span>
                    <span className="text-xs leading-snug text-muted-foreground">
                      {doc.caption}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Hero */}
      <div className="mb-5 mt-7">
        <p className="text-base font-semibold text-primary">Paperwork, made plain</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
          Confusing letter? We&apos;ll explain it.
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Turn eviction notices, discharge papers, benefit letters, and bills into clear,
          plain-language steps. Describe your situation, paste the text, or upload a PDF
          or photo.
        </p>
      </div>

      {/* Intake form */}
      <Card>
        <div className="relative">
          <Textarea
            rows={6}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Type what you need help with — for example: 'I got this letter and I don't understand the deadline.' Or paste the text of a notice, bill, or form here…"
            aria-label="Describe what you need help with"
          />
          {voiceSupported && (
            <button
              type="button"
              onClick={toggleVoice}
              aria-label={listening ? "Stop dictation" : "Dictate with your voice"}
              aria-pressed={listening}
              className={
                "absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full shadow-clay-sm transition-all " +
                (listening
                  ? "animate-pulse bg-primary text-primary-foreground"
                  : "bg-card text-primary")
              }
            >
              {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          )}
        </div>

        <label className="mt-4 flex min-h-tap items-center gap-2 rounded-md bg-card px-3 text-base font-semibold shadow-clay-sm">
          <MapPin className="h-5 w-5 shrink-0 text-primary" />
          <input
            type="text"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="Your city/state (optional) — finds local support"
            aria-label="Your location (optional)"
            className="w-full bg-transparent py-2 font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground"
          />
        </label>

        <div className="mt-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Paperclip className="h-4 w-4" /> ADD A DOCUMENT (OPTIONAL)
          </div>
          <FileIntake file={file} onFile={onFileChange} />
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="overflow-hidden rounded-md bg-warning/15 p-3 text-base text-amber-800"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <Button size="lg" className="mt-6 w-full" onClick={onSubmit} disabled={!canSubmit}>
          <Wand2 className="h-5 w-5" /> Explain this for me
        </Button>
      </Card>

      <p className="mt-auto pt-6 text-center text-sm text-muted-foreground">
        <span className="flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-4 w-4" /> Stateless &amp; private — ClearAid stores
          nothing and never submits anything for you.
        </span>
      </p>
    </main>
  );
}
