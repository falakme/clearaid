import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";

/**
 * Shared chrome for the static legal pages (Terms, Privacy).
 * Outer shell matches the dashboard width (max-w-screen-xl). The article
 * prose is constrained to max-w-3xl (same as the dashboard content column)
 * for readability, while the header and footer span the full shell width.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-screen-xl flex-col px-5 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))] lg:px-8 lg:py-8">
      {/* Header — full shell width */}
      <header className="flex items-center justify-between gap-3">
        <Brand href="/" />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-md bg-card px-3 py-2 text-sm font-semibold text-muted-foreground shadow-clay-sm hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to app
        </Link>
      </header>

      {/* Prose column — capped for readability like the dashboard content area */}
      <article className="mt-8 w-full max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>
        <div className="legal-prose mt-6 space-y-5 text-[15px] leading-relaxed text-foreground/90">
          {children}
        </div>
      </article>

      {/* Footer — same layout as intake footer */}
      <footer className="mt-auto border-t border-border pt-6">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
          Private by design. ClarityAI never files or submits anything for you.
        </p>
        <nav className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span aria-hidden>·</span>
          <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <span aria-hidden>·</span>
          <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
        </nav>
      </footer>
    </div>
  );
}

/** A titled section within a legal document. */
export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-bold tracking-tight text-foreground">{heading}</h2>
      {children}
    </section>
  );
}
