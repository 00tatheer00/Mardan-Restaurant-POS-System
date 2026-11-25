"use client";

import { useState } from "react";
import { Banknote, HandCoins, History, WalletCards } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { useTable } from "@/lib/hooks/use-table";
import { formatDate, formatPKR, todayStr } from "@/lib/format";
import { dateStr, optText, pos } from "@/lib/validators";
import type { Tables } from "@/types";

type Staff = Tables<"staff">;
type Advance = Tables<"salary_advances">;
type Payment = Tables<"salary_payments">;

const advSchema = z.object({ date: dateStr, amount: pos, note: optText });
const paySchema = z.object({ paid_on: dateStr, amount_paid: pos, note: optText });
const noteFields = [{ name: "note", label: "Note", type: "textarea" as const }];

export default function SalaryPage() {
  const staff = useTable<Staff>("staff");
  const advances = useTable<Advance>("salary_advances", { order: "date", ascending: false });
  const payments = useTable<Payment>("salary_payments", { order: "paid_on", ascending: false });
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [dialog, setDialog] = useState<{ kind: "advance" | "pay"; s: Staff } | null>(null);

  const monthDate = `${month}-01`;
  const sum = <T,>(rows: T[], f: (r: T) => boolean, v: (r: T) => number) => rows.filter(f).reduce((a, r) => a + v(r), 0);

  const lines = staff.rows.filter((s) => s.is_active).map((s) => {
    const adv = sum(advances.rows, (a) => a.staff_id === s.id && a.date.startsWith(month), (a) => Number(a.amount));
    const paid = sum(payments.rows, (p) => p.staff_id === s.id && p.month === monthDate, (p) => Number(p.amount_paid));
    const base = Number(s.monthly_salary);
    return { ...s, adv, paid, base, payable: Math.max(0, base - adv - paid) };
  });

  const totals = lines.reduce((a, l) => ({ base: a.base + l.base, adv: a.adv + l.adv, paid: a.paid + l.paid, due: a.due + l.payable }), { base: 0, adv: 0, paid: 0, due: 0 });
  const history = [
    ...advances.rows.filter((a) => a.date.startsWith(month)).map((a) => ({ id: a.id, date: a.date, staff_id: a.staff_id, type: "Advance", amount: Number(a.amount), note: a.note })),
    ...payments.rows.filter((p) => p.month === monthDate).map((p) => ({ id: p.id, date: p.paid_on ?? p.month, staff_id: p.staff_id, type: "Salary", amount: Number(p.amount_paid), note: p.note })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const s = dialog?.s;
  const line = lines.find((l) => l.id === s?.id);

  return (
    <>
      <PageHeader
        title="Salary"
        description="Base salary − advances − already paid = payable"
        actions={<Input type="month" value={month} max={todayStr().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} className="w-44" />}
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="brand" title="Payable" value={formatPKR(totals.due)} icon={WalletCards} />
        <StatCard tone="sky" title="Salary bill" value={formatPKR(totals.base)} icon={Banknote} />
        <StatCard tone="violet" title="Advances" value={formatPKR(totals.adv)} icon={HandCoins} />
        <StatCard tone="emerald" title="Paid" value={formatPKR(totals.paid)} icon={History} />
      </div>

      <DataTable
        data={lines}
        loading={staff.loading}
        emptyIcon={WalletCards}
        emptyText="Add staff first"
        columns={[
          { key: "name", header: "Staff", cell: (l) => <><p className="font-medium">{l.name}</p><p className="text-xs text-muted-foreground">{l.designation}</p></> },
          { key: "base", header: "Base", className: "text-right tabular-nums", cell: (l) => formatPKR(l.base) },
          { key: "adv", header: "Advances", className: "text-right tabular-nums", cell: (l) => formatPKR(l.adv) },
          { key: "paid", header: "Paid", className: "text-right tabular-nums", cell: (l) => formatPKR(l.paid) },
          { key: "payable", header: "Payable", className: "text-right tabular-nums font-semibold", cell: (l) => formatPKR(l.payable) },
          {
            key: "status", header: "Status",
            cell: (l) => <Badge variant={l.payable ? (l.paid || l.adv ? "outline" : "destructive") : "secondary"}>{l.payable ? (l.paid || l.adv ? "Partial" : "Unpaid") : "Paid"}</Badge>,
          },
          {
            key: "_a", header: "", className: "w-48 text-right",
            cell: (l) => (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "advance", s: l })}>Advance</Button>
                <Button size="sm" disabled={!l.payable} onClick={() => setDialog({ kind: "pay", s: l })} className="bg-brand text-white">Pay</Button>
              </div>
            ),
          },
        ]}
      />

      <h2 className="mt-8 mb-3 font-semibold">History · {formatDate(`${monthDate}T12:00:00Z`, "MMMM yyyy")}</h2>
      <DataTable
        data={history}
        emptyIcon={History}
        emptyText="No advances or payments this month"
        columns={[
          { key: "date", header: "Date", cell: (h) => formatDate(`${h.date}T12:00:00Z`) },
          { key: "staff", header: "Staff", cell: (h) => staff.byId.get(h.staff_id)?.name ?? "—" },
          { key: "type", header: "Type", cell: (h) => <Badge variant={h.type === "Salary" ? "secondary" : "outline"}>{h.type}</Badge> },
          { key: "note", header: "Note", cell: (h) => <span className="text-muted-foreground">{h.note ?? ""}</span> },
          { key: "amount", header: "Amount", className: "text-right tabular-nums font-semibold", cell: (h) => formatPKR(h.amount) },
        ]}
      />

      <FormDialog
        key={dialog ? `${dialog.kind}-${s?.id}` : "none"}
        open={!!dialog}
        onOpenChange={(o) => !o && setDialog(null)}
        title={dialog?.kind === "pay" ? `Pay salary · ${s?.name}` : `Advance · ${s?.name}`}
        schema={dialog?.kind === "pay" ? paySchema : advSchema}
        values={dialog?.kind === "pay" ? { paid_on: todayStr(), amount_paid: line?.payable ?? 0, note: "" } : { date: todayStr(), amount: undefined, note: "" }}
        fields={
          dialog?.kind === "pay"
            ? [{ name: "paid_on", label: "Paid on", type: "date" }, { name: "amount_paid", label: `Amount (payable ${formatPKR(line?.payable)})`, type: "number", step: "1" }, ...noteFields]
            : [{ name: "date", label: "Date", type: "date" }, { name: "amount", label: "Advance amount (Rs.)", type: "number", step: "1" }, ...noteFields]
        }
        onSubmit={(v) =>
          dialog?.kind === "pay"
            ? payments.save({ ...v, staff_id: s!.id, month: monthDate, base_salary: line!.base, advances_deducted: line!.adv } as Partial<Payment>)
            : advances.save({ ...v, staff_id: s!.id } as Partial<Advance>)
        }
      />
    </>
  );
}
