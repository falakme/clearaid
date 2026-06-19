"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ThemeMode } from "@/components/theme";
import { translateForm, recommend, ApiError } from "@/lib/api";
import { useLocalStorage } from "@/lib/storage";
import {
  addToHistory,
  clearCurrentSession,
  getHistory,
  loadCurrentSession,
  saveCurrentResult,
  updateHistoryEntry,
} from "@/lib/storage";
import type { HistoryEntry, TranslateResult } from "@/lib/types";
import type { DemoDoc } from "@/lib/demo-docs";
import { phaseFade } from "@/lib/motion";
import { createTranslator, getStoredLanguage } from "@/lib/i18n";
import { persistLanguage } from "@/lib/use-language";
import { IntakeView } from "./intake-view";
import { DashboardView } from "./dashboard-view";
import { EmptyWorkspace } from "./empty-workspace";
import { PrintablePlan } from "./printable-plan";
import { TranslatorSkeleton } from "./translator-skeleton";

/** Async status of the translation request (independent of which view shows). */
type Phase = "idle" | "loading";
/** Which surface the user is looking at. */
type Route = "home" | "dashboard";

interface Props {
  docType?: "emergency" | "general";
  storageKey?: string;
}

export function TranslatorApp({ docType: docTypeProp = "general", storageKey = "home" }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [docType, setDocType] = useState<"emergency" | "general">(docTypeProp);

  const [phase, setPhase] = useState<Phase>("idle");
  const [route, setRoute] = useState<Route>("home");
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [error, setError] = useState("");
  const [recLoading, setRecLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const runIdRef = useRef(0);

  // ID of the current history entry so we can update it when recommendation arrives.
  const currentHistoryIdRef = useRef<string | null>(null);

  const [language, setLanguage] = useState("English");
  const [acknowledged, setAcknowledged] = useState(false);
  const [checkedTasks, setCheckedTasks] = useLocalStorage<Record<string, boolean>>(
    `clarityai.tasks.${storageKey}`,
    {},
  );

  // ── Restore the last session + persisted language on mount ─────────────────
  const [recentEntry, setRecentEntry] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    // Restore the user's chosen language so the whole UI stays in it.
    setLanguage(getStoredLanguage());

    const saved = loadCurrentSession();
    if (saved) {
      setResult(saved.result);
      setCheckedTasks(saved.checkedTasks ?? {});
      setRoute("dashboard");
    } else {
      // No active session — check history so the intake screen can show a Resume card.
      const history = getHistory();
      if (history.length > 0) setRecentEntry(history[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the current-session snapshot up-to-date whenever tasks are ticked.
  useEffect(() => {
    if (result) saveCurrentResult(result, checkedTasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedTasks]);

  const canSubmit = files.length > 0 || text.trim().length > 0;

  const runTranslate = useCallback(
    async (opts?: {
      language?: string;
      text?: string;
      files?: File[];
      docType?: "emergency" | "general";
      refresh?: boolean;
    }) => {
      const submitText = opts?.text ?? text;
      const submitFiles = opts?.files !== undefined ? opts.files : files;
      if (submitFiles.length === 0 && submitText.trim().length === 0) return;

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
          files: submitFiles,
          docType: opts?.docType ?? docType,
          language: opts?.language ?? language,
        });
        if (runId !== runIdRef.current) return;

        setResult(res);
        saveCurrentResult(res, checkedTasks);

        if (!isRefresh) {
          // Fresh document — clean slate for tasks + acknowledgement.
          const freshTasks = {};
          setAcknowledged(false);
          setCheckedTasks(freshTasks);
          setPhase("idle");
          setRoute("dashboard");

          // Save to history immediately (recommendation merges in later).
          const historyId = addToHistory(res, freshTasks);
          currentHistoryIdRef.current = historyId;

          // Fire-and-forget agentic recommendation.
          setRecLoading(true);
          recommend({
            document_category: res.document_category,
            plain_language_brief: res.plain_language_brief,
            detected_location: res.detected_location,
          })
            .then((rec) => {
              if (runId !== runIdRef.current) return;
              setResult((prev) => {
                if (!prev) return prev;
                const updated = { ...prev, ...rec };
                // Persist the enriched result.
                saveCurrentResult(updated, freshTasks);
                // Update the history entry with the recommendation.
                if (currentHistoryIdRef.current) {
                  updateHistoryEntry(currentHistoryIdRef.current, updated, freshTasks);
                }
                return updated;
              });
            })
            .catch(() => {})
            .finally(() => {
              if (runId === runIdRef.current) setRecLoading(false);
            });
        } else {
          // Refresh (language change etc.) — update history entry in place.
          saveCurrentResult(res, checkedTasks);
          if (currentHistoryIdRef.current) {
            updateHistoryEntry(currentHistoryIdRef.current, res, checkedTasks);
          }
        }
      } catch (e) {
        if (runId !== runIdRef.current) return;
        const submitFilesLocal = opts?.files !== undefined ? opts.files : files;
        const t = createTranslator(opts?.language ?? language);
        const msg =
          e instanceof ApiError
            ? e.status === 503
              ? t("err_not_configured")
              : e.status === 502
                ? t("err_trouble_reading")
                : e.status === 422 || e.status === 413
                  ? e.message === "blur_detected"
                    ? submitFilesLocal.length > 0
                      ? t("err_blur_photo")
                      : t("err_need_detail")
                    : e.message
                  : t("err_failed", { status: e.status })
            : t("err_unreachable");
        setError(msg);
        if (!isRefresh) {
          setPhase("idle");
          setRoute("home");
        }
      } finally {
        if (runId === runIdRef.current && isRefresh) setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files, text, docType, language, result, checkedTasks],
  );

  const langDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleLanguage(next: string) {
    setLanguage(next);
    persistLanguage(next);
    if (result) {
      if (langDebounceRef.current) clearTimeout(langDebounceRef.current);
      langDebounceRef.current = setTimeout(() => {
        runTranslate({ language: next, refresh: true });
      }, 800);
    }
  }

  function handleToggleTask(id: string, value: boolean) {
    setCheckedTasks({ ...checkedTasks, [id]: value });
  }

  function handleLoadDemo(doc: DemoDoc) {
    setFiles([]);
    setText(doc.text);
    setDocType(doc.docType);
    runTranslate({ text: doc.text, files: [], docType: doc.docType });
  }

  function handleLoadHistory(entry: HistoryEntry) {
    runIdRef.current++; // cancel any in-flight run
    setResult(entry.result);
    setCheckedTasks(entry.checkedTasks ?? {});
    saveCurrentResult(entry.result, entry.checkedTasks ?? {});
    currentHistoryIdRef.current = entry.id;
    setAcknowledged(false);
    setRecLoading(false);
    setRefreshing(false);
    // A loaded entry is a different document — start its follow-up chat fresh.
    try {
      localStorage.removeItem(`clarityai.chat.${storageKey}`);
    } catch {
      /* ignore */
    }
    setPhase("idle");
    setRoute("dashboard");
  }

  function handleReset() {
    runIdRef.current++;
    clearCurrentSession();
    currentHistoryIdRef.current = null;
    try {
      localStorage.removeItem(`clarityai.chat.${storageKey}`);
    } catch {
      /* ignore */
    }
    setResult(null);
    setError("");
    setFiles([]);
    setText("");
    setAcknowledged(false);
    setRecLoading(false);
    setRefreshing(false);
    setRecentEntry(getHistory()[0] ?? null);
    setPhase("idle");
    setRoute("home");
  }

  /** Jump to the intake (home) WITHOUT discarding the current session. */
  function handleGoHome() {
    setRoute("home");
  }

  /** Return to the dashboard for the active session. */
  function handleOpenDashboard() {
    if (result) setRoute("dashboard");
  }

  const originalText =
    files.length > 0
      ? `${text ? text + "\n\n" : ""}Uploaded documents: ${files.map((f) => f.name).join(", ")}`
      : text;
  const sourceText = result?.source_text || originalText;

  const showDashboard = route === "dashboard";

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
            className="mx-auto max-w-screen-xl px-5 py-8 lg:px-8"
          >
            <div className="mx-auto max-w-md">
              <TranslatorSkeleton language={language} />
            </div>
          </motion.div>
        ) : showDashboard && result ? (
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
              onHome={handleGoHome}
              onLoadHistory={handleLoadHistory}
            />
            <PrintablePlan result={result} checked={checkedTasks} language={language} />
          </motion.div>
        ) : showDashboard ? (
          <motion.div key="empty" variants={phaseFade} initial="hidden" animate="show" exit="exit">
            <EmptyWorkspace
              language={language}
              onLanguageChange={handleLanguage}
              onCreate={handleGoHome}
            />
          </motion.div>
        ) : (
          <motion.div key="intake" variants={phaseFade} initial="hidden" animate="show" exit="exit">
            <IntakeView
              text={text}
              onTextChange={setText}
              files={files}
              onFilesChange={setFiles}
              language={language}
              onLanguageChange={handleLanguage}
              canSubmit={canSubmit}
              error={error}
              onSubmit={() => runTranslate()}
              onLoadDemo={handleLoadDemo}
              recentEntry={recentEntry}
              onResume={handleLoadHistory}
              hasSession={result !== null}
              onOpenDashboard={handleOpenDashboard}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
