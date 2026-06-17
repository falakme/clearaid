"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ThemeMode } from "@/components/theme";
import { translateForm, recommend, ApiError } from "@/lib/api";
import { useLocalStorage } from "@/lib/storage";
import type { TranslateResult } from "@/lib/types";
import type { DemoDoc } from "@/lib/demo-docs";
import { phaseFade } from "@/lib/motion";
import { IntakeView } from "./intake-view";
import { DashboardView } from "./dashboard-view";
import { PrintablePlan } from "./printable-plan";
import { TranslatorSkeleton } from "./translator-skeleton";

type Phase = "input" | "loading" | "result" | "error";

interface Props {
  docType?: "emergency" | "general";
  storageKey?: string;
}

/**
 * Top-level orchestrator for the two-state PWA.
 *
 *   State 0 (input/error) -> <IntakeView>      full-viewport start screen
 *   State 1 (result)      -> <DashboardView>   tabbed dashboard
 *   (loading)             -> a calming skeleton between the two
 *
 * It owns ALL shared, progress-bearing state — the translation result, the
 * output language, the checklist ticks (localStorage-backed), and the
 * Responsible-AI acknowledgement — and passes it down. Because this state lives
 * above the tab router, switching dashboard tabs never wipes the user's
 * progress.
 */
export function TranslatorApp({ docType: docTypeProp = "general", storageKey = "home" }: Props) {
  // Intake inputs.
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [docType, setDocType] = useState<"emergency" | "general">(docTypeProp);

  // Pipeline state.
  const [phase, setPhase] = useState<Phase>("input");
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [error, setError] = useState("");
  const [recLoading, setRecLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const runIdRef = useRef(0);

  // Lifted UI controls / progress.
  const [language, setLanguage] = useState("English");
  const [acknowledged, setAcknowledged] = useState(false);
  const [checkedTasks, setCheckedTasks] = useLocalStorage<Record<string, boolean>>(
    `clearaid.tasks.${storageKey}`,
    {},
  );

  const canSubmit = !!file || text.trim().length > 0;

  const runTranslate = useCallback(
    async (opts?: {
      language?: string;
      text?: string;
      file?: File | null;
      docType?: "emergency" | "general";
      /** In-dashboard re-fetch (control change) — stay on the dashboard. */
      refresh?: boolean;
    }) => {
      const submitText = opts?.text ?? text;
      const submitFile = opts?.file !== undefined ? opts.file : file;
      if (!submitFile && submitText.trim().length === 0) return;

      const runId = ++runIdRef.current;
      const isRefresh = !!opts?.refresh && result !== null;

      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setPhase("loading");
        setRecLoading(false);
      }

      try {
        const res = await translateForm({
          text: submitText,
          file: submitFile,
          docType: opts?.docType ?? docType,
          language: opts?.language ?? language,
        });
        if (runId !== runIdRef.current) return; // superseded by a newer run

        setResult(res);

        if (!isRefresh) {
          // Fresh document: enter the dashboard with a clean slate.
          setAcknowledged(false);
          setCheckedTasks({});
          setPhase("result");

          // Fire-and-forget the agentic recommendation; merge it in when ready.
          // Location is taken from whatever the model detected in the document.
          setRecLoading(true);
          recommend({
            document_category: res.document_category,
            plain_language_brief: res.plain_language_brief,
            detected_location: res.detected_location,
          })
            .then((rec) => {
              if (runId !== runIdRef.current) return;
              setResult((prev) => (prev ? { ...prev, ...rec } : prev));
            })
            .catch(() => {
              /* recommendations are best-effort */
            })
            .finally(() => {
              if (runId === runIdRef.current) setRecLoading(false);
            });
        }
      } catch (e) {
        if (runId !== runIdRef.current) return;
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
        // A failed in-dashboard refresh keeps the existing result on screen.
        if (!isRefresh) setPhase("error");
      } finally {
        if (runId === runIdRef.current && isRefresh) setRefreshing(false);
      }
    },
    [file, text, docType, language, result, setCheckedTasks],
  );

  // Output language: changing it re-translates in place while on the dashboard.
  function handleLanguage(next: string) {
    setLanguage(next);
    if (phase === "result") runTranslate({ language: next, refresh: true });
  }

  function handleToggleTask(id: string, value: boolean) {
    setCheckedTasks({ ...checkedTasks, [id]: value });
  }

  function handleLoadDemo(doc: DemoDoc) {
    setFile(null);
    setText(doc.text);
    setDocType(doc.docType);
    runTranslate({ text: doc.text, file: null, docType: doc.docType });
  }

  function handleReset() {
    runIdRef.current++; // cancel any in-flight run/recommendation
    setPhase("input");
    setResult(null);
    setError("");
    setFile(null);
    setText("");
    setAcknowledged(false);
    setRecLoading(false);
    setRefreshing(false);
  }

  const originalText = file
    ? `${text ? text + "\n\n" : ""}Uploaded document: ${file.name}`
    : text;
  const sourceText = result?.source_text || originalText;

  return (
    <>
      <ThemeMode theme="default" />
      <AnimatePresence mode="wait">
        {phase === "loading" ? (
          <motion.div
            key="loading"
            variants={phaseFade}
            initial="hidden"
            animate="show"
            exit="exit"
            className="mx-auto max-w-md px-4 py-8"
          >
            <TranslatorSkeleton />
          </motion.div>
        ) : phase === "result" && result ? (
          <motion.div key="dashboard" variants={phaseFade} initial="hidden" animate="show" exit="exit">
            <DashboardView
              result={result}
              recommendationLoading={recLoading}
              refreshing={refreshing}
              language={language}
              onLanguageChange={handleLanguage}
              checked={checkedTasks}
              onToggleTask={handleToggleTask}
              acknowledged={acknowledged}
              onAcknowledgedChange={setAcknowledged}
              storageKey={storageKey}
              sourceText={sourceText}
              onReset={handleReset}
            />
            {/* Hidden on screen; rendered cleanly when the user prints. */}
            <PrintablePlan result={result} checked={checkedTasks} />
          </motion.div>
        ) : (
          <motion.div key="intake" variants={phaseFade} initial="hidden" animate="show" exit="exit">
            <IntakeView
              text={text}
              onTextChange={setText}
              file={file}
              onFileChange={setFile}
              language={language}
              onLanguageChange={handleLanguage}
              canSubmit={canSubmit}
              error={error}
              onSubmit={() => runTranslate()}
              onLoadDemo={handleLoadDemo}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
