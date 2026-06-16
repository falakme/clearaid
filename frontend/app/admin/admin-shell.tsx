"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ArrowLeft, Bell, Radio, Users, Wand2 } from "lucide-react";
import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: Activity },
  { href: "/admin/mock-alerts", label: "Alerts", icon: Bell },
  { href: "/admin/er-teams", label: "ER Teams", icon: Users },
  { href: "/admin/translate", label: "AI tester", icon: Wand2 },
];

/** Client chrome for the admin console (nav + layout). Access control is
 * enforced by the server component in layout.tsx. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brand href="/admin" />
          <Badge variant="warning">
            <Radio className="h-4 w-4" /> Admin
          </Badge>
        </div>
        <Link
          href="/home"
          className="flex min-h-tap items-center gap-1 rounded-md px-2 text-base font-semibold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-5 w-5" /> Exit to app
        </Link>
      </header>

      <nav className="clay-card mt-6 flex flex-wrap gap-2 p-2" aria-label="Admin sections">
        {NAV.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-tap flex-1 items-center justify-center gap-2 rounded-md px-4 text-base font-bold transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-clay-primary"
                  : "text-muted-foreground hover:bg-white/70",
              )}
            >
              <Icon className="h-5 w-5" /> {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="mt-6">{children}</main>

      <footer className="mt-10 text-center text-sm text-muted-foreground">
        Admin console · access restricted to authorized administrators · all data is non-PII
      </footer>
    </div>
  );
}
