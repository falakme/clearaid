"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { ThemeMode } from "@/components/theme";
import { translateForm, recommend, ApiError } from "@/lib/api";
import { useLocalStorage } from "@/lib/storage";
import {
  addToHistory,
  clearCurrentSession,
  clearCurrentHistoryId,
  getHistory,
  loadCurrentSession,
  loadCurrentHistoryId,
  saveCurrentResult,
  saveCurrentHistoryId,
  updateHistoryEntry,
} from "@/lib/storage";
import type { HistoryEntry, TranslateResult } from "@/lib/types";
import type { DemoDoc } from "@/lib/demo-docs";
import { createTranslator, getStoredLanguage } from "@/lib/i18n";
import { persistLanguage } from "@/lib/use-language";

/** Async status of the translation request (independent of which route shows). */
type Phase = "idle" | "loading";
type DocType = "emergency" | "general";

interface RunTranslateOpts {
  language?: string;
  text?: string;
  files?: File[];
  docType?: DocType;
  refresh?: boolean;
}

interface TranslatorContextValue {
  // ── Intake inputs ─────────────────────────────────────────────────────────
  files: File[];
  setFiles: (f: File[]) => void;
  text: string;
  setText: (v: string) => void;
  docType: DocType;
  setDocType: (d: DocType) => void;
  canSubmit: boolean;

  // ── Request / session status ──────────────────────────────────────────────
  phase: Phase;
  /** True once the initial localStorage restore has run (client-only). */
  hydrated: boolean;
  result: TranslateResult | null;
  error: string;
  recLoading: boolean;
  refreshing: boolean;

  // ── Language + progress-bearing state ───────────────────────────────────────
  language: string;
  checkedTasks: Record<string, boolean>;
  acknowledged: boolean;
  setAcknowledged: (v: boolean) => void;
  /** Per-document chat key (isolates each document's follow-up chat). */
  chatKey: string;
  /** Most recent history entry, used for the intake "Resume" card. */
  recentEntry: HistoryEntry | null;
  /** The original/extracted source text for the Source Transparency panel. */
  sourceText: string;

  // ── Actions ────────────────────────────────────────────────────────────────
  runTranslate: (opts?: RunTranslateOpts) => Promise<void>;
  handleLanguage: (next: string) => void;
  handleToggleTask: (id: string, value: boolean) => void;
  handleLoadDemo: (doc: DemoDoc) => void;
  handleLoadHistory: (entry: HistoryEntry) => void;
  /** Start fresh: clear the active session and return to the intake screen. */
  handleReset: () => void;
  /** Jump to the intake (home) WITHOUT discarding the current session. */
  goHome: () => void;
  /** Return to the dashboard for the active session (if one exists). */
  openDashboard: () => void;
}

const TranslatorContext = createContext<TranslatorContextValue | null>(null);

/**
 * App-wide orchestrator for the ClarityAI translator. Mounted once at the root
 * layout so all the shared, progress-bearing state (the result, language,
 * checklist ticks, the Responsible-AI acknowledgement, the per-document chat
 * key) survives client-side navigation between the intake screen (`/`) and the
 * routed dashboard (`/dash`, `/dash/tasks`, `/dash/ask`, …).
 *
 * Navigation itself is driven by the Next.js router: completing a translation
 * pushes to `/dash`, "start new" returns to `/`, and so on — so the URL is the
 * single source of truth for which surface the user is looking at.
 */
