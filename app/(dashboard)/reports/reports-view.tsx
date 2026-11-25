"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/data-table";
import { DateRange, useDateRange, type Range } from "@/components/date-range";
import { db } from "@/lib/hooks/use-table";
import { downloadCSV } from "@/lib/csv";
import { formatDate, formatPKR, formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Views } from "@/types";

type Col<T> = Column<T> & { csv: (r: T) => string | number | null };
const money = "text-right tabular-nums";
const day = (d: string) => formatDate(`${d}T12:00:00Z`);

function useReport<T>(range: Range, fetch: (r: Range) => PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const { data, error } = await fetch(range);
    if (error) toast.error(error.message);
    setRows((data as T[]) ?? []);
    setLoading(false);
  }, [range, fetch]);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);
  return { rows, loading };
}

function Report<T>({ name, range, rows, loading, cols, summary }: {
  name: string; range: Range; rows: T[]; loading: boolean; cols: Col<T>[]; summary: [string, string, boolean?][];
}) {
  return (
    <div className="space-y-4">
      <div className="hidden print:block">
        <h2 className="text-xl font-bold">{name} report</h2>
        <p className="text-sm">{day(range.from)} – {day(range.to)}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map(([label, value, bad]) => (
          <div key={label} className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("text-xl font-bold tabular-nums", bad && "text-destructive")}>{value}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="outline" onClick={() => downloadCSV(`${name.toLowerCase().replace(/\W+/g, "-")}-${range.from}-to-${range.to}`, rows, cols.map((c) => ({ header: c.header, value: c.csv })))}>
          <Download /> CSV
        </Button>
        <Button variant="outline" onClick={() => window.print()}><Printer /> Print / PDF</Button>
      </div>
      <DataTable data={rows} columns={cols} loading={loading} pageSize={1000} emptyText="No data in this period" />
    </div>
  );
}

const sum = <T,>(rows: T[], f: (r: T) => unknown) => rows.reduce((a, r) => a + Number(f(r) ?? 0), 0);

function Sales({ range }: { range: Range }) {
  const fetch = useCallback((r: Range) => db().from("v_daily_sales").select("*").gte("date", r.from).lte("date", r.to).order("date"), []);
  const { rows, loading } = useReport<Views<"v_daily_sales">>(range, fetch);
  const total = sum(rows, (r) => r.total);
  const orders = sum(rows, (r) => r.orders_count);
  return (
    <Report name="Sales" range={range} rows={rows} loading={loading}
      summary={[["Sales", formatPKR(total)], ["Orders", formatQty(orders)], ["Avg bill", formatPKR(orders ? total / orders : 0)], ["Discounts", formatPKR(sum(rows, (r) => r.discount))]]}
      cols={[
        { key: "date", header: "Date", cell: (r) => day(r.date), csv: (r) => r.date },
        { key: "orders_count", header: "Orders", className: money, csv: (r) => r.orders_count },
        { key: "subtotal", header: "Subtotal", className: money, cell: (r) => formatPKR(r.subtotal), csv: (r) => r.subtotal },
        { key: "discount", header: "Discount", className: money, cell: (r) => formatPKR(r.discount), csv: (r) => r.discount },
        { key: "tax_amount", header: "Tax", className: money, cell: (r) => formatPKR(r.tax_amount), csv: (r) => r.tax_amount },
        { key: "cash", header: "Cash", className: money, cell: (r) => formatPKR(r.cash), csv: (r) => r.cash },
        { key: "digital", header: "Card/Wallet", className: money, cell: (r) => formatPKR(Number(r.card) + Number(r.jazzcash) + Number(r.easypaisa)), csv: (r) => Number(r.card) + Number(r.jazzcash) + Number(r.easypaisa) },
        { key: "total", header: "Total", className: cn(money, "font-semibold"), cell: (r) => formatPKR(r.total), csv: (r) => r.total },
      ]}
    />
  );
}

function PnL({ range }: { range: Range }) {
  const fetch = useCallback((r: Range) => db().from("v_daily_pnl").select("*").gte("date", r.from).lte("date", r.to).order("date"), []);
  const { rows, loading } = useReport<Views<"v_daily_pnl">>(range, fetch);
  const net = sum(rows, (r) => r.net);
  return (
    <Report name="Profit & Loss" range={range} rows={rows} loading={loading}
      summary={[["Sales", formatPKR(sum(rows, (r) => r.sales))], ["Purchases", formatPKR(sum(rows, (r) => r.purchases))], ["Expenses + Salaries", formatPKR(sum(rows, (r) => Number(r.expenses) + Number(r.salaries)))], ["Net", formatPKR(net), net < 0]]}
      cols={[
        { key: "date", header: "Date", cell: (r) => day(r.date), csv: (r) => r.date },
        { key: "sales", header: "Sales", className: money, cell: (r) => formatPKR(r.sales), csv: (r) => r.sales },
        { key: "purchases", header: "Purchases", className: money, cell: (r) => formatPKR(r.purchases), csv: (r) => r.purchases },
        { key: "expenses", header: "Expenses", className: money, cell: (r) => formatPKR(r.expenses), csv: (r) => r.expenses },
        { key: "salaries", header: "Salaries", className: money, cell: (r) => formatPKR(r.salaries), csv: (r) => r.salaries },
        { key: "net", header: "Net", className: cn(money, "font-semibold"), cell: (r) => <span className={cn(Number(r.net) < 0 && "text-destructive")}>{formatPKR(r.net)}</span>, csv: (r) => r.net },
      ]}
    />
  );
}

type ItemRow = { name: string; category: string; qty: number; amount: number };
function Items({ range }: { range: Range }) {
  const fetch = useCallback(async (r: Range) => {
    const res = await db().from("v_item_sales").select("*").gte("date", r.from).lte("date", r.to);
    const map = new Map<string, ItemRow>();
    for (const i of (res.data ?? []) as Views<"v_item_sales">[]) {
      const m = map.get(i.name) ?? { name: i.name, category: i.category_name ?? "—", qty: 0, amount: 0 };
      m.qty += Number(i.qty);
      m.amount += Number(i.amount);
      map.set(i.name, m);
    }
    return { data: [...map.values()].sort((a, b) => b.amount - a.amount), error: res.error };
  }, []);
  const { rows, loading } = useReport<ItemRow>(range, fetch);
  return (
    <Report name="Items" range={range} rows={rows} loading={loading}
      summary={[["Items sold", formatQty(sum(rows, (r) => r.qty))], ["Item sales (before discount)", formatPKR(sum(rows, (r) => r.amount))], ["Best seller", rows[0]?.name ?? "—"]]}
      cols={[
        { key: "name", header: "Item", cell: (r) => <span className="font-medium">{r.name}</span>, csv: (r) => r.name },
        { key: "category", header: "Category", csv: (r) => r.category },
        { key: "qty", header: "Qty", className: money, cell: (r) => formatQty(r.qty), csv: (r) => r.qty },
        { key: "amount", header: "Amount", className: cn(money, "font-semibold"), cell: (r) => formatPKR(r.amount), csv: (r) => r.amount },
      ]}
    />
  );
}

function Production({ range }: { range: Range }) {
  const fetch = useCallback((r: Range) => db().from("v_production_recon").select("*").gte("date", r.from).lte("date", r.to).order("date"), []);
  const { rows, loading } = useReport<Views<"v_production_recon">>(range, fetch);
  const raw = sum(rows, (r) => r.raw_qty);
  const made = sum(rows, (r) => r.produced_qty);
  return (
    <Report name="Production" range={range} rows={rows} loading={loading}
      summary={[["Produced", formatQty(made)], ["Sold", formatQty(sum(rows, (r) => r.sold_qty))], ["Wastage", formatQty(sum(rows, (r) => r.wastage_qty))], ["Avg yield / kg", formatQty(raw ? Math.round((made / raw) * 100) / 100 : 0)]]}
      cols={[
        { key: "date", header: "Date", cell: (r) => day(r.date), csv: (r) => r.date },
        { key: "product_name", header: "Product", csv: (r) => r.product_name },
        { key: "raw_qty", header: "Raw kg", className: money, cell: (r) => formatQty(r.raw_qty), csv: (r) => r.raw_qty },
        { key: "produced_qty", header: "Produced", className: money, cell: (r) => formatQty(r.produced_qty), csv: (r) => r.produced_qty },
        { key: "yield_per_kg", header: "Yield/kg", className: money, cell: (r) => (r.yield_per_kg == null ? "—" : formatQty(r.yield_per_kg)), csv: (r) => r.yield_per_kg },
        { key: "sold_qty", header: "Sold", className: money, cell: (r) => formatQty(r.sold_qty), csv: (r) => r.sold_qty },
        { key: "leftover_qty", header: "Leftover", className: money, cell: (r) => formatQty(r.leftover_qty), csv: (r) => r.leftover_qty },
        { key: "wastage_qty", header: "Wastage", className: money, cell: (r) => formatQty(r.wastage_qty), csv: (r) => r.wastage_qty },
        {
          key: "difference", header: "Difference", className: money,
          cell: (r) => <span className={cn("font-semibold", Number(r.difference) !== 0 && r.is_closed && "text-destructive")}>{r.is_closed ? formatQty(r.difference) : "not closed"}</span>,
          csv: (r) => (r.is_closed ? r.difference : ""),
        },
      ]}
    />
  );
}

type ExpRow = { category: string; count: number; amount: number };
function Expenses({ range }: { range: Range }) {
  const fetch = useCallback(async (r: Range) => {
    const [ex, cats] = await Promise.all([
      db().from("expenses").select("category_id, amount").gte("date", r.from).lte("date", r.to),
      db().from("expense_categories").select("id, name"),
    ]);
    const names = new Map((cats.data ?? []).map((c: { id: string; name: string }) => [c.id, c.name]));
    const map = new Map<string, ExpRow>();
    for (const e of (ex.data ?? []) as { category_id: string; amount: number }[]) {
      const name = names.get(e.category_id) ?? "—";
      const m = map.get(name) ?? { category: name, count: 0, amount: 0 };
      m.count += 1;
      m.amount += Number(e.amount);
      map.set(name, m);
    }
    return { data: [...map.values()].sort((a, b) => b.amount - a.amount), error: ex.error ?? cats.error };
  }, []);
  const { rows, loading } = useReport<ExpRow>(range, fetch);
  return (
    <Report name="Expenses" range={range} rows={rows} loading={loading}
      summary={[["Total expenses", formatPKR(sum(rows, (r) => r.amount))], ["Entries", formatQty(sum(rows, (r) => r.count))], ["Biggest", rows[0]?.category ?? "—"]]}
      cols={[
        { key: "category", header: "Category", cell: (r) => <span className="font-medium">{r.category}</span>, csv: (r) => r.category },
        { key: "count", header: "Entries", className: money, csv: (r) => r.count },
        { key: "amount", header: "Amount", className: cn(money, "font-semibold"), cell: (r) => formatPKR(r.amount), csv: (r) => r.amount },
      ]}
    />
  );
}

export function ReportsView({ owner }: { owner: boolean }) {
  const [range, setRange] = useDateRange(owner ? "month" : "today");
  const tabs: [string, string, React.ComponentType<{ range: Range }>][] = [
    ["sales", "Sales", Sales],
    ...(owner ? ([["pnl", "Profit & Loss", PnL]] as [string, string, React.ComponentType<{ range: Range }>][]) : []),
    ["items", "Items", Items],
    ["production", "Production", Production],
    ["expenses", "Expenses", Expenses],
  ];
  return (
    <Tabs defaultValue="sales" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <TabsList>{tabs.map(([v, label]) => <TabsTrigger key={v} value={v}>{label}</TabsTrigger>)}</TabsList>
        <DateRange value={range} onChange={setRange} disabled={!owner} />
      </div>
      {tabs.map(([v, , C]) => <TabsContent key={v} value={v}><C range={range} /></TabsContent>)}
    </Tabs>
  );
}
