"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Banknote, Beef, Receipt, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bars, Donut, TrendLine } from "@/components/charts";
import { StatCard } from "@/components/stat-card";
import { db } from "@/lib/hooks/use-table";
import { formatDate, formatPKR, formatQty, shiftDay, todayStr } from "@/lib/format";
import { PAYMENT_LABEL } from "@/lib/pos/orders";
import { cn } from "@/lib/utils";
import type { Tables, Views } from "@/types";

type Data = {
  sales: Views<"v_daily_sales">[]; pnl?: Views<"v_daily_pnl">; items: Views<"v_item_sales">[];
  hourly: Views<"v_hourly_sales">[]; prod: Views<"v_production_recon">[]; cats: Tables<"categories">[];
};

export function DashboardView({ owner }: { owner: boolean }) {
  const [days, setDays] = useState(owner ? 7 : 1);
  const [d, setD] = useState<Data | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(async () => {
    const today = todayStr();
    const from = shiftDay(today, -(days - 1));
    const q = db();
    const [sales, pnl, items, hourly, prod, cats] = await Promise.all([
      q.from("v_daily_sales").select("*").gte("date", from).lte("date", today),
      q.from("v_daily_pnl").select("*").eq("date", today).maybeSingle(),
      q.from("v_item_sales").select("*").gte("date", from).lte("date", today),
      q.from("v_hourly_sales").select("*").eq("date", today),
      q.from("v_production_recon").select("*").eq("date", today),
      q.from("categories").select("*").order("sort_order"),
    ]);
    const err = [sales, pnl, items, hourly, prod, cats].find((r) => r.error)?.error;
    if (err) toast.error(err.message);
    setD({ sales: sales.data ?? [], pnl: pnl.data ?? undefined, items: items.data ?? [], hourly: hourly.data ?? [], prod: prod.data ?? [], cats: cats.data ?? [] });
  }, [days]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    const channel = db()
      .channel("orders-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        clearTimeout(timer.current);
        timer.current = setTimeout(load, 1500);
      })
      .subscribe();
    return () => {
      clearTimeout(t);
      void db().removeChannel(channel);
    };
  }, [load]);

  const view = useMemo(() => {
    if (!d) return null;
    const today = todayStr();
    const t = d.sales.find((s) => s.date === today);
    const trend = Array.from({ length: days }, (_, i) => {
      const date = shiftDay(today, i - days + 1);
      return { day: formatDate(`${date}T12:00:00Z`, "dd MMM"), total: Number(d.sales.find((s) => s.date === date)?.total ?? 0) };
    });
    const pay = (["cash", "card", "jazzcash", "easypaisa"] as const)
      .map((k, slot) => ({ name: PAYMENT_LABEL[k], value: d.sales.reduce((a, s) => a + Number(s[k]), 0), slot }))
      .filter((p) => p.value);
    const catTotals = new Map<string, number>();
    const itemTotals = new Map<string, number>();
    for (const i of d.items) {
      catTotals.set(i.category_id ?? "", (catTotals.get(i.category_id ?? "") ?? 0) + Number(i.amount));
      itemTotals.set(i.name, (itemTotals.get(i.name) ?? 0) + Number(i.amount));
    }
    const catRows = d.cats.map((c, slot) => ({ name: c.name, value: catTotals.get(c.id) ?? 0, slot: Math.min(slot, 5) })).filter((c) => c.value);
    const byCat = catRows.filter((c) => c.slot < 5).concat(catRows.some((c) => c.slot === 5) ? [{ name: "Other", value: catRows.filter((c) => c.slot === 5).reduce((a, c) => a + c.value, 0), slot: 5 }] : []);
    const top = [...itemTotals].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, amount]) => ({ name, amount }));
    const hrs = d.hourly.map((h) => h.hour);
    const hourly = hrs.length
      ? Array.from({ length: Math.max(...hrs) - Math.min(...hrs) + 1 }, (_, i) => {
          const h = Math.min(...hrs) + i;
          return { hour: `${h % 12 || 12}${h < 12 ? "am" : "pm"}`, total: Number(d.hourly.find((x) => x.hour === h)?.total ?? 0) };
        })
      : [];
    const produced = d.prod.reduce((a, p) => a + Number(p.produced_qty), 0);
    const sold = d.prod.reduce((a, p) => a + Number(p.sold_qty), 0);
    const costs = Number(d.pnl?.expenses ?? 0) + Number(d.pnl?.purchases ?? 0) + Number(d.pnl?.salaries ?? 0);
    return { t, trend, pay, byCat, top, hourly, produced, sold, costs };
  }, [d, days]);

  if (!view) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        <Skeleton className="h-80 rounded-2xl sm:col-span-2 xl:col-span-5" />
      </div>
    );
  }

  const sales = Number(view.t?.total ?? 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard tone="brand" title="Today's sales" value={formatPKR(sales)} hint={`${view.t?.orders_count ?? 0} orders`} icon={Banknote} />
        <StatCard tone="emerald" title="Avg bill" value={formatPKR(view.t?.avg_bill ?? 0)} icon={Receipt} />
        <StatCard tone="sky" title="Today's expenses" value={formatPKR(view.costs)} hint="Incl. purchases & salaries" icon={Wallet} />
        <StatCard tone="violet" title="Today's net" value={formatPKR(sales - view.costs)} icon={TrendingUp} />
        <StatCard tone="orange" title="Kababs made / sold" value={`${formatQty(view.produced)} / ${formatQty(view.sold)}`} icon={Beef} />
      </div>

      {owner && (
        <Card className="rounded-2xl">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Sales · last {days} days</CardTitle>
            <div className="flex rounded-lg bg-muted p-0.5 text-xs">
              {[7, 30].map((n) => (
                <button key={n} type="button" onClick={() => setDays(n)} className={cn("rounded-md px-3 py-1.5", days === n ? "bg-card font-medium shadow" : "text-muted-foreground")}>
                  {n} days
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent><TrendLine data={view.trend} x="day" y="total" label="Sales" /></CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title={`Top items${owner ? ` · ${days} days` : " · today"}`}>
          {view.top.length ? <Bars data={view.top} x="name" y="amount" label="Sales" horizontal height={Math.max(160, view.top.length * 32)} /> : <Empty />}
        </ChartCard>
        <ChartCard title="Hourly sales · today">
          {view.hourly.length ? <Bars data={view.hourly} x="hour" y="total" label="Sales" colorIndex={1} /> : <Empty />}
        </ChartCard>
        <ChartCard title={`Sales by category${owner ? ` · ${days} days` : ""}`}><Donut data={view.byCat} /></ChartCard>
        <ChartCard title={`Payment methods${owner ? ` · ${days} days` : ""}`}><Donut data={view.pay} /></ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const Empty = () => <p className="py-16 text-center text-sm text-muted-foreground">No sales yet</p>;
