"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { ModuleGate } from "@/components/auth/module-gate";
import { TranslatorView } from "@/components/translator/translator-view";
import { getProgram } from "@/lib/mock-programs";
import { useActiveEmergency } from "@/lib/use-emergency";

export default function TranslatePage({ params }: { params: { id: string } }) {
  const program = getProgram(params.id);
  const { hasEmergency, loaded } = useActiveEmergency();
  if (!program) return notFound();

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <header className="flex items-center justify-between">
        <Brand href="/dashboard" />
        <Link
          href="/dashboard"
          className="flex min-h-tap items-center gap-1 rounded-md px-2 text-base font-semibold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-5 w-5" /> Back
        </Link>
      </header>

      <div className="mb-6 mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">{program.agency}</Badge>
          <Badge variant="neutral">{program.category}</Badge>
          {program.gated && (
            <Badge variant="warning">
              <Lock className="h-3.5 w-3.5" /> Account tool
            </Badge>
          )}
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{program.title}</h1>
        <p className="mt-1 text-lg text-muted-foreground">{program.description}</p>
      </div>

      <ModuleGate gated={program.gated} hasEmergency={hasEmergency} ready={loaded}>
        <TranslatorView program={program} />
      </ModuleGate>
    </main>
  );
}
