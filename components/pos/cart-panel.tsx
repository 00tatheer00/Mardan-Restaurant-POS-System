"use client";

import { Minus, PauseCircle, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/stores/cart";
import { formatNum, formatPKR } from "@/lib/format";
import { ORDER_TYPE_LABEL } from "@/lib/pos/orders";
import type { Totals } from "@/lib/pos/calc";
import { cn } from "@/lib/utils";
import type { OrderType } from "@/types";

export function CartPanel({ totals, onPay, onHold, busy }: { totals: Totals; onPay: () => void; onHold: () => void; busy: boolean }) {
  const { lines, orderType, tableNo, discount, invoiceNo, setQty, set, clear } = useCart();

  return (
    <aside className="flex h-full flex-col border-l bg-card">
      <div className="space-y-3 border-b p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{invoiceNo ? <span className="font-mono">{invoiceNo}</span> : "New order"}</h2>
          <Button variant="ghost" size="sm" onClick={clear} disabled={!lines.length && !invoiceNo} className="text-muted-foreground">
            <Trash2 /> Clear <span className="text-xs opacity-70">F1</span>
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
          {(Object.keys(ORDER_TYPE_LABEL) as OrderType[]).map((t) => (
            <button
              key={t} type="button" onClick={() => set({ orderType: t })}
              className={cn("rounded-lg py-2 text-sm font-medium transition", orderType === t ? "bg-brand text-white shadow" : "text-muted-foreground hover:text-foreground")}
            >
              {ORDER_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        {orderType === "dine_in" && (
          <Input placeholder="Table no." value={tableNo} onChange={(e) => set({ tableNo: e.target.value })} className="h-10" />
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {!lines.length && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ShoppingBag className="size-10 opacity-40" />
            <p className="text-sm">Tap items to add</p>
          </div>
        )}
        {lines.map((l) => (
          <div key={l.menu_item_id} className="flex items-center gap-2 rounded-xl border p-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{l.name}</p>
              <p className="text-xs text-muted-foreground tabular-nums">{formatNum(l.price)} × {l.qty}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" className="size-9 rounded-full" onClick={() => setQty(l.menu_item_id, l.qty - 1)} aria-label="Less"><Minus /></Button>
              <span className="w-7 text-center font-semibold tabular-nums">{l.qty}</span>
              <Button size="icon" variant="outline" className="size-9 rounded-full" onClick={() => setQty(l.menu_item_id, l.qty + 1)} aria-label="More"><Plus /></Button>
            </div>
            <p className="w-16 text-right text-sm font-semibold tabular-nums">{formatNum(l.price * l.qty)}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3 border-t p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Discount</span>
          <div className="ml-auto flex rounded-lg bg-muted p-0.5 text-xs">
            {(["amount", "percent"] as const).map((t) => (
              <button key={t} type="button" onClick={() => set({ discount: { ...discount, type: t } })} className={cn("rounded-md px-2 py-1", discount.type === t && "bg-card shadow")}>
                {t === "amount" ? "Rs" : "%"}
              </button>
            ))}
          </div>
          <Input
            type="number" min={0} value={discount.value || ""} placeholder="0"
            onChange={(e) => set({ discount: { ...discount, value: Math.max(0, Number(e.target.value)) } })}
            className="h-8 w-24 text-right tabular-nums"
          />
        </div>
        <dl className="space-y-1 text-sm tabular-nums">
          <Row label="Sub total" value={formatNum(totals.subtotal)} />
          {totals.discount > 0 && <Row label="Discount" value={`-${formatNum(totals.discount)}`} className="text-emerald-600" />}
          {totals.rate > 0 && <Row label={`Sales tax (${totals.rate}%${totals.inclusive ? " incl." : ""})`} value={formatNum(totals.tax)} />}
        </dl>
        <div className="flex gap-2">
          {orderType === "dine_in" && (
            <Button variant="outline" onClick={onHold} disabled={!lines.length || busy} className="h-16 px-4">
              <PauseCircle /> Hold
            </Button>
          )}
          <Button onClick={onPay} disabled={!lines.length || busy} className="bg-brand h-16 flex-1 justify-between px-5 text-white shadow-lg shadow-orange-500/30 hover:opacity-90">
            <span className="text-lg font-bold">PAY <span className="text-xs font-normal opacity-80">F2</span></span>
            <span className="text-2xl font-extrabold tabular-nums">{formatPKR(totals.total)}</span>
          </Button>
        </div>
      </div>
    </aside>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex justify-between", className)}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
