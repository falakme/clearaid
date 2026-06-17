"use client";

import { CheckSquare, FileText, Link as LinkIcon, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabKey = "summary" | "tasks" | "resources" | "settings";

const TABS: { key: TabKey; label: string; icon: typeof FileText }[] = [
  { key: "summary", label: "Summary", icon: FileText },
  { key: "tasks", label: "Tasks", icon: CheckSquare },
  { key: "resources", label: "Resources", icon: LinkIcon },
  { key: "settings", label: "Settings", icon: Settings },
];

/**
 * Floating, glassmorphic bottom navigation for the mobile dashboard.
 *
 * Fixed to the bottom of the viewport and centered within the app's max-w-md
 * column. Uses backdrop-blur + a translucent white surface for the glass look.
 * `attention` renders a small dot on a tab that needs the user's input (e.g.
 * an un-acknowledged resource action).
 */
export function BottomNav({
  active,
  onChange,
  attention,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
  attention?: Partial<Record<TabKey, boolean>>;
}) {
  return (
    <nav
      aria-label="Dashboard sections"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40"
    >
      <div className="pointer-events-auto mx-auto max-w-md px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-stretch justify-around gap-1 rounded-2xl border border-white/60 bg-white/80 p-1.5 shadow-clay backdrop-blur-lg">
          {TABS.map(({ key, label, icon: Icon }) => {
            const isActive = active === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChange(key)}
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
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
