"use client";

import { useState } from "react";
import { HandCoins, Truck } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { CrudSection } from "@/components/crud-section";
import { FormDialog } from "@/components/form-dialog";
import { PageHeader } from "@/components/page-header";
import { useTable } from "@/lib/hooks/use-table";
import { formatPKR, todayStr } from "@/lib/format";
import { dateStr, optText, pos, req } from "@/lib/validators";
import { cn } from "@/lib/utils";
import type { Tables, Views } from "@/types";

type Supplier = Tables<"suppliers">;
type Ledger = Views<"v_supplier_ledger"> & { id: string };

const schema = z.object({ name: req, phone: optText, is_active: z.boolean() });
const paySchema = z.object({ date: dateStr, amount: pos, note: optText });

export default function SuppliersPage() {
  const table = useTable<Supplier>("suppliers");
  const ledger = useTable<Ledger>("v_supplier_ledger", { select: "id:supplier_id, purchased, paid, balance", order: "id" });
  const payments = useTable<Tables<"supplier_payments">>("supplier_payments", { order: "date", ascending: false });
  const [paying, setPaying] = useState<Supplier | null>(null);
  const amt = (id: string, k: "purchased" | "paid" | "balance") => Number(ledger.byId.get(id)?.[k] ?? 0);

  return (
    <>
      <PageHeader title="Suppliers" description="Supplier list and ledger: purchased, paid, balance due" />
      <CrudSection
        table={table}
        noun="Supplier"
        searchKeys={["name", "phone"]}
        emptyIcon={Truck}
        schema={schema}
        defaults={{ name: "", phone: "", is_active: true }}
        fields={[
          { name: "name", label: "Name" },
          { name: "phone", label: "Phone" },
          { name: "is_active", label: "Active", type: "switch" },
        ]}
        columns={[
          { key: "name", header: "Name", cell: (r) => <span className="font-medium">{r.name}</span> },
          { key: "phone", header: "Phone", cell: (r) => r.phone ?? "—" },
          { key: "purchased", header: "Purchased", className: "text-right tabular-nums", cell: (r) => formatPKR(amt(r.id, "purchased")) },
          { key: "paid", header: "Paid", className: "text-right tabular-nums", cell: (r) => formatPKR(amt(r.id, "paid")) },
          {
            key: "balance", header: "Balance due", className: "text-right tabular-nums",
            cell: (r) => <span className={cn("font-semibold", amt(r.id, "balance") > 0 && "text-destructive")}>{formatPKR(amt(r.id, "balance"))}</span>,
          },
          { key: "pay", header: "", className: "w-20", cell: (r) => <Button size="sm" variant="outline" onClick={() => setPaying(r)}><HandCoins /> Pay</Button> },
        ]}
      />
      <FormDialog
        key={paying?.id}
        open={!!paying}
        onOpenChange={(o) => !o && setPaying(null)}
        title={`Pay ${paying?.name ?? ""}`}
        schema={paySchema}
        values={{ date: todayStr(), amount: paying ? Math.max(0, amt(paying.id, "balance")) : 0, note: "" }}
        fields={[
          { name: "date", label: "Date", type: "date" },
          { name: "amount", label: "Amount (Rs.)", type: "number", step: "1" },
          { name: "note", label: "Note", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          const ok = await payments.save({ ...v, supplier_id: paying!.id } as Partial<Tables<"supplier_payments">>);
          if (ok) void ledger.reload();
          return ok;
        }}
      />
    </>
  );
}
