"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Landmark, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { fetchRecommendations } from "@/lib/api";
import type { Recommendation } from "@/lib/types";

/**
 * "Recommended Actions" — official government relief (active) or long-term
 * recovery grant (resolved) links from the backend Brave Search pipeline.
 * Renders nothing if there are no results (e.g. Brave key not configured).
 */
export function RecommendedActions({
  city,
  region,
  disaster,
  mode,
}: {
  city: string;
  region?: string;
  disaster?: string;
  mode: "relief" | "recovery";
}) {
  const [results, setResults] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!city) return;
    let active = true;
    setLoading(true);
    fetchRecommendations({ city, region, disaster, mode })
      .then((data) => active && setResults(data.results))
      .catch(() => active && setResults([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [city, region, disaster, mode]);

  if (!loading && results.length === 0) return null;

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
        <Landmark className="h-4 w-4" />
        {mode === "recovery" ? "Recovery resources" : "Recommended actions"}
      </h2>
      <p className="mb-3 text-base text-muted-foreground">
        {mode === "recovery"
          ? "Official long-term recovery grants and programs for your area."
          : "Official government relief programs you can apply to right now."}
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Finding official resources…
        </div>
      ) : (
        <ul className="space-y-2">
          {results.map((r) => (
            <li key={r.url}>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-md border border-primary/30 bg-card p-3 shadow-clay-sm transition-all hover:brightness-[1.02]"
              >
                <ExternalLink className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span>
                  <span className="font-bold text-foreground">{r.title}</span>
                  {r.description && (
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {r.description}
                    </span>
                  )}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
