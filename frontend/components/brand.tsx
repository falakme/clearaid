import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-white shadow-clay-primary">
        <ShieldCheck className="h-6 w-6" strokeWidth={2.5} />
      </span>
      <span className="text-2xl font-extrabold tracking-tight text-foreground">
        Clear<span className="text-primary">Aid</span>
      </span>
    </Link>
  );
}
