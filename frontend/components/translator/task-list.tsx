"use client";

import { ListChecks } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useLocalStorage } from "@/lib/storage";
import { stripEmoji } from "@/lib/text";
import type { TaskItem } from "@/lib/types";

/**
 * Interactive checklist. Checking items updates a progress bar; ticks persist
 * to localStorage (per module) so progress survives a refresh — and never
 * leaves the device.
 * FAILSAFE: renders nothing when there are no tasks.
 */
export function TaskList({ tasks, storageKey }: { tasks: TaskItem[]; storageKey: string }) {
  const [checked, setChecked] = useLocalStorage<Record<string, boolean>>(
    `clearaid.tasks.${storageKey}`,
    {},
  );

  if (!tasks || tasks.length === 0) return null;

  const doneCount = tasks.filter((t) => checked[String(t.id)]).length;
  const pct = (doneCount / tasks.length) * 100;

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
          <ListChecks className="h-4 w-4" /> Action checklist
        </h2>
        <span className="text-base font-semibold text-muted-foreground">
          {doneCount}/{tasks.length} done
        </span>
      </div>

      <Progress value={pct} className="mb-4" />

      <div className="space-y-2">
        {tasks.map((t) => {
          const key = String(t.id);
          return (
            <Checkbox
              key={key}
              id={`task-${storageKey}-${key}`}
              label={stripEmoji(t.task)}
              checked={!!checked[key]}
              onCheckedChange={(v) => setChecked({ ...checked, [key]: v })}
            />
          );
        })}
      </div>
    </Card>
  );
}
