"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ListOrdered, LogOut, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SyncPill } from "@/components/layout/sync-pill";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { CartPanel } from "@/components/pos/cart-panel";
import { OrdersDialog } from "@/components/pos/orders-dialog";
import { PaymentDialog, type Payment } from "@/components/pos/payment-dialog";
import { PinDialog } from "@/components/pos/pin-dialog";
import { signOut } from "@/app/(auth)/login/actions";
import { useTable, db } from "@/lib/hooks/use-table";
import { cacheRows } from "@/lib/db";
import { cachedQuery } from "@/lib/sync";
import { useCart } from "@/lib/stores/cart";
import { calcTotals } from "@/lib/pos/calc";
import { deviceId, nextInvoiceNo } from "@/lib/pos/invoice";
import { persistOrder, printReceipt, startOfTodayISO, type Order, type OrderItem } from "@/lib/pos/orders";
import { formatNum } from "@/lib/format";
import { categoryEmoji } from "@/lib/pos/emoji";
import { cn } from "@/lib/utils";
import type { Profile, Tables } from "@/types";
import { approveWithPin } from "./actions";

const PALETTE = [
  "from-orange-500 to-red-500", "from-amber-500 to-orange-500", "from-emerald-500 to-teal-500",
  "from-sky-500 to-blue-500", "from-violet-500 to-purple-500", "from-pink-500 to-rose-500",
];

