"use client";

import { Beef, Gauge, Scale } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { CrudSection } from "@/components/crud-section";
import { DateRange, useDateRange } from "@/components/date-range";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { useTable } from "@/lib/hooks/use-table";
import { formatDate, formatQty, inRange, todayStr } from "@/lib/format";
import { dateStr, num, optText, pick, pos } from "@/lib/validators";
import type { Tables } from "@/types";

type Batch = Tables<"production_batches">;

const schema = z.object({
  date: dateStr, raw_item_id: pick("Pick raw item"), raw_qty: pos, product_id: pick("Pick product"), qty_produced: num, note: optText,
});

export default function ProductionPage() {
  const table = useTable<Batch>("production_batches", { order: "date", ascending: false });
  const raw = useTable<Tables<"raw_items">>("raw_items");
  const products = useTable<Tables<"products">>("products");
  const settings = useTable<Tables<"settings">>("settings", { order: "created_at" });
  const expected = Number(settings.rows[0]?.expected_yield_per_kg ?? 20);
  const [range, setRange] = useDateRange("today");

  const rows = table.rows.filter((r) => inRange(r.date, range.from, range.to));
  const used = rows.reduce((a, r) => a + Number(r.raw_qty), 0);
  const made = rows.reduce((a, r) => a + Number(r.qty_produced), 0);
  const avg = used ? made / used : 0;

  return (
    <>
      <PageHeader title="Production" description={`Raw material used → kababs made. Expected yield: ${formatQty(expected)} pcs/kg`} />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard tone="brand" title="Produced" value={formatQty(made)} hint={`${rows.length} batches`} icon={Beef} />
        <StatCard tone="sky" title="Raw used" value={formatQty(used)} icon={Scale} />
        <StatCard tone={avg && avg < expected ? "violet" : "emerald"} title="Avg yield / kg" value={formatQty(Math.round(avg * 100) / 100)} hint={`Expected ${formatQty(expected)}`} icon={Gauge} />
      </div>
      <CrudSection
        table={table}
        noun="Batch"
        emptyIcon={Beef}
        filter={(r) => inRange(r.date, range.from, range.to)}
        toolbar={<DateRange value={range} onChange={setRange} />}
        schema={schema}
        defaults={{ date: todayStr(), raw_item_id: raw.rows.find((r) => r.name.toLowerCase() === "qeema")?.id, raw_qty: undefined, product_id: products.rows[0]?.id, qty_produced: undefined, note: "" }}
        fields={[
          { name: "date", label: "Date", type: "date" },
          { name: "raw_item_id", label: "Raw item used", type: "select", options: raw.rows.filter((r) => r.is_active).map((r) => ({ value: r.id, label: `${r.name} (${r.unit})` })) },
          { name: "raw_qty", label: "Raw quantity used", type: "number", hint: "e.g. 10 kg" },
          { name: "product_id", label: "Product made", type: "select", options: products.rows.map((p) => ({ value: p.id, label: p.name })) },
          { name: "qty_produced", label: "Quantity produced", type: "number", step: "1", hint: "e.g. 200 pcs" },
          { name: "note", label: "Note", type: "textarea" },
        ]}
        columns={[
          { key: "date", header: "Date", cell: (r) => formatDate(`${r.date}T12:00:00Z`) },
          { key: "raw", header: "Raw used", cell: (r) => `${formatQty(r.raw_qty)} ${raw.byId.get(r.raw_item_id)?.unit ?? ""} ${raw.byId.get(r.raw_item_id)?.name ?? ""}` },
          { key: "product", header: "Product", cell: (r) => <span className="font-medium">{products.byId.get(r.product_id)?.name ?? "—"}</span> },
          { key: "made", header: "Produced", className: "text-right tabular-nums", cell: (r) => formatQty(r.qty_produced) },
          {
            key: "yield", header: "Yield / kg", className: "text-right",
            cell: (r) => {
              const y = Number(r.qty_produced) / Number(r.raw_qty);
              return <Badge variant={y < expected ? "destructive" : "secondary"} className="tabular-nums">{formatQty(Math.round(y * 100) / 100)}</Badge>;
            },
          },
          { key: "note", header: "Note", cell: (r) => <span className="text-muted-foreground">{r.note ?? ""}</span> },
        ]}
      />
    </>
  );
}
