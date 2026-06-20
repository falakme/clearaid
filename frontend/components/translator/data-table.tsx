"use client";

import { Table2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { stripEmoji } from "@/lib/text";
import type { Translator } from "@/lib/i18n";
import type { TableData } from "@/lib/types";

/**
 * Renders structured allocations (fees, costs, eligibility brackets).
 * FAILSAFE: renders nothing at all when there are no headers.
 */
export function DataTable({ data, t }: { data: TableData; t: Translator }) {
  if (!data || !data.headers || data.headers.length === 0) return null;

  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase text-primary">
        <Table2 className="h-4 w-4" /> {t("breakdown")}
      </h2>
      <Table>
        <TableHeader>
          <TableRow>
            {data.headers.map((h, i) => (
              <TableHead key={i}>{stripEmoji(h)}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.map((row, r) => (
            <TableRow key={r}>
              {row.map((cell, c) => (
                <TableCell key={c} className={c === 0 ? "font-semibold" : ""}>
                  {stripEmoji(cell)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
