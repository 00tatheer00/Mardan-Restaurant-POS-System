import Dexie, { type Table } from "dexie";

export type Data = Record<string, unknown> & { id: string };
export type LocalRow = { table: string; id: string; data: Data };
export type QueueItem = {
  seq?: number; table: string; op: "upsert" | "delete"; payload: Data; created_at: number;
  attempts: number; next_try: number; failed?: boolean; error?: string;
};

class LocalDB extends Dexie {
  rows!: Table<LocalRow, [string, string]>;
  queue!: Table<QueueItem, number>;
  meta!: Table<{ key: string; value: unknown }, string>;
  constructor() {
    super("kabab-house");
    this.version(1).stores({ rows: "[table+id], table", queue: "++seq, table", meta: "key" });
  }
}

export const ldb = new LocalDB();

const scalar = (d: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(d).filter(([, v]) => v === null || typeof v !== "object" || Array.isArray(v))) as Data;

export async function localRows<T>(table: string, filter?: (r: T) => boolean): Promise<T[]> {
  const rows = (await ldb.rows.where("table").equals(table).toArray()).map((r) => r.data as T);
  return filter ? rows.filter(filter) : rows;
}

export const getRow = async <T>(table: string, id: string) => (await ldb.rows.get([table, id]))?.data as T | undefined;

export async function cacheRows(table: string, data: Data[]) {
  await ldb.rows.bulkPut(data.map((d) => ({ table, id: d.id, data: d })));
}

async function pendingIds(table: string) {
  return new Set((await ldb.queue.where("table").equals(table).toArray()).map((q) => q.payload.id));
}

// Server wins for master data, except rows with unsynced local changes.
export async function replaceTable(table: string, data: Data[]) {
  const pending = await pendingIds(table);
  await ldb.transaction("rw", ldb.rows, ldb.queue, async () => {
    const stale = (await ldb.rows.where("table").equals(table).primaryKeys()).filter(([, id]) => !pending.has(id));
    await ldb.rows.bulkDelete(stale);
    await ldb.rows.bulkPut(data.filter((d) => !pending.has(d.id)).map((d) => ({ table, id: d.id, data: d })));
  });
}

export async function localSaveMany(table: string, rows: Data[]) {
  const saved: Data[] = [];
  await ldb.transaction("rw", ldb.rows, ldb.queue, async () => {
    for (const row of rows) {
      const prev = (await ldb.rows.get([table, row.id]))?.data;
      const data = scalar({ ...prev, ...row });
      await ldb.rows.put({ table, id: row.id, data });
      await ldb.queue.add({ table, op: "upsert", payload: data, created_at: Date.now(), attempts: 0, next_try: 0 });
      saved.push(data);
    }
  });
  window.dispatchEvent(new Event("kh-queue"));
  return saved;
}

export const localSave = async (table: string, row: Data) => (await localSaveMany(table, [row]))[0];

export async function localDelete(table: string, ids: string[]) {
  if (!ids.length) return;
  await ldb.transaction("rw", ldb.rows, ldb.queue, async () => {
    for (const id of ids) {
      await ldb.rows.delete([table, id]);
      await ldb.queue.add({ table, op: "delete", payload: { id }, created_at: Date.now(), attempts: 0, next_try: 0 });
    }
  });
  window.dispatchEvent(new Event("kh-queue"));
}
