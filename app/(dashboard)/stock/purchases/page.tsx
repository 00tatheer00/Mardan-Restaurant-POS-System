"use client";

import { AlertCircle, ShoppingCart, Wallet } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { CrudSection } from "@/components/crud-section";
import { DateRange, useDateRange } from "@/components/date-range";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { useTable } from "@/lib/hooks/use-table";
import { formatDate, formatPKR, formatQty, inRange, todayStr } from "@/lib/format";
import { dateStr, num, optText, pick, pos } from "@/lib/validators";
import type { Tables } from "@/types";

type Purchase = Tables<"purchases">;

const schema = z.object({
  date: dateStr, raw_item_id: pick("Pick a raw item"), qty: pos, rate: num,
  supplier_id: z.string().nullable(), is_paid: z.boolean(), note: optText,
});

export default function PurchasesPage() {
  const table = useTable<Purchase>("purchases", { order: "date", ascending: false });
  const raw = useTable<Tables<"raw_items">>("raw_items");
  const suppliers = useTable<Tables<"suppliers">>("suppliers");
  const [range, setRange] = useDateRange("month");

  const rows = table.rows.filter((r) => inRange(r.date, range.from, range.to));
  const total = rows.reduce((a, r) => a + Number(r.total), 0);
  const unpaid = rows.filter((r) => !r.is_paid).reduce((a, r) => a + Number(r.total), 0);

  return (
    <>
      <PageHeader title="Purchases" description="Daily raw material buying" />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard tone="brand" title="Purchases" value={formatPKR(total)} hint={`${rows.length} entries`} icon={ShoppingCart} />
        <StatCard tone="emerald" title="Paid" value={formatPKR(total - unpaid)} icon={Wallet} />
        <StatCard tone="violet" title="Unpaid (credit)" value={formatPKR(unpaid)} icon={AlertCircle} />
      </div>
      <CrudSection
        table={table}
        noun="Purchase"
        emptyIcon={ShoppingCart}
        filter={(r) => inRange(r.date, range.from, range.to)}
        toolbar={<DateRange value={range} onChange={setRange} />}
        schema={schema}
        defaults={{ date: todayStr(), raw_item_id: undefined, qty: undefined, rate: undefined, supplier_id: null, is_paid: true, note: "" }}
        fromForm={(v) => ({ ...v, total: Math.round(Number(v.qty) * Number(v.rate) * 100) / 100 })}
        fields={[
          { name: "date", label: "Date", type: "date" },
          { name: "raw_item_id", label: "Raw item", type: "select", options: raw.rows.filter((r) => r.is_active).map((r) => ({ value: r.id, label: `${r.name} (${r.unit})` })) },
          { name: "qty", label: "Quantity", type: "number" },
          { name: "rate", label: "Rate per unit (Rs.)", type: "number", hint: "Total = qty × rate" },
          { name: "supplier_id", label: "Supplier", type: "select", nullable: true, options: suppliers.rows.filter((s) => s.is_active).map((s) => ({ value: s.id, label: s.name })) },
          { name: "is_paid", label: "Paid", type: "switch", hint: "Off = on credit" },
          { name: "note", label: "Note", type: "textarea" },
        ]}
        columns={[
          { key: "date", header: "Date", cell: (r) => formatDate(`${r.date}T12:00:00Z`) },
          { key: "item", header: "Item", cell: (r) => <span className="font-medium">{raw.byId.get(r.raw_item_id)?.name ?? "—"}</span> },
          { key: "qty", header: "Qty", className: "text-right tabular-nums", cell: (r) => `${formatQty(r.qty)} ${raw.byId.get(r.raw_item_id)?.unit ?? ""}` },
          { key: "rate", header: "Rate", className: "text-right tabular-nums", cell: (r) => formatPKR(r.rate) },
          { key: "total", header: "Total", className: "text-right tabular-nums font-semibold", cell: (r) => formatPKR(r.total) },
          { key: "supplier", header: "Supplier", cell: (r) => (r.supplier_id ? suppliers.byId.get(r.supplier_id)?.name : "—") },
          { key: "paid", header: "Status", cell: (r) => <Badge variant={r.is_paid ? "secondary" : "destructive"}>{r.is_paid ? "Paid" : "Credit"}</Badge> },
        ]}
      />
    </>
  );
}
