"use client";

import { useState } from "react";
import {
  BadgeCheck,
  ExternalLink,
  Loader2,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Item, Stagger } from "@/components/motion";
import type { TranslateResult } from "@/lib/types";
import { buildShareText } from "./shared";

/**
 * Tab 3 — Resources.
 * The agentic "Verified Local Support" card and the Responsible AI &
 * Human-in-the-Loop block sit side by side on desktop. The "Open verified
 * resource" and "Share plan" actions stay disabled until the user ticks the
 * acknowledgement checkbox. `acknowledged` is owned by the orchestrator so it
 * survives tab switches.
 */
export function ResourcesTab({
  result,
  recommendationLoading,
  acknowledged,
  onAcknowledgedChange,
}: {
  result: TranslateResult;
  recommendationLoading: boolean;
  acknowledged: boolean;
  onAcknowledgedChange: (next: boolean) => void;
}) {
  const [shareMsg, setShareMsg] = useState("");
  const hasResource = Boolean(result.recommended_resource_url);
  const hasTasks = result.task_list.length > 0;

  async function sharePlan() {
    const textToShare = buildShareText(result);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "My ClearAid action plan", text: textToShare });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(textToShare);
        setShareMsg("Copied to clipboard.");
        setTimeout(() => setShareMsg(""), 2500);
      }
    } catch {
      /* user cancelled the share sheet — ignore */
    }
  }

  return (
    <Stagger className="grid gap-4 lg:grid-cols-2 lg:items-start">
      {/* Verified Local Support — agentic recommendation (AI-evaluated) */}
      <Item>
        {recommendationLoading && !hasResource ? (
          <Card className="border border-emerald-200 bg-emerald-50/40">
            <h2 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              <BadgeCheck className="h-4 w-4" /> Verified local support
            </h2>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              Finding a trustworthy organization and checking it&apos;s the right fit
            </p>
          </Card>
        ) : hasResource ? (
          <Card className="border border-emerald-200 bg-emerald-50/40">
            <h2 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              <BadgeCheck className="h-4 w-4" /> Verified local support
            </h2>
            <p className="text-base font-bold text-foreground">
              {result.recommended_resource_name || "Recommended resource"}
            </p>
            {result.ai_reasoning_for_recommendation && (
              <p className="mt-2 flex items-start gap-2 rounded-md bg-card/70 p-3 text-xs text-muted-foreground">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  <span className="font-semibold text-emerald-700">Why this one: </span>
                  {result.ai_reasoning_for_recommendation}
                </span>
              </p>
            )}
            <p className="mt-2 break-all text-xs text-muted-foreground">
              {result.recommended_resource_url}
            </p>
          </Card>
        ) : (
          <Card>
            <h2 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              <BadgeCheck className="h-4 w-4" /> Verified local support
            </h2>
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t pin down a specific local organization for this one. The
              steps in your plan still apply, and 211.org or your local legal aid or
              benefits office can point you to help nearby.
            </p>
          </Card>
        )}
      </Item>

      {/* Responsible AI & Human-in-the-Loop Safeguards (amber gateway) */}
      <Item>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <ShieldCheck className="h-4 w-4" /> Responsible AI &amp; human-in-the-loop
          </h2>

          {/* Confidence indicator */}
          <div className="mt-2 rounded-md bg-card/70 p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
              <span>Confidence: {result.confidence_percent}% based on source text anchoring</span>
              <span>{result.ai_confidence_score}</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-amber-200/70">
              <div
                className="h-full rounded-full bg-amber-500"
                style={{ width: `${result.confidence_percent}%` }}
              />
            </div>
          </div>

          {/* Mandatory human-in-the-loop acknowledgement */}
          <div className="my-3">
            <Checkbox
              id="hitl-ack"
              checked={acknowledged}
              onCheckedChange={onAcknowledgedChange}
              labelClassName="text-xs leading-relaxed"
              label="I verify that I will use this AI summary strictly as an organizational guide and understand that it does not provide official medical or legal decisions."
            />
          </div>

          {/* Gated external actions — disabled until the box is ticked */}
          <div className="mt-3 space-y-2">
            {!acknowledged && (
              <p className="text-xs font-medium text-amber-800">
                Tick the box above to unlock the buttons below.
              </p>
            )}

            {hasResource &&
              (acknowledged ? (
                <a
                  href={result.recommended_resource_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ size: "sm", className: "w-full" })}
                >
                  <ExternalLink className="h-4 w-4" /> Open verified resource
                </a>
              ) : (
                <Button size="sm" className="w-full" disabled>
                  <ExternalLink className="h-4 w-4" /> Open verified resource
                </Button>
              ))}

            {hasTasks && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={sharePlan}
                  disabled={!acknowledged}
                >
                  <Share2 className="h-4 w-4" /> Share plan
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
