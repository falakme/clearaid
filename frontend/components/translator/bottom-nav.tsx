"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  Clock,
  FileText,
  Link as LinkIcon,
  MessageCircle,
  MoreHorizontal,
  Settings,
} from "lucide-react";
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

// The 4 tabs always visible in the mobile bottom bar.
const PRIMARY_KEYS: TabKey[] = ["summary", "tasks", "chat", "resources"];
// The 2 tabs hidden behind the "···" overflow.
const MORE_KEYS: TabKey[] = ["history", "settings"];

const PRIMARY_TABS = TABS.filter((t) => PRIMARY_KEYS.includes(t.key));
const MORE_TABS    = TABS.filter((t) => MORE_KEYS.includes(t.key));

type Attention = Partial<Record<TabKey, boolean>>;

/** Resolve which tab a pathname belongs to (`/dash` is an exact match). */
export function activeTabFromPath(pathname: string): TabKey {
  const match = [...TABS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((tab) => pathname === tab.href || pathname.startsWith(tab.href + "/"));
  return match?.key ?? "summary";
}

/**
 * Floating glassmorphic bottom navigation for phones/tablets (hidden at lg).
 *
 * Shows the 4 core tabs (Summary, Tasks, Ask, Resources) plus a single "···"
 * overflow button for the less-frequent History and Settings. When the user is
 * already on History or Settings the overflow button is highlighted so they
 * can see where they are.
 */
export function BottomNav({ attention, t }: { attention?: Attention; t: Translator }) {
  const pathname = usePathname();
  const active = activeTabFromPath(pathname);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const isMoreActive = MORE_KEYS.includes(active);

  // Close overflow on outside tap or route change.
  useEffect(() => {
    if (!moreOpen) return;
    function onPointer(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [moreOpen]);

  useEffect(() => { setMoreOpen(false); }, [pathname]);

  return (
    <nav
      aria-label="Sections"
      className="print-hidden pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:hidden"
    >
      <div className="pointer-events-auto mx-auto max-w-md px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {/* Overflow popup — floats above the bar */}
        {moreOpen && (
          <div
            ref={moreRef}
            className="mb-2 flex flex-col overflow-hidden rounded-xl border border-white/60 bg-white/90 shadow-clay backdrop-blur-lg"
          >
            {MORE_TABS.map(({ key, href, labelKey, icon: Icon }) => {
              const isActive = active === key;
              return (
                <Link
                  key={key}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted/60",
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                  {t(labelKey)}
                  {attention?.[key] && !isActive && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-amber-500" />
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* Main bar */}
        <div className="flex items-stretch justify-around gap-1 rounded-2xl border border-white/60 bg-white/80 p-1.5 shadow-clay backdrop-blur-lg">
          {PRIMARY_TABS.map(({ key, href, labelKey, icon: Icon }) => {
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

          {/* "···" overflow */}
          <button
            type="button"
            aria-label="More"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((o) => !o)}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-xs font-bold transition-all",
              isMoreActive
                ? "bg-primary text-primary-foreground shadow-clay-primary"
                : moreOpen
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
            )}
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
            More
          </button>
        </div>
      </div>
    </nav>
  );
}

/**
 * Vertical sidebar navigation for desktop (lg+). Shows all six tabs with
 * icon + label.
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
