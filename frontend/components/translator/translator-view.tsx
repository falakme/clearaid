"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { phaseFade } from "@/lib/motion";
import { translateForm, ApiError } from "@/lib/api";
import type { ReliefProgram, TranslateResult } from "@/lib/types";
import { FileIntake } from "./file-intake";
import { TranslatorResult } from "./translator-result";
import { TranslatorSkeleton } from "./translator-skeleton";

type Phase = "input" | "loading" | "result" | "error";

export function TranslatorView({ program }: { program: ReliefProgram }) {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [error, setError] = useState("");

  const canSubmit = !!file || text.trim().length > 0;

  async function handleTranslate() {
    if (!canSubmit) return;
    setPhase("loading");
    setError("");
    try {
      const res = await translateForm({
        file,
        text: file ? undefined : text,
        docType: program.docType,
      });
      setResult(res);
      setPhase("result");
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.status === 503
            ? "The AI service isn't configured yet. Add an NVIDIA_API_KEY to the backend."
            : e.status === 502
              ? "ClearAid had trouble reading that document. Please try again."
              : e.status === 422 || e.status === 413
                ? e.message
                : `Translation failed (${e.status}). Please try again.`
          : "Something went wrong reaching the translator.";
      setError(msg);
      setPhase("error");
    }
  }

  const originalText = file ? `Uploaded document: ${file.name}` : text;

  const motionProps = {
    variants: phaseFade,
    initial: "hidden" as const,
    animate: "show" as const,
    exit: "exit" as const,
  };


  return (
    <AnimatePresence mode="wait">
      {phase === "loading" ? (
        <motion.div key="loading" {...motionProps}>
          <TranslatorSkeleton />
        </motion.div>
      ) : phase === "result" && result ? (
        <motion.div key="result" {...motionProps}>
          <TranslatorResult
            program={program}
            result={result}
            originalText={originalText}
            onReset={() => setPhase("input")}
          />
        </motion.div>
      ) : (
        <motion.div key="input" {...motionProps} className="space-y-5">
          <Card>
            <div className="mb-2 flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5" />
              <span className="text-lg font-semibold">Add your document</span>
            </div>
            <p className="mb-4 text-base text-muted-foreground">
              Upload a PDF or photo of your {program.title.toLowerCase()}, snap a picture,
              or paste the text below. ClearAid reads it and explains it in plain language.
            </p>

            <FileIntake file={file} onFile={setFile} />

            {!file && (
              <div className="mt-5">
                <div className="mb-2 flex items-center gap-3 text-sm font-semibold text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> OR PASTE TEXT
                  <span className="h-px flex-1 bg-border" />
                </div>
                <Textarea
                  rows={8}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste the document text here…"
                  aria-label="Document text to translate"
                />
                <button
                  type="button"
                  onClick={() => setText(program.sampleFormText)}
                  className="mt-2 text-sm font-semibold text-primary hover:underline"
                >
                  Use a sample {program.agency} document
                </button>
              </div>
            )}

            <AnimatePresence>
              {phase === "error" && (
                <motion.p
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="overflow-hidden rounded-md bg-warning/15 p-3 text-base text-amber-800"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <Button
              size="lg"
              className="mt-5 w-full"
              onClick={handleTranslate}
              disabled={!canSubmit}
            >
              <Wand2 className="h-5 w-5" /> Translate this for me
            </Button>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              ClearAid only explains the document. You stay in control and submit it yourself.
            </p>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
