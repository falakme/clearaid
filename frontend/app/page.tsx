"use client";

import { useRef } from "react";
import { FlaskConical, Lock, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeMode } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { DataPurgeButton } from "@/components/data-purge-button";
import {
  IntakeWorkspace,
  type IntakeWorkspaceHandle,
} from "@/components/translator/intake-workspace";
import { DEMO_DOCS } from "@/lib/demo-docs";

/**
 * The single, frictionless app surface. No login, no onboarding, no location
 * prompt — visiting the site drops you straight into the translator.
 *
 * A "Judge Demo Mode" banner offers one-tap synthetic documents that load AND
 * auto-process through the full pipeline, so judges see instant, real results.
 */
export default function HomePage() {
  const workspaceRef = useRef<IntakeWorkspaceHandle>(null);

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <ThemeMode theme="default" />

      <header className="flex items-center justify-between">
        <Brand href="/" />
        <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <Lock className="h-4 w-4" /> No sign-in needed
        </span>
      </header>

      {/* ── Judge Demo Mode banner ───────────────────────────────────────── */}
      <section className="mt-6 rounded-md border-2 border-primary/40 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-primary">
          <FlaskConical className="h-5 w-5" />
          <h2 className="text-base font-extrabold uppercase tracking-wide">
            Judge Demo Mode
          </h2>
        </div>
        <p className="mt-1 text-base text-muted-foreground">
          One tap loads a complex synthetic document and runs it through the full
          AI pipeline — classification, plain-language brief, extraction, and a
          verified local-support recommendation.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DEMO_DOCS.map((doc) => (
            <Button
              key={doc.key}
              variant="outline"
              onClick={() => workspaceRef.current?.loadAndRun(doc.text, doc.docType)}
              title={doc.caption}
            >
              {doc.label}
            </Button>
          ))}
        </div>
      </section>

      {/* ── Page title ───────────────────────────────────────────────────── */}
      <div className="mb-6 mt-8">
        <p className="text-lg font-semibold text-primary">Paperwork, made plain</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Confusing letter? We&apos;ll explain it.
        </h1>
        <p className="mt-3 max-w-xl text-lg text-muted-foreground">
          Turn eviction notices, hospital discharge papers, benefit letters, and
          medical bills into clear, plain-language steps. Describe your situation,
          paste the text, or upload a PDF or photo.
        </p>
      </div>

      {/* ── Intake workspace ─────────────────────────────────────────────── */}
      <IntakeWorkspace ref={workspaceRef} docType="general" storageKey="home-intake" />

      <footer className="mt-12 flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4" /> Stateless &amp; private — ClearAid stores
          nothing and never submits anything for you.
        </p>
        <DataPurgeButton />
        <p>Built for the USAII Global AI Hackathon · Crisis-to-Action Translator</p>
      </footer>
    </main>
  );
}
