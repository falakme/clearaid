"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Keyboard, Mic, Sparkles, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAudioLevels } from "@/lib/use-audio-levels";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";
import type { Translator } from "@/lib/i18n";

type Mode = "choice" | "keyboard" | "voice";

/**
 * Gemini-style multimodal input. It occupies a single "spot" that morphs
 * between three states:
 *
 *   choice   — two big puffy clay buttons: keyboard and microphone.
 *   keyboard — a textarea with a microphone button tucked in the corner.
 *   voice    — the box becomes a primary gradient fade with a live audio
 *              visualizer; the keyboard button moves to the top-left so the
 *              user can flip back to typing.
 *
 * Speech-to-text uses the Web Speech API; the visualizer reads the mic via the
 * Web Audio API (with a graceful animated fallback). Everything is offline and
 * client-side.
 */
export function SmartInput({
  text,
  onTextChange,
  t,
  speechLang = "en-US",
  rtl = false,
}: {
  text: string;
  onTextChange: (v: string) => void;
  t: Translator;
  speechLang?: string;
  rtl?: boolean;
}) {
  // Start on the textarea if the user already has text (e.g. from a demo load).
  const [mode, setMode] = useState<Mode>(text.trim() ? "keyboard" : "choice");
  const [voiceSupported, setVoiceSupported] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!SR);
  }, []);

  // If a demo populates text while we're on the chooser, reveal the textarea.
  useEffect(() => {
    if (text.trim() && mode === "choice") setMode("keyboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  function openKeyboard() {
    setMode("keyboard");
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  return (
    <div className="relative">
      <AnimatePresence mode="wait" initial={false}>
        {mode === "choice" && (
          <ChoicePanel
            key="choice"
            t={t}
            voiceSupported={voiceSupported}
            onKeyboard={openKeyboard}
            onVoice={() => setMode("voice")}
          />
        )}

        {mode === "keyboard" && (
          <KeyboardPanel
            key="keyboard"
            t={t}
            text={text}
            onTextChange={onTextChange}
            textareaRef={textareaRef}
            voiceSupported={voiceSupported}
            onVoice={() => setMode("voice")}
          />
        )}

        {mode === "voice" && (
          <VoicePanel
            key="voice"
            t={t}
            speechLang={speechLang}
            rtl={rtl}
            existing={text}
            onKeyboard={openKeyboard}
            onCommit={(spoken) => {
              if (spoken) onTextChange(text ? `${text} ${spoken}` : spoken);
              openKeyboard();
            }}
            onCancel={() => setMode(text.trim() ? "keyboard" : "choice")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Mode 1 — the chooser ─────────────────────────────────────────────── */

function ChoicePanel({
  t,
  voiceSupported,
  onKeyboard,
  onVoice,
}: {
  t: Translator;
  voiceSupported: boolean;
  onKeyboard: () => void;
  onVoice: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="mb-3 text-center text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {t("input_choose")}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Keyboard tile */}
        <button
          type="button"
          onClick={onKeyboard}
          className="group flex min-h-[156px] flex-col items-center justify-center gap-3 rounded-lg border border-white/70 bg-card p-5 text-center shadow-clay transition-all hover:brightness-[1.02] active:translate-y-0.5 active:shadow-clay-inset"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-md bg-primary/10 text-primary shadow-clay-sm transition-transform group-hover:scale-105">
            <Keyboard className="h-7 w-7" />
          </span>
          <span className="text-lg font-extrabold text-foreground">{t("type_it")}</span>
          <span className="text-sm leading-snug text-muted-foreground">{t("type_hint")}</span>
        </button>

        {/* Microphone tile — primary gradient to invite voice */}
        <button
          type="button"
          onClick={onVoice}
          disabled={!voiceSupported}
          title={voiceSupported ? undefined : t("voice_unsupported")}
          className={cn(
            "group relative flex min-h-[156px] flex-col items-center justify-center gap-3 overflow-hidden rounded-lg p-5 text-center text-primary-foreground shadow-clay-primary transition-all active:translate-y-0.5",
            "bg-gradient-to-br from-primary via-primary to-primary/70",
            !voiceSupported && "cursor-not-allowed opacity-50",
            voiceSupported && "hover:brightness-105",
          )}
        >
          <span className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
          <span className="flex h-14 w-14 items-center justify-center rounded-md bg-white/20 text-white shadow-clay-sm backdrop-blur-sm transition-transform group-hover:scale-105">
            <Mic className="h-7 w-7" />
          </span>
          <span className="text-lg font-extrabold">{t("speak_it")}</span>
          <span className="text-sm leading-snug text-white/85">{t("speak_hint")}</span>
        </button>
      </div>
    </motion.div>
  );
}

/* ── Mode 2 — textarea with a corner mic ──────────────────────────────── */

function KeyboardPanel({
  t,
  text,
  onTextChange,
  textareaRef,
  voiceSupported,
  onVoice,
}: {
  t: Translator;
  text: string;
  onTextChange: (v: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  voiceSupported: boolean;
  onVoice: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.99 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <Textarea
        ref={textareaRef}
        rows={6}
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder={t("placeholder")}
        aria-label={t("type_hint")}
        className="pb-16"
      />
      {voiceSupported && (
        <button
          type="button"
          onClick={onVoice}
          aria-label={t("speak_it")}
          className="absolute bottom-3 right-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-clay-primary transition-all hover:brightness-105 active:translate-y-0.5"
        >
          <Mic className="h-5 w-5" />
        </button>
      )}
    </motion.div>
  );
}

/* ── Mode 3 — immersive inline voice (primary gradient fade) ───────────── */

function VoicePanel({
  t,
  speechLang,
  existing,
  onKeyboard,
  onCommit,
  onCancel,
}: {
  t: Translator;
  speechLang: string;
  rtl: boolean;
  existing: string;
  onKeyboard: () => void;
  onCommit: (spoken: string) => void;
  onCancel: () => void;
}) {
  const { transcript, interim, value, stop } = useSpeechRecognition(speechLang);
  const levels = useAudioLevels(true);

  // Always tear down the speech engine if the panel unmounts unexpectedly.
  useEffect(() => stop, [stop]);

  function commit() {
    stop();
    onCommit(value);
  }

  function backToKeyboard() {
    stop();
    onCommit(value); // keep whatever was captured, then show the textarea
    onKeyboard();
  }

  function cancel() {
    stop();
    onCancel();
  }

  const energy = levels.reduce((a, b) => a + b, 0) / levels.length;
  const shown = value;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-lg bg-slate-900 p-5 text-white shadow-clay-primary"
    >
      {/* Decorative glows — explicit positive layering on the dark card so the
          panel never renders white-on-white (a -z-10 backdrop could disappear
          behind the surrounding light card). */}
      <motion.div
        className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary/40 blur-3xl"
        animate={{ scale: 1 + energy * 0.6, opacity: 0.35 + energy * 0.4 }}
        transition={{ type: "spring", stiffness: 110, damping: 18 }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-primary/25 blur-3xl"
        animate={{ scale: 1 + energy * 0.4 }}
        transition={{ type: "spring", stiffness: 90, damping: 20 }}
      />

      {/* Top bar: keyboard button (top-left) + close */}
      <div className="relative flex items-center justify-between">
        <button
          type="button"
          onClick={backToKeyboard}
          aria-label={t("back_to_keyboard")}
          className="flex h-11 items-center gap-2 rounded-md bg-white/15 px-3 text-sm font-bold text-white shadow-clay-sm backdrop-blur-sm transition-colors hover:bg-white/25"
        >
          <Keyboard className="h-5 w-5" />
          <span className="hidden sm:inline">{t("back_to_keyboard")}</span>
        </button>
        <button
          type="button"
          onClick={cancel}
          aria-label={t("cancel")}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Visualizer */}
      <div className="relative mt-4 flex items-center justify-center" dir="ltr">
        <div className="flex h-20 items-center justify-center gap-[3px]">
          {levels.map((l, i) => (
            <span
              key={i}
              className="w-1.5 rounded-full bg-white"
              style={{
                height: `${Math.max(8, l * 100)}%`,
                opacity: 0.55 + l * 0.45,
                transition: "height 90ms linear, opacity 90ms linear",
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative mt-1 flex items-center justify-center gap-2 text-sm font-semibold text-blue-200">
        <Mic className="h-4 w-4" /> {t("listening")}
      </div>

      {/* Transcript */}
      <div className="relative mt-4 min-h-[64px] rounded-md bg-white/10 p-3 text-center backdrop-blur-sm">
        {shown ? (
          <p className="text-lg font-medium leading-snug text-white">
            {transcript} <span className="text-blue-200/70">{interim}</span>
          </p>
        ) : (
          <p className="text-base font-medium leading-snug text-blue-200/80">{t("voice_prompt")}</p>
        )}
      </div>

      {/* Controls */}
      <div className="relative mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={cancel}
          className="rounded-md px-4 py-3 text-base font-bold text-blue-200 transition-colors hover:text-white"
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          onClick={commit}
          disabled={!shown}
          className="flex items-center gap-2 rounded-md bg-white px-5 py-3 text-base font-extrabold text-slate-900 shadow-clay transition-all active:translate-y-0.5 disabled:opacity-40"
        >
          <Check className="h-5 w-5" /> {t("use_this")}
        </button>
      </div>

      {existing.trim() && (
        <p className="relative mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-200/70">
          <Sparkles className="h-3.5 w-3.5" /> {t("speak_situation")}
        </p>
      )}
    </motion.div>
  );
}
