"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  FlaskConical,
  Globe,
  Paperclip,
  ScanText,
  ShieldCheck,
  Wand2,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LanguageSelect } from "@/components/language-select";
import { DEMO_DOCS, type DemoDoc } from "@/lib/demo-docs";
import { createTranslator, isRTL, speechLocale } from "@/lib/i18n";
import { FileIntake } from "./file-intake";
import { SmartInput } from "./smart-input";

/**
 * State 0 — the start screen. Fills the viewport. A language selector sits at
 * the top and re-renders the entire interface offline in the chosen language
 * (RTL-aware). Judge Demo Mode is a collapsible, swipeable carousel. On desktop
 * the pitch and the input form sit side by side; on phones they stack.
 *
 * The input itself is a Gemini-style <SmartInput>: it starts as two big
 * buttons (keyboard / microphone), and morphs into a textarea or an immersive
 * inline voice panel depending on the choice. Inputs are controlled by the
 * orchestrator.
 */
export function IntakeView({
  text,
  onTextChange,
  file,
  onFileChange,
  language,
  onLanguageChange,
  canSubmit,
  error,
  onSubmit,
  onLoadDemo,
}: {
  text: string;
  onTextChange: (v: string) => void;
  file: File | null;
  onFileChange: (f: File | null) => void;
  language: string;
  onLanguageChange: (v: string) => void;
  canSubmit: boolean;
  error: string;
  onSubmit: () => void;
  onLoadDemo: (doc: DemoDoc) => void;
}) {
  const [demoOpen, setDemoOpen] = useState(true);
  const t = createTranslator(language);
  const rtl = isRTL(language);

  const trust = [
    { icon: ScanText, label: t("trust_docs") },
    { icon: Globe, label: t("trust_langs") },
    { icon: ShieldCheck, label: t("trust_private") },
  ];

  return (
    <main
      dir={rtl ? "rtl" : "ltr"}
      className="mx-auto flex min-h-[100dvh] max-w-screen-lg flex-col px-5 py-6 lg:px-8 lg:py-8"
    >
      <header className="flex items-center justify-between gap-3">
        <Brand href="/" />
        <LanguageSelect value={language} onChange={onLanguageChange} />
      </header>

      {/* Judge Demo Mode — collapsible, swipeable carousel */}
      <section className="mt-5 rounded-xl border-2 border-primary/40 bg-primary/5">
        <button
          type="button"
          onClick={() => setDemoOpen((o) => !o)}
          aria-expanded={demoOpen}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-primary"
        >
          <span className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide">
            <FlaskConical className="h-4 w-4" /> {t("demo_title")}
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
              <p className="px-4 text-sm text-muted-foreground">{t("demo_subtitle")}</p>
              <div className="no-scrollbar flex snap-x gap-2 overflow-x-auto px-4 pb-4 pt-3">
                {DEMO_DOCS.map((doc) => (
                  <button
                    key={doc.key}
                    type="button"
                    onClick={() => onLoadDemo(doc)}
                    title={doc.caption}
                    className="flex min-w-[9rem] shrink-0 snap-start flex-col gap-1 rounded-lg border border-white/70 bg-card p-3 text-start shadow-clay-sm transition-all hover:brightness-[1.02] active:translate-y-0.5"
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

      {/* Pitch + form */}
      <div className="mt-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-12">
        {/* Pitch */}
        <div className="lg:pt-6">
          <p className="text-base font-semibold text-primary">{t("tagline")}</p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            {t("headline")}
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">{t("subhead")}</p>

          <ul className="mt-6 hidden gap-3 lg:grid">
            {trust.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-base font-semibold">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary shadow-clay-sm">
                  <Icon className="h-5 w-5" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Input form */}
        <Card className="mt-7 lg:mt-0">
          <SmartInput
            text={text}
            onTextChange={onTextChange}
            t={t}
            speechLang={speechLocale(language)}
            rtl={rtl}
          />

          <div className="mt-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Paperclip className="h-4 w-4" /> {t("add_document")}
            </div>
            <FileIntake file={file} onFile={onFileChange} t={t} />
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
            <Wand2 className="h-5 w-5" /> {t("submit")}
          </Button>
        </Card>
      </div>

      <p className="mt-auto pt-8 text-center text-sm text-muted-foreground">
        <span className="flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-4 w-4" /> {t("footer")}
        </span>
      </p>
    </main>
  );
}
