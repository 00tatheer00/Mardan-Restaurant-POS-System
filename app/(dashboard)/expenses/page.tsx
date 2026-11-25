"use client";

import { Paperclip, Tags, Wallet } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrudSection } from "@/components/crud-section";
import { DateRange, useDateRange } from "@/components/date-range";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { db, useTable } from "@/lib/hooks/use-table";
import { formatDate, formatPKR, inRange, todayStr } from "@/lib/format";
import { PAYMENT_LABEL } from "@/lib/pos/orders";
import { dateStr, optText, pick, pos, req } from "@/lib/validators";
import type { Tables } from "@/types";

type Expense = Tables<"expenses">;
type Category = Tables<"expense_categories">;

const schema = z.object({
  date: dateStr, category_id: pick("Pick a category"), amount: pos,
  payment_method: z.enum(["cash", "card", "jazzcash", "easypaisa"]), note: optText, receipt_url: z.string().nullish(),
});
const catSchema = z.object({ name: req, is_active: z.boolean() });
const METHODS = Object.entries(PAYMENT_LABEL).map(([value, label]) => ({ value, label }));

const viewReceipt = async (path: string) => {
  const { data, error } = await db().storage.from("receipts").createSignedUrl(path, 300);
  if (error) return toast.error(error.message);
  window.open(data.signedUrl, "_blank");
};

function ExpensesTab() {
  const table = useTable<Expense>("expenses", { order: "date", ascending: false });
  const cats = useTable<Category>("expense_categories");
  const [range, setRange] = useDateRange("month");
  const rows = table.rows.filter((r) => inRange(r.date, range.from, range.to));
  const total = rows.reduce((a, r) => a + Number(r.amount), 0);
  const byCat = Object.entries(rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.category_id]: (a[r.category_id] ?? 0) + Number(r.amount) }), {}))
    .sort((a, b) => b[1] - a[1]);

  return (
    <>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard tone="brand" title="Total expenses" value={formatPKR(total)} hint={`${rows.length} entries`} icon={Wallet} />
        {byCat.slice(0, 2).map(([id, amt], i) => (
          <StatCard key={id} tone={i ? "sky" : "violet"} title={cats.byId.get(id)?.name ?? "—"} value={formatPKR(amt)} hint={total ? `${Math.round((amt / total) * 100)}% of total` : undefined} icon={Tags} />
        ))}
      </div>
      <CrudSection
        table={table}
        noun="Expense"
        emptyIcon={Wallet}
        filter={(r) => inRange(r.date, range.from, range.to)}
        toolbar={<DateRange value={range} onChange={setRange} />}
        schema={schema}
        defaults={{ date: todayStr(), category_id: undefined, amount: undefined, payment_method: "cash", note: "", receipt_url: null }}
        fields={[
          { name: "date", label: "Date", type: "date" },
          { name: "category_id", label: "Category", type: "select", options: cats.rows.filter((c) => c.is_active).map((c) => ({ value: c.id, label: c.name })) },
          { name: "amount", label: "Amount (Rs.)", type: "number", step: "1" },
          { name: "payment_method", label: "Paid via", type: "select", options: METHODS },
          { name: "note", label: "Note", type: "textarea" },
          { name: "receipt_url", label: "Receipt photo (optional)", type: "upload", bucket: "receipts" },
        ]}
        columns={[
          { key: "date", header: "Date", cell: (r) => formatDate(`${r.date}T12:00:00Z`) },
          { key: "cat", header: "Category", cell: (r) => <Badge variant="secondary">{cats.byId.get(r.category_id)?.name ?? "—"}</Badge> },
          { key: "note", header: "Note", cell: (r) => <span className="text-muted-foreground">{r.note ?? ""}</span> },
          { key: "method", header: "Paid via", cell: (r) => PAYMENT_LABEL[r.payment_method] },
          { key: "amount", header: "Amount", className: "text-right tabular-nums font-semibold", cell: (r) => formatPKR(r.amount) },
          { key: "rc", header: "", className: "w-10", cell: (r) => r.receipt_url && <Button size="icon-sm" variant="ghost" aria-label="Receipt" onClick={() => viewReceipt(r.receipt_url!)}><Paperclip /></Button> },
        ]}
      />
    </>
  );
}

function CategoriesTab() {
  const table = useTable<Category>("expense_categories");
  return (
    <CrudSection
      table={table}
      noun="Category"
      emptyIcon={Tags}
      searchKeys={["name"]}
      schema={catSchema}
      defaults={{ name: "", is_active: true }}
      fields={[{ name: "name", label: "Name", placeholder: "e.g. Electricity" }, { name: "is_active", label: "Active", type: "switch" }]}
      columns={[{ key: "name", header: "Name", cell: (r) => <span className="font-medium">{r.name}</span> }]}
    />
  );
}

export default function ExpensesPage() {
  return (
    <>
      <PageHeader title="Expenses" description="Bills, rent, gas and other running costs. Salaries are tracked in Staff → Salary." />
      <Tabs defaultValue="expenses">
        <TabsList className="mb-4">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses"><ExpensesTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
      </Tabs>
    </>
  );
}
