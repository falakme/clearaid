"use client";

import { FilePlus2 } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LanguageMenu } from "@/components/language-menu";
import { createTranslator, isRTL, type Translator } from "@/lib/i18n";

/**
 * Skeleton placeholder shown when the dashboard is opened but there are no
 * documents/chats yet. Invites the user to create their first chat.
 */
export function EmptyWorkspace({
  language,
  onLanguageChange,
  onCreate,
}: {
  language: string;
  onLanguageChange: (next: string) => void;
  onCreate: () => void;
}) {
  const t = createTranslator(language);
  const rtl = isRTL(language);

  return (
    <main
      dir={rtl ? "rtl" : "ltr"}
      className="mx-auto flex min-h-[100dvh] max-w-screen-xl flex-col px-5 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))] lg:px-8 lg:py-8"
    >
      <header className="flex items-center justify-between gap-3">
        <Brand href="/" />
        <LanguageMenu value={language} onChange={onLanguageChange} />
      </header>

      <div className="mx-auto mt-10 w-full max-w-md">
        <EmptyState t={t} onCreate={onCreate} />
      </div>
    </main>
  );
}

/**
 * The reusable empty body: a few dimmed skeleton rows, a friendly message, and
 * a primary "create a chat" action. Used on the empty dashboard and in the
 * History tab when there are no entries.
 */
export function EmptyState({ t, onCreate }: { t: Translator; onCreate: () => void }) {
  return (
    <Card className="flex flex-col items-center text-center">
      {/* Dimmed skeleton rows hinting at where chats will appear */}
      <div aria-hidden className="w-full space-y-2.5 opacity-60">
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-12 w-5/6" />
      </div>

      <span className="mt-6 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary shadow-clay-sm">
        <FilePlus2 className="h-6 w-6" />
      </span>
      <h2 className="mt-3 text-lg font-bold tracking-tight">{t("no_chats_title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("no_chats_body")}</p>

      <Button className="mt-5 w-full" onClick={onCreate}>
        <FilePlus2 className="h-5 w-5" /> {t("create_chat")}
      </Button>
    </Card>
  );
}
