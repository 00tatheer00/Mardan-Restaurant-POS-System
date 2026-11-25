"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { localRows, localSave, replaceTable, type Data } from "@/lib/db";
import { isNetworkError } from "@/lib/sync";

export const db = () => createClient() as unknown as SupabaseClient;

type Opts = { order?: string; ascending?: boolean; select?: string };

const sortBy = <T,>(rows: T[], key: string, asc: boolean) =>
  [...rows].sort((a, b) => {
    const x = (a as Record<string, unknown>)[key];
    const y = (b as Record<string, unknown>)[key];
    const c = typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""));
    return asc ? c : -c;
  });

// Offline-first table: reads server → local cache, writes local → sync queue.
export function useTable<T extends { id: string }>(table: string, { order = "name", ascending = true, select = "*" }: Opts = {}) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (navigator.onLine) {
      try {
        const { data, error } = await db().from(table).select(select).order(order, { ascending });
        if (error && !isNetworkError(error)) toast.error(error.message);
        else if (data) await replaceTable(table, data as unknown as Data[]);
      } catch {
        // offline: fall through to cache
      }
    }
    setRows(sortBy(await localRows<T>(table), order, ascending));
    setLoading(false);
  }, [table, order, ascending, select]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    window.addEventListener("online", load);
    return () => {
      clearTimeout(t);
      window.removeEventListener("online", load);
    };
  }, [load]);

  const save = useCallback(
    async (values: Partial<T>, { silent = false } = {}) => {
      try {
        await localSave(table, { ...values, id: values.id ?? crypto.randomUUID() } as Data);
      } catch (e) {
        toast.error((e as Error).message);
        return false;
      }
      if (!silent) toast.success(navigator.onLine ? "Saved" : "Saved offline — will sync");
      setRows(sortBy(await localRows<T>(table), order, ascending));
      return true;
    },
    [table, order, ascending],
  );

  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  return { rows, loading, reload: load, save, byId };
}
