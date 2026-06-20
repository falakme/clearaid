"use client";

import { usePathname } from "next/navigation";
import { Home, RotateCcw } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { LanguageMenu } from "@/components/language-menu";
import { EmptyWorkspace } from "@/components/translator/empty-workspace";
import { PrintablePlan } from "@/components/translator/printable-plan";
import { TranslatorSkeleton } from "@/components/translator/translator-skeleton";
import { BottomNav, SideNav, activeTabFromPath, type TabKey } from "@/components/translator/bottom-nav";
import { UrgencyPill } from "@/components/translator/tabs/shared";
import { createTranslator, type Translator } from "@/lib/i18n";
import { useTranslator } from "@/lib/translator-context";

const TAB_TITLE: Record<TabKey, Parameters<Translator>[0]> = {
  summary:   "nav_summary",
  tasks:     "title_action_plan",
  chat:      "title_ask",
  resources: "title_get_help",
  history:   "nav_history",
  settings:  "nav_settings",
};

/**
 * The dashboard shell — a persistent layout shared by every `/dash/*` route.
 * Adapts across screens:
 *   - phone / tablet  -> floating glassmorphic bottom nav, single column.
 *   - desktop (lg+)    -> persistent left sidebar, wider content column.
 *
 * Each section is a real route, so the active tab is derived from the URL.
 * All progress-bearing state (the result, checked tasks, acknowledgement) lives
 * in <TranslatorProvider>, so switching routes never wipes progress.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    hydrated,
    result,
    language,
    handleLanguage,
    refreshing,
    acknowledged,
    checkedTasks,
    handleReset,
    goHome,
  } = useTranslator();

  const t = createTranslator(language);
  const activeTab = activeTabFromPath(pathname);

  // Before the client restore finishes we don't yet know whether a session
  // exists — show the skeleton rather than flashing the empty state.
  if (!hydrated) {
    return (
      <div className="mx-auto max-w-screen-xl px-5 py-8 lg:px-8">
        <div className="mx-auto max-w-md">
          <TranslatorSkeleton language={language} />
        </div>
      </div>
    );
  }

  // Hydrated but no active document — invite the user to create one.
  if (!result) {
    return (
      <EmptyWorkspace language={language} onLanguageChange={handleLanguage} onCreate={goHome} />
    );
  }

  const hasResource =
    Boolean(result.recommended_resource_url) ||
    (result.additional_resources?.length ?? 0) > 0 ||
    (result.local_support_resources?.length ?? 0) > 0;
  const attention = { resources: hasResource && !acknowledged };

  // The urgency pill describes the current document, so it only belongs on the
  // document-specific tabs — not on History or Settings.
  const isChat = activeTab === "chat";
  const showUrgency =
    activeTab === "summary" ||
    activeTab === "tasks" ||
    activeTab === "chat" ||
    activeTab === "resources";

  return (
    <>
      <div className="print-hidden mx-auto flex h-[100dvh] w-full max-w-screen-xl">
        {/* Desktop sidebar */}
        <aside className="hidden w-72 shrink-0 flex-col border-r border-white/50 px-5 py-6 lg:flex">
          <Brand href="/" />
          <div className="mt-8 flex-1">
            <SideNav attention={attention} t={t} />
          </div>
          <div className="border-t border-white/50 pt-4 space-y-2">
            <Button variant="ghost" size="sm" className="w-full" onClick={goHome}>
              <Home className="h-5 w-5" /> {t("home")}
            </Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={handleReset}>
              <RotateCcw className="h-5 w-5" /> {t("new_document")}
            </Button>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex w-full items-center justify-between gap-2 px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] lg:px-8 lg:py-4">
            <div className="flex min-w-0 items-center gap-3">
              <Brand href="/" className="lg:hidden" />
              <h1 className="hidden font-display text-lg font-bold lg:block">
                {t(TAB_TITLE[activeTab])}
              </h1>
              {showUrgency && (
                <UrgencyPill tier={result.urgency_tier} t={t} className="hidden sm:inline-flex lg:ml-1" />
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={goHome}
                aria-label={t("home")}
                title={t("home")}
                className="flex min-h-tap min-w-tap items-center justify-center rounded-md bg-card text-foreground shadow-clay-sm transition-all active:translate-y-0.5 lg:hidden"
              >
                <Home className="h-5 w-5 text-primary" />
              </button>
              <LanguageMenu value={language} onChange={handleLanguage} busy={refreshing} />
            </div>
          </header>

          {/* On the chat route the ChatView owns its own scroll so the input
              stays pinned to the bottom. For all other routes, main scrolls. */}
          <main className={isChat
            ? "flex flex-1 flex-col overflow-hidden px-4 pt-1 lg:px-8"
            : "scroll-clay flex-1 overflow-y-auto px-4 pb-32 pt-1 lg:px-8 lg:pb-10"
          }>
            <div className={isChat
              ? "mx-auto flex w-full max-w-3xl flex-1 flex-col min-h-0"
              : "mx-auto w-full max-w-3xl"
            }>
              {children}
            </div>
          </main>

          <BottomNav attention={attention} t={t} />
        </div>
      </div>

      <PrintablePlan result={result} checked={checkedTasks} language={language} />
    </>
  );
}
