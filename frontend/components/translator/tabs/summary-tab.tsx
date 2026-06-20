"use client";

import { useMemo } from "react";
import { BookOpenText, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { ListenButton } from "@/components/listen-button";
import { Item, Stagger } from "@/components/motion";
import { markdownToPlainText } from "@/lib/text";
import { localizeEmergencyNumbers } from "@/lib/emergency";
import type { Translator } from "@/lib/i18n";
import type { TranslateResult } from "@/lib/types";
import { DataTable } from "../data-table";
import { ConfidenceBadge, UrgencyBanner } from "./shared";

/**
 * Tab 1 — Summary.
 * The urgency banner, the plain-language explanation (with read-aloud), and the
 * optional breakdown table. The output language is chosen up top in the header.
 */
export function SummaryTab({ result, t, language }: { result: TranslateResult; t: Translator; language: string }) {
  const spoken = useMemo(
    () =>
      [result.plain_language_brief, markdownToPlainText(result.plain_language_explanation_markdown)]
        .filter(Boolean)
        .join(". "),
    [result.plain_language_brief, result.plain_language_explanation_markdown],
  );

  // Localize any "911" references in the AI output to the user's detected location.
  const localizedMarkdown = useMemo(
    () => localizeEmergencyNumbers(result.plain_language_explanation_markdown, result.detected_location),
    [result.plain_language_explanation_markdown, result.detected_location],
  );
  const localizedBrief = useMemo(
    () => localizeEmergencyNumbers(result.plain_language_brief, result.detected_location),
    [result.plain_language_brief, result.detected_location],
  );

  return (
    <Stagger className="space-y-5">
      {result.pii_redacted_count > 0 && (
        <Item>
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-emerald-800">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
            <span className="text-sm font-semibold">
              {t("privacy_protected", { n: result.pii_redacted_count })}
            </span>
          </div>
        </Item>
      )}

      {/* Urgency classification banner */}
      <Item>
        <UrgencyBanner tier={result.urgency_tier} brief={localizedBrief} t={t} />
      </Item>

      {/* Plain-language explanation */}
      <Item>
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase text-primary">
              <BookOpenText className="h-4 w-4" /> {t("what_this_means")}
            </h2>
            <div className="flex items-center gap-2">
              <ConfidenceBadge score={result.ai_confidence_score} t={t} />
              <ListenButton text={spoken} language={language} label={t("listen")} stopLabel={t("stop")} className="px-3 text-xs" />
            </div>
          </div>
          <Markdown>{localizedMarkdown}</Markdown>
        </Card>
      </Item>

      {/* Optional breakdown table (renders only when headers exist) */}
      <Item>
        <DataTable data={result.table_data} t={t} />
      </Item>
    </Stagger>
  );
}
