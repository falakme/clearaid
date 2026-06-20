"use client";

import { useState } from "react";
import {
  BadgeCheck,
  ExternalLink,
  Loader2,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Item, Stagger } from "@/components/motion";
import type { Translator } from "@/lib/i18n";
import type { AdditionalResource, TranslateResult } from "@/lib/types";
import { isSafeHttpUrl } from "@/lib/utils";
import { buildShareText } from "./shared";

export function ResourcesTab({
  result,
  recommendationLoading,
  acknowledged,
  onAcknowledgedChange,
  t,
}: {
  result: TranslateResult;
  recommendationLoading: boolean;
  acknowledged: boolean;
  onAcknowledgedChange: (next: boolean) => void;
  t: Translator;
}) {
  const [shareMsg, setShareMsg] = useState("");

  const resourceUrl = (result.recommended_resource_url || "").trim();
  const hasResource = isSafeHttpUrl(resourceUrl);
  const resourceName = (result.recommended_resource_name || "").trim() || resourceUrl;
  const reasoning = (result.ai_reasoning_for_recommendation || "").trim();
  const hasTasks = result.task_list.length > 0;

  // Additional resources — filter to safe http(s) URLs only (S3).
  const extras: AdditionalResource[] = (result.additional_resources || []).filter(
    (r) => isSafeHttpUrl(r.url),
  );

  async function sharePlan() {
    const textToShare = buildShareText(result, t);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: t("share_title"), text: textToShare });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(textToShare);
        setShareMsg(t("copied"));
        setTimeout(() => setShareMsg(""), 2500);
      }
    } catch {
      /* user cancelled the share sheet — ignore */
    }
  }

  return (
    <Stagger className="space-y-4">

      {/* ── Verified Local Support ──────────────────────────────────────── */}
      <Item>
        {recommendationLoading && !hasResource ? (
          <Card className="border border-emerald-200 bg-emerald-50/40">
            <h2 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-emerald-700">
              <BadgeCheck className="h-4 w-4" /> {t("verified_support")}
            </h2>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              {t("finding_resource")}
            </p>
          </Card>
        ) : hasResource ? (
          <Card className="border border-emerald-200 bg-emerald-50/40">
            <div className="flex items-start justify-between gap-2">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase text-emerald-700">
                <BadgeCheck className="h-4 w-4" /> {t("verified_support")}
              </h2>
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                {t("best_match")}
              </span>
            </div>
            <p className="mt-2 break-words text-base font-bold text-foreground">
              <a href={resourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {resourceName}
              </a>
            </p>
            {reasoning && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">{t("why_this_one")}</span> {reasoning}
              </p>
            )}
            {acknowledged && (
              <a
                href={resourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ size: "sm", className: "mt-3 w-full" })}
              >
                <ExternalLink className="h-4 w-4" /> {t("open_resource")}
              </a>
            )}
          </Card>
        ) : !recommendationLoading ? (
          <Card>
            <h2 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-emerald-700">
              <BadgeCheck className="h-4 w-4" /> {t("verified_support")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("no_resource")}</p>
          </Card>
        ) : null}
      </Item>

      {/* ── Additional Resources ─────────────────────────────────────────── */}
      {extras.length > 0 && (
        <Item>
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              {t("more_resources")}
            </h3>
            <div className="space-y-2">
              {extras.map((r, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-md border border-border bg-card/60 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {r.name || new URL(r.url).hostname}
                      </a>
                    </p>
                    {r.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
                    )}
                  </div>
                  {acknowledged && (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-md border border-border bg-card p-2 text-muted-foreground shadow-clay-sm transition-colors hover:text-primary"
                      aria-label={t("open_resource")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Item>
      )}

      {/* ── Responsible AI & Human-in-the-Loop ──────────────────────────── */}
      <Item>
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <ShieldCheck className="h-4 w-4" /> {t("responsible_ai")}
          </h2>

          {/* Confidence indicator */}
          <div className="mt-2 rounded-md bg-card/70 p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
              <span>{t("confidence_label")}</span>
              <span className={
                result.ai_confidence_score === "High"
                  ? "text-emerald-700"
                  : result.ai_confidence_score === "Low"
                  ? "text-red-600"
                  : "text-amber-700"
              }>
                {result.ai_confidence_score}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-amber-200/70">
              <div
                className={
                  result.ai_confidence_score === "High"
                    ? "h-full rounded-full bg-emerald-500"
                    : result.ai_confidence_score === "Low"
                    ? "h-full rounded-full bg-red-400"
                    : "h-full rounded-full bg-amber-500"
                }
                style={{
                  width:
                    result.ai_confidence_score === "High"
                      ? "100%"
                      : result.ai_confidence_score === "Low"
                      ? "30%"
                      : "60%",
                }}
              />
            </div>
            <p className="mt-1.5 text-xs text-amber-800/70">{t("confidence_hint")}</p>
          </div>

          {/* Mandatory human-in-the-loop acknowledgement */}
          <div className="my-3">
            <Checkbox
              id="hitl-ack"
              checked={acknowledged}
              onCheckedChange={onAcknowledgedChange}
              labelClassName="text-xs leading-relaxed"
              label={t("ack_label")}
            />
          </div>

          <div className="space-y-2">
            {!acknowledged && (hasResource || extras.length > 0) && (
              <p className="text-xs font-medium text-amber-800">{t("unlock_hint")}</p>
            )}

            {hasTasks && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={sharePlan}
                  disabled={!acknowledged}
                >
                  <Share2 className="h-4 w-4" /> {t("share_plan")}
                </Button>
                {shareMsg && <p className="text-center text-xs text-emerald-700">{shareMsg}</p>}
              </>
            )}
          </div>
        </div>
      </Item>

    </Stagger>
  );
}
