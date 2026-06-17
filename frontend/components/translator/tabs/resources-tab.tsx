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
 * Human-in-the-Loop Safeguards block. The "Open verified resource" (and the
 * Share plan) actions live here and stay strictly disabled until the user
 * ticks the acknowledgement checkbox. `acknowledged` is owned by the
 * orchestrator so it survives tab switches.
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
        setShareMsg("Plan copied to clipboard.");
        setTimeout(() => setShareMsg(""), 2500);
      }
    } catch {
      /* user cancelled the share sheet — ignore */
    }
  }

  return (
    <Stagger className="space-y-5">
      {/* Verified Local Support — agentic recommendation (AI-evaluated) */}
      {recommendationLoading && !hasResource && (
        <Item>
          <Card className="border-2 border-emerald-200 bg-emerald-50/40">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-700">
              <BadgeCheck className="h-4 w-4" /> Verified Local Support
            </h2>
            <p className="flex items-center gap-2 text-base text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              Searching for a trustworthy local resource and evaluating the options&hellip;
            </p>
          </Card>
        </Item>
      )}

      {hasResource && (
        <Item>
          <Card className="border-2 border-emerald-200 bg-emerald-50/40">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-700">
              <BadgeCheck className="h-4 w-4" /> Verified Local Support
            </h2>
            <p className="text-lg font-extrabold text-foreground">
              {result.recommended_resource_name || "Recommended resource"}
            </p>
            {result.ai_reasoning_for_recommendation && (
              <p className="mt-2 flex items-start gap-2 rounded-md bg-card/70 p-3 text-base text-muted-foreground">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  <span className="font-semibold text-emerald-700">AI reasoning: </span>
                  {result.ai_reasoning_for_recommendation}
                </span>
              </p>
            )}
            <p className="mt-2 break-all text-sm text-muted-foreground">
              {result.recommended_resource_url}
            </p>
          </Card>
        </Item>
      )}

      {!recommendationLoading && !hasResource && (
        <Item>
          <Card>
            <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-700">
              <BadgeCheck className="h-4 w-4" /> Verified Local Support
            </h2>
            <p className="text-base text-muted-foreground">
              No verified local resource was found for this document. Try adding your
              city/state on the intake screen to scope the search.
            </p>
          </Card>
        </Item>
      )}

      {/* Responsible AI & Human-in-the-Loop Safeguards (amber gateway) */}
      <Item>
        <div className="rounded-md border-2 border-amber-300 bg-amber-50/60 p-5">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-amber-900">
            <ShieldCheck className="h-5 w-5" /> Responsible AI &amp; Human-in-the-Loop
            Safeguards
          </h2>

          {/* Confidence indicator */}
          <div className="mt-3 rounded-md bg-card/70 p-3">
            <div className="flex items-center justify-between text-sm font-semibold text-amber-900">
              <span>Confidence: {result.confidence_percent}% based on source text anchoring</span>
              <span>{result.ai_confidence_score}</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-amber-200/70">
              <div
                className="h-full rounded-full bg-amber-500"
                style={{ width: `${result.confidence_percent}%` }}
              />
            </div>
          </div>

          {/* Mandatory human-in-the-loop acknowledgement */}
          <div className="mt-4">
            <Checkbox
              id="hitl-ack"
              checked={acknowledged}
              onCheckedChange={onAcknowledgedChange}
              label="I verify that I will use this AI summary strictly as an organizational guide and understand that it does not provide official medical or legal decisions."
            />
          </div>

          {/* Gated external actions — disabled until the box is ticked */}
          <div className="mt-4 space-y-3">
            {!acknowledged && (
              <p className="text-sm font-medium text-amber-800">
                Confirm the statement above to enable the actions below.
              </p>
            )}

            {hasResource &&
              (acknowledged ? (
                <a
                  href={result.recommended_resource_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ size: "lg", className: "w-full" })}
                >
                  <ExternalLink className="h-5 w-5" /> Open verified resource
                </a>
              ) : (
                <Button size="lg" className="w-full" disabled>
                  <ExternalLink className="h-5 w-5" /> Open verified resource
                </Button>
              ))}

            {hasTasks && (
              <>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={sharePlan}
                  disabled={!acknowledged}
                >
                  <Share2 className="h-5 w-5" /> Share plan
                </Button>
                {shareMsg && <p className="text-center text-sm text-emerald-700">{shareMsg}</p>}
              </>
            )}
          </div>
        </div>
      </Item>
    </Stagger>
  );
}