export function TranslatorProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [docType, setDocType] = useState<DocType>("general");

  const [phase, setPhase] = useState<Phase>("idle");
  const [hydrated, setHydrated] = useState(false);
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [error, setError] = useState("");
  const [recLoading, setRecLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const runIdRef = useRef(0);

  // ID of the current history entry so we can update it when recommendation arrives.
  const currentHistoryIdRef = useRef<string | null>(null);

  const [language, setLanguage] = useState("English");
  const [acknowledged, setAcknowledged] = useState(false);
  // Tasks live under a single fixed key ("home") — changing documents swaps the
  // result but reuses this checklist slot, matching the original behaviour.
  const [checkedTasks, setCheckedTasks] = useLocalStorage<Record<string, boolean>>(
    "clarityai.tasks.home",
    {},
  );

  const [chatKey, setChatKey] = useState("home");
  const [recentEntry, setRecentEntry] = useState<HistoryEntry | null>(null);

  // ── Restore the last session + persisted language on mount ─────────────────
  useEffect(() => {
    setLanguage(getStoredLanguage());

    const saved = loadCurrentSession();
    if (saved) {
      setResult(saved.result);
      setCheckedTasks(saved.checkedTasks ?? {});
      const savedId = loadCurrentHistoryId();
      if (savedId) {
        setChatKey(savedId);
        currentHistoryIdRef.current = savedId;
      }
    } else {
      // No active session — surface the most recent entry for the Resume card.
      const history = getHistory();
      if (history.length > 0) setRecentEntry(history[0]);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the current-session snapshot up-to-date whenever tasks are ticked.
  useEffect(() => {
    if (result) saveCurrentResult(result, checkedTasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedTasks]);

  const canSubmit = files.length > 0 || text.trim().length > 0;

  const runTranslate = useCallback(
    async (opts?: RunTranslateOpts) => {
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

          // Save to history immediately (recommendation merges in later).
          const historyId = addToHistory(res, freshTasks);
          currentHistoryIdRef.current = historyId;
          setChatKey(historyId);
          saveCurrentHistoryId(historyId);

          // Reveal the dashboard for the freshly-read document.
          router.push("/dash");

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
                saveCurrentResult(updated, freshTasks);
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
        if (!isRefresh) setPhase("idle");
      } finally {
        if (runId === runIdRef.current && isRefresh) setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files, text, docType, language, result, checkedTasks, router],
  );

  const langDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleLanguage = useCallback(
    (next: string) => {
      setLanguage(next);
      persistLanguage(next);
      if (result) {
        if (langDebounceRef.current) clearTimeout(langDebounceRef.current);
        langDebounceRef.current = setTimeout(() => {
          runTranslate({ language: next, refresh: true });
        }, 800);
      }
    },
    [result, runTranslate],
  );

  const handleToggleTask = useCallback(
    (id: string, value: boolean) => {
      setCheckedTasks({ ...checkedTasks, [id]: value });
    },
    [checkedTasks, setCheckedTasks],
  );

  const handleLoadDemo = useCallback(
    (doc: DemoDoc) => {
      setFiles([]);
      setText(doc.text);
      setDocType(doc.docType);
      runTranslate({ text: doc.text, files: [], docType: doc.docType });
    },
    [runTranslate],
  );

  const handleLoadHistory = useCallback(
    (entry: HistoryEntry) => {
      runIdRef.current++; // cancel any in-flight run
      setResult(entry.result);
      setCheckedTasks(entry.checkedTasks ?? {});
      saveCurrentResult(entry.result, entry.checkedTasks ?? {});
      currentHistoryIdRef.current = entry.id;
      setChatKey(entry.id);
      saveCurrentHistoryId(entry.id);
      setAcknowledged(false);
      setRecLoading(false);
      setRefreshing(false);
      setPhase("idle");
      router.push("/dash");
    },
    [router, setCheckedTasks],
  );

  const handleReset = useCallback(() => {
    runIdRef.current++;
    clearCurrentSession();
    clearCurrentHistoryId();
    currentHistoryIdRef.current = null;
    setChatKey("home");
    setResult(null);
    setError("");
    setFiles([]);
    setText("");
    setAcknowledged(false);
    setRecLoading(false);
    setRefreshing(false);
    setRecentEntry(getHistory()[0] ?? null);
    setPhase("idle");
    router.push("/");
  }, [router]);

  const goHome = useCallback(() => {
    router.push("/");
  }, [router]);

  const openDashboard = useCallback(() => {
    if (result) router.push("/dash");
  }, [result, router]);

  const originalText =
    files.length > 0
      ? `${text ? text + "\n\n" : ""}Uploaded documents: ${files.map((f) => f.name).join(", ")}`
      : text;
  const sourceText = result?.source_text || originalText;

  const value: TranslatorContextValue = {
    files,
    setFiles,
    text,
    setText,
    docType,
    setDocType,
    canSubmit,
    phase,
    hydrated,
    result,
    error,
    recLoading,
    refreshing,
    language,
    checkedTasks,
    acknowledged,
    setAcknowledged,
    chatKey,
    recentEntry,
    sourceText,
    runTranslate,
    handleLanguage,
    handleToggleTask,
    handleLoadDemo,
    handleLoadHistory,
    handleReset,
    goHome,
    openDashboard,
  };

  return (
    <TranslatorContext.Provider value={value}>
      <ThemeMode theme="default" />
      {children}
    </TranslatorContext.Provider>
  );
}

/** Access the shared translator orchestrator. Must be used under a provider. */
export function useTranslator(): TranslatorContextValue {
  const ctx = useContext(TranslatorContext);
  if (!ctx) {
    throw new Error("useTranslator must be used within a <TranslatorProvider>");
  }
  return ctx;
}
