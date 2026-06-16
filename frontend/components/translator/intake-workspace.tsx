"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Baby, FlaskConical, Languages, Mic, MicOff, Paperclip, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { phaseFade } from "@/lib/motion";
import { translateForm, ApiError } from "@/lib/api";
import { LANGUAGES } from "@/lib/languages";
import { TEST_MODE, DEMO_DOCS } from "@/lib/test-mode";
import type { TranslateResult } from "@/lib/types";
import { FileIntake } from "./file-intake";
import { TranslatorResult } from "./translator-result";
import { TranslatorSkeleton } from "./translator-skeleton";

type Phase = "input" | "loading" | "result" | "error";

interface Props {
  docType: "emergency" | "general";
  storageKey: string;
  title?: string;
  subtitle?: string;
  accentClassName?: string;
}

/**
 * Unified document-intake surface for /emergency and /dashboard.
 *
 * Controls: free-text area (+ voice dictation), drag-drop / camera upload,
 * an ELI5 toggle, an output-language selector, and (in TEST_MODE) synthetic
 * demo-document loaders. The typed context AND the uploaded document are sent
 * together to the backend; ELI5/language are forwarded to the AI prompt and
 * toggling them on the result re-fetches the translation.
 */
export function IntakeWorkspace({
  docType,
  storageKey,
  title = "What do you need help with today?",
  subtitle = "Describe your situation in your own words, paste a letter or bill, or add a photo or PDF of a document. ClearAid reads it and explains it in plain language.",
  accentClassName = "text-primary",
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [error, setError] = useState("");
  const [eli5, setEli5] = useState(false);
  const [language, setLanguage] = useState<string>("English");

  // --- Voice intake (Web Speech API) ---
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!SR);
  }, []);

  function toggleVoice() {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
      if (transcript) setText((prev) => (prev ? prev + " " : "") + transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  const canSubmit = !!file || text.trim().length > 0;

  const runTranslate = useCallback(
    async (opts?: { eli5?: boolean; language?: string }) => {
      if (!file && text.trim().length === 0) return;
      setPhase("loading");
      setError("");
      try {
        const res = await translateForm({
          text,
          file,
          docType,
          eli5: opts?.eli5 ?? eli5,
          language: opts?.language ?? language,
        });
        setResult(res);
        setPhase("result");
      } catch (e) {
        const msg =
          e instanceof ApiError
            ? e.status === 503
              ? "The AI service isn't configured yet. Add an NVIDIA_API_KEY to the backend."
              : e.status === 502
                ? "ClearAid had trouble reading that. Please try again."
                : e.status === 422 || e.status === 413
                  ? e.message
                  : `Translation failed (${e.status}). Please try again.`
            : "Something went wrong reaching the translator.";
        setError(msg);
        setPhase("error");
      }
    },
    [file, text, docType, eli5, language],
  );

  // Toggling ELI5 / changing language on the result RE-FETCHES the translation.
  function handleEli5(next: boolean) {
    setEli5(next);
    if (phase === "result") runTranslate({ eli5: next });
  }
  function handleLanguage(next: string) {
    setLanguage(next);
    if (phase === "result") runTranslate({ language: next });
  }

  const originalText = file
    ? `${text ? text + "\n\n" : ""}Uploaded document: ${file.name}`
    : text;

  const motionProps = {
    variants: phaseFade,
    initial: "hidden" as const,
    animate: "show" as const,
    exit: "exit" as const,
  };

  // Controls row reused on both the input form and the result view.
  const controls = (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => handleEli5(!eli5)}
        aria-pressed={eli5}
        className={
          "flex min-h-tap items-center gap-2 rounded-md px-4 text-base font-bold shadow-clay-sm transition-all " +
          (eli5 ? "bg-primary text-primary-foreground" : "bg-card text-foreground")
        }
      >
        <Baby className="h-5 w-5" /> Explain like I&apos;m 5
      </button>

      <label className="flex min-h-tap items-center gap-2 rounded-md bg-card px-3 text-base font-semibold shadow-clay-sm">
        <Languages className="h-5 w-5 text-primary" />
        <select
          value={language}
          onChange={(e) => handleLanguage(e.target.value)}
          aria-label="Output language"
          className="bg-transparent py-2 pr-1 font-semibold outline-none"
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  return (
    <AnimatePresence mode="wait">
      {phase === "loading" ? (
        <motion.div key="loading" {...motionProps}>
          <TranslatorSkeleton />
        </motion.div>
      ) : phase === "result" && result ? (
        <motion.div key="result" {...motionProps}>
          <div className="mb-4">{controls}</div>
          <TranslatorResult
            result={result}
            originalText={originalText}
            storageKey={storageKey}
            onReset={() => {
              setFile(null);
              setText("");
              setResult(null);
              setPhase("input");
            }}
          />
        </motion.div>
      ) : (
        <motion.div key="input" {...motionProps}>
          <Card>
            <h2 className={"text-2xl font-extrabold tracking-tight sm:text-3xl " + accentClassName}>
              {title}
            </h2>
            <p className="mt-2 text-base text-muted-foreground sm:text-lg">{subtitle}</p>

            {TEST_MODE && (
              <div className="mt-4 rounded-md border border-dashed border-primary/40 bg-primary/5 p-3">
                <p className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
                  <FlaskConical className="h-4 w-4" /> Demo documents (Test Mode)
                </p>
                <div className="flex flex-wrap gap-2">
                  {DEMO_DOCS.map((d) => (
                    <Button
                      key={d.key}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFile(null);
                        setText(d.text);
                      }}
                    >
                      {d.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="relative mt-6">
              <Textarea
                rows={6}
                value={text}
                onChange={(e) => setText(e.target.value)}
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

            <div className="mt-4">{controls}</div>

            <div className="mt-5">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Paperclip className="h-4 w-4" /> ADD A DOCUMENT (OPTIONAL)
              </div>
              <FileIntake file={file} onFile={setFile} />
            </div>

            <AnimatePresence>
              {phase === "error" && (
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

            <Button
              size="lg"
              className="mt-6 w-full"
              onClick={() => runTranslate()}
              disabled={!canSubmit}
            >
              <Wand2 className="h-5 w-5" /> Explain this for me
            </Button>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              ClearAid only explains and organizes. You stay in control and submit
              anything yourself.
            </p>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
