"use client";

import { Package } from "lucide-react";
import { z } from "zod";
import { CrudSection } from "@/components/crud-section";
import { PageHeader } from "@/components/page-header";
import { useTable } from "@/lib/hooks/use-table";
import { formatQty } from "@/lib/format";
import { req } from "@/lib/validators";
import { cn } from "@/lib/utils";
import type { Tables, Views } from "@/types";

type Stock = Views<"v_raw_stock"> & { id: string };
const UNITS = [{ value: "kg", label: "kg" }, { value: "litre", label: "litre" }, { value: "piece", label: "piece" }];
const schema = z.object({ name: req, unit: z.enum(["kg", "litre", "piece"]), is_active: z.boolean() });

export default function RawItemsPage() {
  const table = useTable<Tables<"raw_items">>("raw_items");
  const stock = useTable<Stock>("v_raw_stock", { select: "id:raw_item_id, purchased_qty, used_qty, balance_qty", order: "id" });
  const qty = (id: string, k: "purchased_qty" | "used_qty" | "balance_qty") => Number(stock.byId.get(id)?.[k] ?? 0);

  return (
    <>
      <PageHeader title="Raw Items" description="Raw material list and current stock (purchased − used in production)" />
      <CrudSection
        table={table}
        noun="Raw item"
        searchKeys={["name"]}
        emptyIcon={Package}
        schema={schema}
        defaults={{ name: "", unit: "kg", is_active: true }}
        fields={[
          { name: "name", label: "Name", placeholder: "e.g. Qeema" },
          { name: "unit", label: "Unit", type: "select", options: UNITS },
          { name: "is_active", label: "Active", type: "switch" },
        ]}
        columns={[
          { key: "name", header: "Name", cell: (r) => <span className="font-medium">{r.name}</span> },
          { key: "purchased", header: "Purchased", className: "text-right tabular-nums", cell: (r) => `${formatQty(qty(r.id, "purchased_qty"))} ${r.unit}` },
          { key: "used", header: "Used", className: "text-right tabular-nums", cell: (r) => `${formatQty(qty(r.id, "used_qty"))} ${r.unit}` },
          {
            key: "balance", header: "In stock", className: "text-right tabular-nums",
            cell: (r) => <span className={cn("font-semibold", qty(r.id, "balance_qty") <= 0 && "text-destructive")}>{formatQty(qty(r.id, "balance_qty"))} {r.unit}</span>,
          },
        ]}
      />
    </>
  );
}
