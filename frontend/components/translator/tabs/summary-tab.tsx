"use client";

import { useMemo } from "react";
import { BookOpenText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { ListenButton } from "@/components/listen-button";
import { Item, Stagger } from "@/components/motion";
import { markdownToPlainText } from "@/lib/text";
import type { TranslateResult } from "@/lib/types";
import { DataTable } from "../data-table";
import { ConfidenceBadge, UrgencyBanner } from "./shared";

/**
 * Tab 1 — Summary.
 * The urgency banner, the plain-language explanation (with read-aloud), and the
 * optional breakdown table. The output language is chosen up top in the header.
 */
export function SummaryTab({ result }: { result: TranslateResult }) {
  const spoken = useMemo(
    () =>
      [result.plain_language_brief, markdownToPlainText(result.plain_language_explanation_markdown)]
        .filter(Boolean)
        .join(". "),
    [result.plain_language_brief, result.plain_language_explanation_markdown],
  );

  return (
    <Stagger className="space-y-5">
      {/* Urgency classification banner */}
      <Item>
        <UrgencyBanner tier={result.urgency_tier} brief={result.plain_language_brief} />
      </Item>

      {/* Plain-language explanation */}
      <Item>
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <BookOpenText className="h-4 w-4" /> What this means
            </h2>
            <div className="flex items-center gap-2">
              <ConfidenceBadge score={result.ai_confidence_score} />
              <ListenButton text={spoken} className="px-3 text-xs" />
            </div>
          </div>
          <Markdown>{result.plain_language_explanation_markdown}</Markdown>
        </Card>
      </Item>

      {/* Optional breakdown table (renders only when headers exist) */}
      <Item>
        <DataTable data={result.table_data} />
      </Item>
    </Stagger>
  );
}
