"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Inbox, Search, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type Column<T> = { key: string; header: string; cell?: (row: T) => React.ReactNode; className?: string };

type Props<T> = {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchKeys?: (keyof T)[];
  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  pageSize?: number;
  emptyText?: string;
  emptyIcon?: LucideIcon;
  rowKey?: (row: T) => string;
};

export function DataTable<T>({
  data, columns, loading, searchKeys, searchPlaceholder = "Search…", toolbar, pageSize = 15,
  emptyText = "Nothing here yet", emptyIcon: EmptyIcon = Inbox, rowKey,
}: Props<T>) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s || !searchKeys?.length) return data;
    return data.filter((r) => searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(s)));
  }, [data, q, searchKeys]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * pageSize, (current + 1) * pageSize);

  return (
    <div className="space-y-3">
      {(searchKeys?.length || toolbar) && (
        <div className="flex flex-wrap items-center gap-2">
          {!!searchKeys?.length && (
            <div className="relative w-full max-w-xs">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder={searchPlaceholder} className="pl-9" />
            </div>
          )}
          {toolbar}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {columns.map((c) => <TableHead key={c.key} className={c.className}>{c.header}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={i}>{columns.map((c) => <TableCell key={c.key}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>
              ))
            ) : rows.length ? (
              rows.map((r, i) => (
                <TableRow key={rowKey?.(r) ?? (r as { id?: string }).id ?? i}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className={c.className}>{c.cell ? c.cell(r) : String((r as Record<string, unknown>)[c.key] ?? "—")}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length}>
                  <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                    <div className="flex size-12 items-center justify-center rounded-full bg-orange-500/10 text-orange-600"><EmptyIcon /></div>
                    <p className="text-sm">{q ? "No matches" : emptyText}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filtered.length > pageSize && (
        <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
          <span className="tabular-nums">
            {current * pageSize + 1}–{Math.min((current + 1) * pageSize, filtered.length)} of {filtered.length}
          </span>
          <Button variant="outline" size="icon-sm" disabled={current === 0} onClick={() => setPage(current - 1)}><ChevronLeft /></Button>
          <Button variant="outline" size="icon-sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}><ChevronRight /></Button>
        </div>
      )}
    </div>
  );
}
