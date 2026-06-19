"use client";

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
    runTranslate,
    handleLoadDemo,
    recentEntry,
    handleLoadHistory,
    result,
    openDashboard,
  } = useTranslator();

  if (phase === "loading") {
    return (
      <div className="mx-auto max-w-screen-xl px-5 py-8 lg:px-8">
        <div className="mx-auto max-w-md">
          <TranslatorSkeleton language={language} />
        </div>
      </div>
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
