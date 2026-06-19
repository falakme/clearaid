"use client";

import { ChatView } from "@/components/translator/chat-view";
import { createTranslator } from "@/lib/i18n";
import { useTranslator } from "@/lib/translator-context";

/** `/dash/ask` — follow-up chat anchored to the current document. */
export default function DashAskPage() {
  const { result, language, chatKey } = useTranslator();
  if (!result) return null;
  const t = createTranslator(language);
  return <ChatView result={result} language={language} storageKey={chatKey} t={t} />;
}
