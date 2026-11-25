"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ClipboardCheck, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { localSave, type Data } from "@/lib/db";
import { db, useTable } from "@/lib/hooks/use-table";
import { cachedQuery } from "@/lib/sync";
import { formatQty, shiftDay, todayStr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Tables, Views } from "@/types";

type Recon = Views<"v_production_recon"> & { id: string };
type Closing = Tables<"day_closings">;
type Entry = { opening: number; leftover: number; wastage: number };

const withId = (rows: unknown) => ({ data: ((rows as Recon[] | null) ?? []).map((r) => ({ ...r, id: `${r.date}|${r.product_id}` })), error: null });

export default function DayClosingPage() {
  const [date, setDate] = useState(todayStr());
  const products = useTable<Tables<"products">>("products");
  const closings = useTable<Closing>("day_closings", { order: "date", ascending: false });
  const [recon, setRecon] = useState<Recon[] | null>(null);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await cachedQuery<Recon>(
        "v_production_recon",
        async () => withId((await db().from("v_production_recon").select("*").eq("date", date)).data),
        (r) => r.date === date,
      );
      setRecon(rows);
    } catch (e) {
      toast.error((e as Error).message);
      setRecon([]);
    }
  }, [date]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const prev = shiftDay(date, -1);
  const closingFor = (d: string, pid: string) => closings.rows.find((c) => c.date === d && c.product_id === pid);

  const entry = (pid: string): Entry => {
    if (entries[pid]) return entries[pid];
    const c = closingFor(date, pid);
    return c
      ? { opening: Number(c.opening_qty), leftover: Number(c.leftover_qty), wastage: Number(c.wastage_qty) }
      : { opening: Number(closingFor(prev, pid)?.leftover_qty ?? 0), leftover: 0, wastage: 0 };
  };

  const setEntry = (pid: string, k: keyof Entry, v: string) => setEntries((s) => ({ ...s, [pid]: { ...entry(pid), [k]: Math.max(0, Number(v) || 0) } }));

  const lines = products.rows.map((p) => {
    const r = recon?.find((x) => x.product_id === p.id);
    const e = entry(p.id);
    const produced = Number(r?.produced_qty ?? 0);
    const sold = Number(r?.sold_qty ?? 0);
    return { p, e, produced, sold, raw: Number(r?.raw_qty ?? 0), diff: e.opening + produced - sold - e.leftover - e.wastage, closed: !!closingFor(date, p.id) };
  });

  const save = async () => {
    setSaving(true);
    try {
      for (const l of lines) {
        if (!l.produced && !l.sold && !l.e.opening && !l.e.leftover && !l.e.wastage) continue;
        await localSave("day_closings", {
          id: closingFor(date, l.p.id)?.id ?? crypto.randomUUID(),
          date, product_id: l.p.id, opening_qty: l.e.opening, produced_qty: l.produced, sold_qty: l.sold,
          leftover_qty: l.e.leftover, wastage_qty: l.e.wastage, difference: l.diff,
        } as Data);
      }
      setEntries({});
      await closings.reload();
      toast.success(`Day closed for ${date}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Day Closing"
        description="Opening + Produced − Sold − Leftover − Wastage = Difference"
        actions={<Input type="date" value={date} max={todayStr()} onChange={(e) => e.target.value && (setDate(e.target.value), setEntries({}))} className="w-44" />}
      />
      {!recon || products.loading ? (
        <div className="grid gap-4 lg:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>
      ) : !products.rows.length ? (
        <p className="py-16 text-center text-muted-foreground">Add products in Menu → Products first.</p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {lines.map(({ p, e, produced, sold, raw, diff, closed }) => (
              <Card key={p.id} className="rounded-2xl">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="size-5 text-orange-500" /> {p.name}
                  </CardTitle>
                  {closed && <Badge variant="secondary"><CheckCircle2 className="text-emerald-600" /> Closed</Badge>}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <Metric label="Produced" value={produced} sub={raw ? `${formatQty(raw)} kg → ${formatQty(Math.round((produced / raw) * 100) / 100)}/kg` : undefined} />
                    <Metric label="Sold (POS)" value={sold} />
                    <Metric label="Expected left" value={e.opening + produced - sold} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["opening", "leftover", "wastage"] as const).map((k) => (
                      <label key={k} className="space-y-1 text-xs font-medium capitalize text-muted-foreground">
                        {k === "opening" ? "Opening (carried)" : k}
                        <Input type="number" min={0} value={e[k] || ""} placeholder="0" onChange={(ev) => setEntry(p.id, k, ev.target.value)} className="text-right tabular-nums" />
                      </label>
                    ))}
                  </div>
                  <div className={cn("flex items-center justify-between rounded-xl p-3 font-semibold", diff ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300")}>
                    <span>{diff ? "Unaccounted" : "Balanced"}</span>
                    <span className="text-xl tabular-nums">{diff > 0 ? "+" : ""}{formatQty(diff)} {p.unit}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={save} disabled={saving} className="bg-brand text-white shadow-lg">
              {saving ? <Loader2 className="animate-spin" /> : <Save />} Save day closing
            </Button>
          </div>
        </>
      )}
    </>
  );
}

function Metric({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{formatQty(value)}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
