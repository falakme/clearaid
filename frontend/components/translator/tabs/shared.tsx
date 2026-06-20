"use client";

import { AlertOctagon, Clock, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { stripEmoji } from "@/lib/text";
import type { Translator, UiKey } from "@/lib/i18n";
import type { TranslateResult, UrgencyTier } from "@/lib/types";

/** Classification banner — color + icon driven by the AI's urgency tier. */
const URGENCY_STYLE: Record<
  UrgencyTier,
  { wrap: string; icon: typeof AlertOctagon; labelKey: UiKey }
> = {
  "Urgent Action Required": {
    wrap: "border-red-200 bg-red-50/50 text-red-800",
    icon: AlertOctagon,
    labelKey: "urgency_urgent",
  },
  "Time Sensitive": {
    wrap: "border-amber-100 bg-amber-50/40 text-amber-900",
    icon: Clock,
    labelKey: "urgency_time",
  },
  "Informational Only": {
    wrap: "border-primary/20 bg-primary/5 text-primary",
    icon: Info,
    labelKey: "urgency_info",
  },
};

export function UrgencyBanner({
  tier,
  brief,
  t,
}: {
  tier: UrgencyTier;
  brief: string;
  t: Translator;
}) {
  const style = URGENCY_STYLE[tier] ?? URGENCY_STYLE["Informational Only"];
  const Icon = style.icon;
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-3", style.wrap)}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="text-[10px] font-semibold uppercase opacity-80">
          {t("ai_classification")}
        </p>
        <p className="text-base font-bold leading-tight">{t(style.labelKey)}</p>
        {brief && <p className="mt-1 text-sm font-medium opacity-90">{brief}</p>}
      </div>
    </div>
  );
}

/** Compact urgency pill for the dashboard header. */
export function UrgencyPill({
  tier,
  t,
  className,
}: {
  tier: UrgencyTier;
  t: Translator;
  className?: string;
}) {
  const style = URGENCY_STYLE[tier] ?? URGENCY_STYLE["Informational Only"];
  const Icon = style.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold",
        style.wrap,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {t(style.labelKey)}
    </span>
  );
}

/** Compact pill for the AI's self-reported extraction confidence. */
export function ConfidenceBadge({
  score,
  t,
}: {
  score: TranslateResult["ai_confidence_score"];
  t: Translator;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
      title={t("confidence_tooltip")}
    >
      {t("ai_confidence")}: {score}
    </span>
  );
}

export function buildShareText(result: TranslateResult, t: Translator): string {
  const tasks = result.task_list.map((task, i) => `${i + 1}. ${stripEmoji(task.task)}`).join("\n");
  const intro = t("share_intro");
  const footer = t("share_footer");
  return [intro, tasks || t("share_no_tasks"), footer].filter(Boolean).join("\n\n");
}
