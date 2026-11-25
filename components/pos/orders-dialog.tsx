"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, FolderOpen, Printer, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VoidDialog } from "@/components/pos/void-dialog";
import { db } from "@/lib/hooks/use-table";
import { cachedQuery } from "@/lib/sync";
import { formatDate, formatPKR } from "@/lib/format";
import { ORDER_TYPE_LABEL, printReceipt, startOfTodayISO, type Order } from "@/lib/pos/orders";
import { cn } from "@/lib/utils";

const STATUS_TONE = { paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", open: "bg-amber-500/15 text-amber-700 dark:text-amber-300", void: "bg-destructive/15 text-destructive" };

export function OrdersDialog({ open, onOpenChange, isOwner, onOpenHeld }: {
  open: boolean; onOpenChange: (o: boolean) => void; isOwner: boolean; onOpenHeld: (o: Order) => void;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [held, setHeld] = useState<Order[]>([]);
  const [q, setQ] = useState("");
  const [voiding, setVoiding] = useState<Order | null>(null);

  const load = useCallback(async () => {
    const start = startOfTodayISO();
    try {
      const [today, open] = await Promise.all([
        cachedQuery<Order>("orders", () => db().from("orders").select("*").gte("created_at_local", start), (o) => new Date(o.created_at_local) >= new Date(start)),
        cachedQuery<Order>("orders", () => db().from("orders").select("*").eq("status", "open"), (o) => o.status === "open"),
      ]);
      const desc = (a: Order, b: Order) => b.created_at_local.localeCompare(a.created_at_local);
      setOrders(today.sort(desc));
      setHeld(open.sort(desc).reverse());
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [open, load]);

  const search = async () => {
    if (!q.trim()) return load();
    const term = q.trim().toLowerCase();
    try {
      const found = await cachedQuery<Order>("orders", () => db().from("orders").select("*").ilike("invoice_no", `%${term}%`).limit(50), (o) => o.invoice_no.toLowerCase().includes(term));
      setOrders(found.sort((a, b) => b.created_at_local.localeCompare(a.created_at_local)).slice(0, 50));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const paid = orders.filter((o) => o.status === "paid");
  const total = paid.reduce((a, o) => a + Number(o.total), 0);

  const row = (o: Order, actions: React.ReactNode) => (
    <div key={o.id} className="flex items-center gap-3 rounded-xl border p-3">
      <div className="min-w-0 flex-1">
        <p className="font-mono text-sm font-semibold">{o.invoice_no}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(o.created_at_local, "dd-MMM HH:mm")} · {ORDER_TYPE_LABEL[o.order_type]}{o.table_no ? ` T${o.table_no}` : ""}
        </p>
      </div>
      <Badge className={cn("border-0 capitalize", STATUS_TONE[o.status])}>{o.status}</Badge>
      <p className="w-24 text-right font-semibold tabular-nums">{formatPKR(o.total)}</p>
      <div className="flex gap-1">{actions}</div>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-2xl">
          <DialogHeader><DialogTitle>Orders</DialogTitle></DialogHeader>
          <Tabs defaultValue={held.length ? "held" : "today"} className="min-h-0 flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="held">Held ({held.length})</TabsTrigger>
              <TabsTrigger value="today">Today / Search</TabsTrigger>
            </TabsList>
            <TabsContent value="held" className="space-y-2 overflow-y-auto">
              {!held.length && <p className="py-10 text-center text-sm text-muted-foreground">No held orders</p>}
              {held.map((o) => row(o, (
                <>
                  <Button size="sm" onClick={() => { onOpenHeld(o); onOpenChange(false); }} className="bg-brand text-white"><FolderOpen /> Open</Button>
                  <Button size="icon-sm" variant="ghost" aria-label="Void" onClick={() => setVoiding(o)}><Ban /></Button>
                </>
              )))}
            </TabsContent>
            <TabsContent value="today" className="space-y-3 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-orange-500/10 p-3"><p className="text-xs text-muted-foreground">Paid orders</p><p className="text-xl font-bold tabular-nums">{paid.length}</p></div>
                <div className="rounded-xl bg-emerald-500/10 p-3"><p className="text-xs text-muted-foreground">Sales</p><p className="text-xl font-bold tabular-nums">{formatPKR(total)}</p></div>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); void search(); }} className="relative">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search invoice no. (Enter)" className="pl-9" />
              </form>
              {orders.map((o) => row(o, (
                <>
                  <Button size="icon-sm" variant="outline" aria-label="Reprint" onClick={() => printReceipt(o.id, { copy: true })}><Printer /></Button>
                  {o.status !== "void" && <Button size="icon-sm" variant="ghost" aria-label="Void" onClick={() => setVoiding(o)}><Ban /></Button>}
                </>
              )))}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      <VoidDialog order={voiding} isOwner={isOwner} onClose={() => setVoiding(null)} onDone={load} />
    </>
  );
}
