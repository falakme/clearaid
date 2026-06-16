"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ApiError, translateForm } from "@/lib/api";
import { RELIEF_PROGRAMS } from "@/lib/mock-programs";
import type { TranslateResult } from "@/lib/types";

export default function AdminTranslateTester() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ms, setMs] = useState<number | null>(null);

  async function run() {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setMs(null);
    const started = performance.now();
    try {
      const res = await translateForm({ text });
      setResult(res);
      setMs(Math.round(performance.now() - started));
    } catch (e) {
      setError(
        e instanceof ApiError
          ? `${e.status}: ${e.message}`
          : "Request failed — backend unreachable.",
      );
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="space-y-5">
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold">AI pipeline tester</h2>
          {ms !== null && <Badge variant="info">{ms} ms</Badge>}
        </div>
        <p className="mb-4 text-base text-muted-foreground">
          Send raw form text directly to <code>POST /api/translate-form</code> and inspect
          the structured response. Useful for verifying the model and prompt.
        </p>

        <div className="mb-3 flex flex-wrap gap-2">
          {RELIEF_PROGRAMS.map((p) => (
            <Button
              key={p.id}
              variant="outline"
              size="sm"
              onClick={() => setText(p.sampleFormText)}
            >
              <FileText className="h-4 w-4" /> {p.title}
            </Button>
          ))}
        </div>

        <Textarea
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste government form text or load a sample above…"
          aria-label="Text to translate"
        />

        <Button size="lg" className="mt-4 w-full" onClick={run} disabled={loading || !text.trim()}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
          {loading ? "Running…" : "Run translation"}
        </Button>

        {error && (
          <p className="mt-4 rounded-md bg-warning/15 p-3 text-base text-amber-800">{error}</p>
        )}
      </Card>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            <Card>
              <h3 className="mb-3 text-lg font-bold">Parsed result</h3>
              <dl className="space-y-3 text-base">
                <Field
                  label="Explanation (markdown)"
                  value={`${result.plain_language_explanation_markdown.length} chars`}
                />
                <Field label="Task list" value={`${result.task_list.length} tasks`} />
                <Field
                  label="Table"
                  value={
                    result.table_data.headers.length
                      ? `${result.table_data.headers.length} cols × ${result.table_data.rows.length} rows`
                      : "— empty —"
                  }
                />
                <Field label="Diagram steps" value={`${result.diagram_steps.length} steps`} />
                <Field
                  label="Source text"
                  value={`${result.source_text.length} chars captured`}
                />
              </dl>
            </Card>

            <Card>
              <h3 className="mb-3 text-lg font-bold">Raw JSON</h3>
              <pre className="clay-inset overflow-x-auto p-4 text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
