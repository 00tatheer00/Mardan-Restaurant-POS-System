"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, Banknote, Eye, Printer, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type Column } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { VoidDialog } from "@/components/pos/void-dialog";
import { db } from "@/lib/hooks/use-table";
import { formatDate, formatPKR } from "@/lib/format";
import { dayRangeISO, ORDER_TYPE_LABEL, PAYMENT_LABEL, printReceipt, receiptUrl, type Order } from "@/lib/pos/orders";
import { cn } from "@/lib/utils";

type Row = Order & { cashier: { full_name: string } | null };
const STATUS_TONE = { paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", open: "bg-amber-500/15 text-amber-700 dark:text-amber-300", void: "bg-destructive/15 text-destructive" };

export function OrdersTable({ isOwner }: { isOwner: boolean }) {
  const today = formatDate(new Date(), "yyyy-MM-dd");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState("all");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [voiding, setVoiding] = useState<Row | null>(null);

  const load = useCallback(async () => {
    const r = dayRangeISO(from, to);
    let query = db().from("orders").select("*, cashier:profiles!orders_cashier_id_fkey(full_name)")
      .gte("created_at_local", r.from).lte("created_at_local", r.to).order("created_at_local", { ascending: false });
    if (status !== "all") query = query.eq("status", status);
    const { data, error } = await query;
    if (error) toast.error(error.message);
    else setRows(data as Row[]);
    setLoading(false);
  }, [from, to, status]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const paid = rows.filter((o) => o.status === "paid");
  const sales = paid.reduce((a, o) => a + Number(o.total), 0);

  const columns: Column<Row>[] = [
    { key: "invoice_no", header: "Invoice", cell: (o) => <span className="font-mono text-sm font-medium">{o.invoice_no}</span> },
    { key: "time", header: "Date / time", cell: (o) => formatDate(o.created_at_local, "dd-MMM HH:mm") },
    { key: "type", header: "Type", cell: (o) => `${ORDER_TYPE_LABEL[o.order_type]}${o.table_no ? ` T${o.table_no}` : ""}` },
    { key: "cashier", header: "Cashier", cell: (o) => o.cashier?.full_name ?? "—" },
    { key: "payment", header: "Payment", cell: (o) => (o.payment_method ? PAYMENT_LABEL[o.payment_method] : "—") },
    {
      key: "status", header: "Status",
      cell: (o) => <Badge className={cn("border-0 capitalize", STATUS_TONE[o.status])} title={o.void_reason ?? undefined}>{o.status}</Badge>,
    },
    { key: "total", header: "Total", className: "text-right tabular-nums", cell: (o) => <span className={cn("font-semibold", o.status === "void" && "line-through opacity-60")}>{formatPKR(o.total)}</span> },
    {
      key: "_a", header: "", className: "w-32 text-right",
      cell: (o) => (
        <div className="flex justify-end gap-1">
          <Button size="icon-sm" variant="ghost" aria-label="View" asChild><a href={receiptUrl(o.id, { copy: true })} target="_blank" rel="noreferrer"><Eye /></a></Button>
          <Button size="icon-sm" variant="ghost" aria-label="Reprint" onClick={() => printReceipt(o.id, { copy: true })}><Printer /></Button>
          {isOwner && o.status !== "void" && <Button size="icon-sm" variant="ghost" aria-label="Void" className="text-destructive" onClick={() => setVoiding(o)}><Ban /></Button>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard tone="brand" title="Sales (paid)" value={formatPKR(sales)} icon={Banknote} />
        <StatCard tone="emerald" title="Paid orders" value={paid.length} icon={Receipt} />
        <StatCard tone="violet" title="Voided" value={rows.filter((o) => o.status === "void").length} icon={Ban} />
      </div>
      <DataTable
        data={rows}
        columns={columns}
        loading={loading}
        searchKeys={["invoice_no", "table_no"]}
        searchPlaceholder="Search invoice / table…"
        emptyIcon={Receipt}
        emptyText="No orders in this period"
        toolbar={
          <>
            <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            <span className="text-muted-foreground">to</span>
            <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="w-40" />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["all", "paid", "open", "void"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s === "all" ? "All status" : s}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />
      <VoidDialog order={voiding} isOwner={isOwner} onClose={() => setVoiding(null)} onDone={load} />
    </div>
  );
}
