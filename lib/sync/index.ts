import { create } from "zustand";
import type { PostgrestError } from "@supabase/supabase-js";
import { cacheRows, ldb, localRows, type Data } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";

type SyncState = { pending: number; failed: number; syncing: boolean; lastError?: string };
export const useSync = create<SyncState>(() => ({ pending: 0, failed: 0, syncing: false }));

export const isNetworkError = (e: { message?: string; code?: string }) => !e.code && /fetch|network|load failed/i.test(e.message ?? "");
const permanent = (e: PostgrestError) => /^(22|23|42|PGRST2)/.test(e.code ?? "");

export async function refreshStatus(extra: Partial<SyncState> = {}) {
  const all = await ldb.queue.toArray();
  const failed = all.filter((q) => q.failed);
  useSync.setState({ pending: all.length - failed.length, failed: failed.length, lastError: failed[0]?.error, ...extra });
}

let running = false;

export async function syncNow() {
  if (running || !navigator.onLine) return refreshStatus();
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return refreshStatus();
  running = true;
  useSync.setState({ syncing: true });
  try {
    for (;;) {
      const item = (await ldb.queue.orderBy("seq").toArray()).find((q) => !q.failed);
      if (!item || item.next_try > Date.now()) break;
      const { error } = item.op === "delete"
        ? await supabase.from(item.table as never).delete().eq("id", item.payload.id)
        : await supabase.from(item.table as never).upsert(item.payload as never, { onConflict: "id" });
      if (!error) {
        await ldb.queue.delete(item.seq!);
        continue;
      }
      if (permanent(error)) {
        await ldb.queue.update(item.seq!, { failed: true, error: `${item.table}: ${error.message}` });
        continue;
      }
      const attempts = item.attempts + 1;
      await ldb.queue.update(item.seq!, { attempts, next_try: Date.now() + Math.min(60_000, 2_000 * 2 ** attempts) });
      break;
    }
  } finally {
    running = false;
    await refreshStatus({ syncing: false });
  }
}

export async function retryFailed() {
  await ldb.queue.toCollection().modify((q) => {
    q.failed = false;
    q.attempts = 0;
    q.next_try = 0;
  });
  await syncNow();
}

// Online: fetch from server and cache, then answer from the local store (includes unsynced rows).
export async function cachedQuery<T>(
  table: string,
  server: () => PromiseLike<{ data: unknown; error: PostgrestError | null }>,
  local: (r: T) => boolean,
): Promise<T[]> {
  if (navigator.onLine) {
    try {
      const { data, error } = await server();
      if (error && !isNetworkError(error)) throw error;
      if (data) await cacheRows(table, data as Data[]);
    } catch (e) {
      if (!isNetworkError(e as Error)) throw e;
    }
  }
  return localRows<T>(table, local);
}
