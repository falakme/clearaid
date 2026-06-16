"use client";

import { useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { stripEmoji } from "@/lib/text";
import { cn } from "@/lib/utils";

// Tailwind-styled element overrides (no typography plugin needed). Raw HTML is
// not enabled, so model output cannot inject markup.
const COMPONENTS: Components = {
  h1: ({ ...p }) => <h1 className="mt-2 text-2xl font-extrabold tracking-tight" {...p} />,
  h2: ({ ...p }) => <h2 className="mt-5 text-xl font-bold tracking-tight" {...p} />,
  h3: ({ ...p }) => <h3 className="mt-4 text-lg font-bold" {...p} />,
  p: ({ ...p }) => <p className="mt-3 text-lg leading-relaxed text-foreground" {...p} />,
  ul: ({ ...p }) => <ul className="mt-3 list-disc space-y-1 pl-6 text-lg" {...p} />,
  ol: ({ ...p }) => <ol className="mt-3 list-decimal space-y-1 pl-6 text-lg" {...p} />,
  li: ({ ...p }) => <li className="leading-relaxed" {...p} />,
  strong: ({ ...p }) => <strong className="font-bold text-foreground" {...p} />,
  em: ({ ...p }) => <em className="italic" {...p} />,
  a: ({ ...p }) => (
    <a className="font-semibold text-primary underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...p} />
  ),
  blockquote: ({ ...p }) => (
    <blockquote className="mt-3 border-l-4 border-primary/30 pl-4 italic text-muted-foreground" {...p} />
  ),
  code: ({ ...p }) => <code className="rounded bg-muted px-1.5 py-0.5 text-base" {...p} />,
  hr: () => <hr className="my-5 border-border" />,
};

/** Renders plain-language markdown with emojis stripped for a clean look. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  const clean = useMemo(() => stripEmoji(children), [children]);
  return (
    <div className={cn("text-foreground", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {clean}
      </ReactMarkdown>
    </div>
  );
}
