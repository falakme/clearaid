"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  FlaskConical,
  Globe,
  LayoutDashboard,
  Paperclip,
  ScanText,
  ShieldCheck,
  Wand2,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LanguageMenu } from "@/components/language-menu";
import { DEMO_DOCS, type DemoDoc } from "@/lib/demo-docs";
import { createTranslator, isRTL, speechLocale, type UiKey } from "@/lib/i18n";
import type { HistoryEntry } from "@/lib/types";
import { FileIntake } from "./file-intake";
import { SmartInput } from "./smart-input";

/** Map a document category to its localized label key. */
const CATEGORY_KEY: Record<string, UiKey> = {
  eviction: "cat_eviction",
  housing: "cat_housing",
  medical: "cat_medical",
  food_assistance: "cat_food",
  utility: "cat_utility",
  legal: "cat_legal",
  benefits: "cat_benefits",
  general: "cat_general",
};

export function IntakeView({
  text,
  onTextChange,
  files,
  onFilesChange,
  language,
  onLanguageChange,
  canSubmit,
  error,
  onSubmit,
  onLoadDemo,
  recentEntry,
  onResume,
  hasSession = false,
  onOpenDashboard,
}: {
  text: string;
  onTextChange: (v: string) => void;
  files: File[];
  onFilesChange: (f: File[]) => void;
  language: string;
  onLanguageChange: (v: string) => void;
  canSubmit: boolean;
  error: string;
  onSubmit: () => void;
  onLoadDemo: (doc: DemoDoc) => void;
  recentEntry?: HistoryEntry | null;
  onResume?: (entry: HistoryEntry) => void;
  hasSession?: boolean;
  onOpenDashboard?: () => void;
}) {
  const [demoOpen, setDemoOpen] = useState(false);
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
      className="mx-auto flex min-h-[100dvh] max-w-screen-xl flex-col px-5 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))] lg:px-8 lg:py-8"
    >
      <header className="flex items-center justify-between gap-3">
        <Brand href="/" />
        <div className="flex items-center gap-2">
          {hasSession && onOpenDashboard && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenDashboard}
              className="shadow-clay-sm"
            >
              <LayoutDashboard className="h-4 w-4" /> {t("open_workspace")}
            </Button>
          )}
          <LanguageMenu value={language} onChange={onLanguageChange} />
        </div>
      </header>

      {/* Resume card — shown when the user has a previous session */}
      {recentEntry && onResume && (
        <button
          type="button"
          onClick={() => onResume(recentEntry)}
          className="mt-4 flex w-full items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-left transition-colors hover:bg-primary/10"
        >
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
              {t("resume_session")}
            </p>
            <p className="truncate text-sm font-medium text-foreground">
              {recentEntry.result.plain_language_brief || t("resume_hint")}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t(CATEGORY_KEY[recentEntry.result.document_category] ?? "cat_general")} ·{" "}
              {recentEntry.result.task_list.length > 0 && (
                <>
                  {Object.values(recentEntry.checkedTasks).filter(Boolean).length}/
                  {recentEntry.result.task_list.length} {t("history_tasks_done")} ·{" "}
                </>
              )}
              {new Date(recentEntry.timestamp).toLocaleDateString(undefined, {
                month: "short", day: "numeric",
              })}
            </p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-primary" />
        </button>
      )}

      {/* Pitch + form */}
      <div className="mt-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-12">
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

          {/* Demo mode — collapsed by default, available for testing */}
          <div className="mt-6 hidden lg:block">
            <button
              type="button"
              onClick={() => setDemoOpen((o) => !o)}
              aria-expanded={demoOpen}
              className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              <FlaskConical className="h-4 w-4" />
              {t("demo_title")}
              <ChevronDown className={"h-4 w-4 transition-transform " + (demoOpen ? "rotate-180" : "")} />
            </button>
            <AnimatePresence initial={false}>
              {demoOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="no-scrollbar flex snap-x gap-2 overflow-x-auto pt-3">
                    {DEMO_DOCS.map((doc) => (
                      <button
                        key={doc.key}
                        type="button"
                        onClick={() => onLoadDemo(doc)}
                        title={doc.caption}
                        className="flex min-w-[9rem] shrink-0 snap-start flex-col gap-1 rounded-md border border-border bg-card p-3 text-start shadow-clay-sm hover:brightness-[1.02] active:translate-y-0.5"
                      >
                        <span className="text-sm font-bold text-foreground">{doc.label}</span>
                        <span className="text-xs leading-snug text-muted-foreground">{doc.caption}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
            <FileIntake files={files} onFilesChange={onFilesChange} t={t} />
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

      {/* Demo mode — mobile (below the form) */}
      <section className="mt-5 rounded-md border border-border bg-card/60 lg:hidden">
        <button
          type="button"
          onClick={() => setDemoOpen((o) => !o)}
          aria-expanded={demoOpen}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-muted-foreground"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <FlaskConical className="h-4 w-4" /> {t("demo_title")}
          </span>
          <ChevronDown className={"h-4 w-4 transition-transform " + (demoOpen ? "rotate-180" : "")} />
        </button>
        <AnimatePresence initial={false}>
          {demoOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
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
                    className="flex min-w-[9rem] shrink-0 snap-start flex-col gap-1 rounded-md border border-border bg-card p-3 text-start shadow-clay-sm hover:brightness-[1.02] active:translate-y-0.5"
                  >
                    <span className="text-sm font-bold text-foreground">{doc.label}</span>
                    <span className="text-xs leading-snug text-muted-foreground">{doc.caption}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <footer className="mt-auto border-t border-border pt-6">
        <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0" /> {t("footer")}
        </p>
        <nav className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">{t("privacy_policy")}</Link>
          <span aria-hidden>·</span>
          <Link href="/terms" className="hover:text-foreground">{t("terms_of_service")}</Link>
        </nav>
      </footer>
    </main>
  );
}
