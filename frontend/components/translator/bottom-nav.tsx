"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare, Clock, FileText, Link as LinkIcon, MessageCircle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Translator, UiKey } from "@/lib/i18n";

export type TabKey = "summary" | "tasks" | "chat" | "resources" | "history" | "settings";

export const TABS: { key: TabKey; href: string; labelKey: UiKey; icon: typeof FileText }[] = [
  { key: "summary",   href: "/dash",           labelKey: "nav_summary",   icon: FileText      },
  { key: "tasks",     href: "/dash/tasks",     labelKey: "nav_tasks",     icon: CheckSquare   },
  { key: "chat",      href: "/dash/ask",       labelKey: "nav_chat",      icon: MessageCircle },
  { key: "resources", href: "/dash/resources", labelKey: "nav_resources", icon: LinkIcon      },
  { key: "history",   href: "/dash/history",   labelKey: "nav_history",   icon: Clock         },
  { key: "settings",  href: "/dash/settings",  labelKey: "nav_settings",  icon: Settings      },
];

type Attention = Partial<Record<TabKey, boolean>>;

/** Resolve which tab a pathname belongs to (`/dash` is an exact match). */
export function activeTabFromPath(pathname: string): TabKey {
  // Check the most specific (longest) hrefs first so e.g. `/dash/tasks`
  // doesn't match the `/dash` summary entry.
  const match = [...TABS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((tab) => pathname === tab.href || pathname.startsWith(tab.href + "/"));
  return match?.key ?? "summary";
}

/**
 * Floating, glassmorphic bottom navigation. Shown on phones and tablets
 * (hidden at `lg`, where the sidebar takes over). `attention` puts a dot on a
 * tab that needs the user's input. Each tab is a real route link.
 */
export function BottomNav({ attention, t }: { attention?: Attention; t: Translator }) {
  const pathname = usePathname();
  const active = activeTabFromPath(pathname);

  return (
    <nav
      aria-label="Sections"
      className="print-hidden pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:hidden"
    >
      <div className="pointer-events-auto mx-auto max-w-md px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-stretch justify-around gap-1 rounded-2xl border border-white/60 bg-white/80 p-1.5 shadow-clay backdrop-blur-lg">
          {TABS.map(({ key, href, labelKey, icon: Icon }) => {
            const isActive = active === key;
            return (
              <Link
                key={key}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-xs font-bold transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-clay-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                  {attention?.[key] && !isActive && (
                    <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
                  )}
                </span>
                {t(labelKey)}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

/**
 * Vertical sidebar navigation for tablet-landscape / desktop (`lg+`). Larger
 * tap rows with icon + label, matching the bottom nav's active styling.
 */
export function SideNav({ attention, t }: { attention?: Attention; t: Translator }) {
  const pathname = usePathname();
  const active = activeTabFromPath(pathname);

  return (
    <nav aria-label="Sections" className="flex flex-col gap-1.5">
      {TABS.map(({ key, href, labelKey, icon: Icon }) => {
        const isActive = active === key;
        return (
          <Link
            key={key}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-4 py-3 text-base font-bold transition-all",
              isActive
                ? "bg-primary text-primary-foreground shadow-clay-primary"
                : "text-muted-foreground hover:bg-white/70 hover:text-foreground",
            )}
          >
            <span className="relative">
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              {attention?.[key] && !isActive && (
                <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
              )}
            </span>
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
