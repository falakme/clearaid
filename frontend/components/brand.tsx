import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2", className)}>
      <img
        src="/icons/icon.svg"
        alt="ClarityAI logo"
        width={44}
        height={44}
        className="h-11 w-11 shrink-0 rounded-xl shadow-clay-primary"
      />
      <span className="font-display text-2xl font-extrabold tracking-tight text-foreground">
        Clarity<span className="text-primary">AI</span>
      </span>
    </Link>
  );
}
