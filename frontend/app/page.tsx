"use client";

import { Brand } from "@/components/brand";
import { LanguageMenu } from "@/components/language-menu";
import { IntakeView } from "@/components/translator/intake-view";
import { TranslatorSkeleton } from "@/components/translator/translator-skeleton";
import { useTranslator } from "@/lib/translator-context";

/**
 * The intake surface (`/`). No login, no onboarding — visiting the site drops
 * you straight into the translator. Submitting a document runs the translation
 * and navigates to the routed dashboard (`/dash`).
 *
 * All shared state lives in <TranslatorProvider> (mounted in the root layout),
 * so navigating to `/dash` and back never loses progress, and a returning user
 * sees a "Resume" / "Open workspace" affordance for their last session.
 */
export default function HomePage() {
  const {
    text,
    setText,
    files,
    setFiles,
    language,
    handleLanguage,
    canSubmit,
    error,
    phase,
    convertingFile,
    runTranslate,
    handleLoadDemo,
    recentEntry,
    handleLoadHistory,
    result,
    openDashboard,
  } = useTranslator();

  // Match the IntakeView's full-screen container exactly so the loading state
  // fills the same space as every other screen — no more tiny narrow card.
  if (phase === "converting" || phase === "loading") {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-screen-xl flex-col px-5 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))] lg:px-8 lg:py-8">
        <header className="flex items-center justify-between gap-3">
          <Brand href="/" />
          <LanguageMenu value={language} onChange={handleLanguage} />
        </header>

        {/* Same two-column grid as IntakeView — skeleton sits in the form column */}
        <div className="mt-6 flex-1 lg:grid lg:grid-cols-2 lg:items-start lg:gap-12">
          <div className="hidden lg:block" />
          <TranslatorSkeleton
            language={language}
            converting={phase === "converting"}
            convertingFile={convertingFile}
          />
        </div>
      </main>
    );
  }

  return (
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
      onOpenDashboard={openDashboard}
    />
  );
}