export function PosScreen({ profile }: { profile: Profile }) {
  const settingsT = useTable<Tables<"settings">>("settings", { order: "created_at" });
  const cats = useTable<Tables<"categories">>("categories", { order: "sort_order" });
  const items = useTable<Tables<"menu_items">>("menu_items", { order: "sort_order" });
  const settings = settingsT.rows[0];
  const cart = useCart();

  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [approved, setApproved] = useState(0);
  const [busy, setBusy] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const totals = calcTotals(cart.lines, cart.discount, settings);
  const activeCats = cats.rows.filter((c) => c.is_active);
  const color = useMemo(() => new Map(activeCats.map((c, i) => [c.id, PALETTE[i % PALETTE.length]])), [activeCats]);
  const qty = useMemo(() => new Map(cart.lines.map((l) => [l.menu_item_id, l.qty])), [cart.lines]);
  const visible = items.rows.filter(
    (i) => i.is_active && color.has(i.category_id) && (cat === "all" || i.category_id === cat) && i.name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  const startPay = () => {
    if (!cart.lines.length || busy) return;
    if (cart.orderType === "dine_in" && !cart.tableNo.trim()) return toast.error("Enter table number");
    if (profile.role !== "owner" && totals.discount > Number(settings?.discount_limit ?? 0) && totals.discount > approved) return setPinOpen(true);
    setPayOpen(true);
  };

  const save = async (status: "open" | "paid", pay?: Payment) => {
    const existing = !!cart.orderId;
    const id = cart.orderId ?? crypto.randomUUID();
    await persistOrder(
      {
        id,
        invoice_no: cart.invoiceNo ?? (await nextInvoiceNo(settings?.invoice_prefix ?? "KH-")),
        order_type: cart.orderType,
        table_no: cart.orderType === "dine_in" ? cart.tableNo.trim() : null,
        status,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax_amount: totals.tax,
        total: totals.total,
        payment_method: pay?.method ?? null,
        amount_received: pay?.received ?? null,
        change_due: pay?.change ?? null,
        cashier_id: profile.id,
        device_id: deviceId(),
        created_at_local: new Date().toISOString(),
      },
      cart.lines.map((l, n) => ({
        id: crypto.randomUUID(), order_id: id, created_at: new Date(Date.now() + n).toISOString(), menu_item_id: l.menu_item_id, name_snapshot: l.name,
        unit_price: l.price, qty: l.qty, line_total: l.price * l.qty,
      })),
      existing,
    );
    return { id, existing };
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message || "Could not save order");
    } finally {
      setBusy(false);
    }
  };

  const hold = () =>
    run(async () => {
      if (!cart.tableNo.trim()) throw new Error("Enter table number");
      const { id } = await save("open");
      printReceipt(id, { kot: true });
      cart.clear();
      setApproved(0);
      toast.success("Order held & sent to kitchen");
    });

  const pay = (p: Payment) =>
    run(async () => {
      const { id, existing } = await save("paid", p);
      printReceipt(id);
      if (p.printKot && !existing) setTimeout(() => printReceipt(id, { kot: true }), 1500);
      setLastId(id);
      cart.clear();
      setApproved(0);
      setPayOpen(false);
      toast.success(p.method === "cash" && p.change > 0 ? `Saved · Change Rs. ${formatNum(p.change)}` : "Saved");
    });

  const openHeld = async (o: Order) => {
    let data: OrderItem[];
    try {
      data = await cachedQuery<OrderItem>("order_items", () => db().from("order_items").select("*").eq("order_id", o.id), (r) => r.order_id === o.id);
    } catch (e) {
      return toast.error((e as Error).message);
    }
    cart.load({
      orderId: o.id,
      invoiceNo: o.invoice_no,
      orderType: o.order_type,
      tableNo: o.table_no ?? "",
      discount: { type: "amount", value: Number(o.discount) },
      lines: data.map((i) => ({ menu_item_id: i.menu_item_id ?? i.id, name: i.name_snapshot, price: Number(i.unit_price), qty: Number(i.qty) })),
    });
  };

  useEffect(() => {
    // Cache own profile (receipts offline) and today's orders (invoice counter seed).
    void cacheRows("profiles", [{ id: profile.id, full_name: profile.full_name }]);
    void cachedQuery("orders", () => db().from("orders").select("*").gte("created_at_local", startOfTodayISO()), () => false).catch(() => {});
  }, [profile.id, profile.full_name]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (payOpen || pinOpen || ordersOpen) return;
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (e.key === "F1") { e.preventDefault(); cart.clear(); setApproved(0); }
      else if (e.key === "F2") { e.preventDefault(); startPay(); }
      else if (e.key === "F4") { e.preventDefault(); if (lastId) printReceipt(lastId, { copy: true }); }
      else if (e.key === "/" && !typing) { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === "Escape" && e.target === searchRef.current) { setQ(""); searchRef.current?.blur(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const loading = items.loading || cats.loading;

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items  ( / )"
            className="pl-9"
            onKeyDown={(e) => { if (e.key === "Enter" && visible[0]) { cart.add(visible[0]); setQ(""); } }}
          />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <SyncPill />
          <Button variant="ghost" onClick={() => setOrdersOpen(true)}><ListOrdered /> <span className="hidden lg:inline">Orders</span></Button>
          <ThemeToggle />
          <span className="hidden px-2 text-sm text-muted-foreground xl:inline">{profile.full_name}</span>
          <Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => signOut()}><LogOut /></Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1fr_minmax(340px,35%)]">
        <section className="flex min-h-0 flex-col">
          <div className="flex gap-2 overflow-x-auto p-4 pb-2">
            <Pill active={cat === "all"} onClick={() => setCat("all")} gradient="from-slate-700 to-slate-900">All</Pill>
            {activeCats.map((c) => (
              <Pill key={c.id} active={cat === c.id} onClick={() => setCat(c.id)} gradient={color.get(c.id)!}>{c.name}</Pill>
            ))}
          </div>
          <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto p-4 pt-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {loading && Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
            {!loading && !visible.length && <p className="col-span-full py-16 text-center text-muted-foreground">No items found</p>}
            {visible.map((i) => (
              <button
                key={i.id} type="button" onClick={() => cart.add(i)}
                className="group relative flex h-44 flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition active:scale-[0.97] hover:shadow-md"
              >
                <span className={cn("relative flex h-24 w-full shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br", color.get(i.category_id))}>
                  <span className="text-4xl drop-shadow">{categoryEmoji(cats.byId.get(i.category_id)?.name)}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {i.image_url && <img src={i.image_url} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition group-hover:scale-105" onError={(e) => (e.currentTarget.style.display = "none")} />}
                </span>
                <span className="relative flex flex-1 flex-col justify-between p-2.5">
                  <span className="line-clamp-2 text-sm font-semibold leading-tight">{i.name}</span>
                  <span className="flex items-end justify-between">
                    <span className="font-bold text-orange-600 tabular-nums dark:text-orange-400">Rs {formatNum(i.price)}</span>
                    <span className="text-xs text-muted-foreground">{i.unit}</span>
                  </span>
                </span>
                {qty.get(i.id) && (
                  <span className="bg-brand absolute top-2 right-2 flex size-7 ring-2 ring-white items-center justify-center rounded-full text-sm font-bold text-white shadow">{qty.get(i.id)}</span>
                )}
              </button>
            ))}
          </div>
        </section>
        <CartPanel totals={totals} onPay={startPay} onHold={hold} busy={busy} />
      </div>

      <PaymentDialog open={payOpen} onOpenChange={setPayOpen} total={totals.total} showKot={!cart.orderId} onConfirm={pay} />
      <PinDialog
        open={pinOpen} onOpenChange={setPinOpen} title="Owner approval"
        description={`Discount above Rs. ${formatNum(settings?.discount_limit)} needs owner PIN`}
        onSubmit={async (pin) => {
          const ok = await approveWithPin(pin).catch(() => {
            toast.error("Owner approval needs internet");
            return false;
          });
          if (ok) { setApproved(totals.discount); setPayOpen(true); }
          return ok;
        }}
      />
      <OrdersDialog open={ordersOpen} onOpenChange={setOrdersOpen} isOwner={profile.role === "owner"} onOpenHeld={openHeld} />
    </div>
  );
}

function Pill({ active, onClick, gradient, children }: { active: boolean; onClick: () => void; gradient: string; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick}
      className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition", active ? cn("bg-gradient-to-r text-white shadow-md", gradient) : "border bg-card text-muted-foreground hover:text-foreground")}
    >
      {children}
    </button>
  );
}
