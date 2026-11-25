"use client";

import { useState } from "react";
import { Banknote, CreditCard, Loader2, Printer, Smartphone, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatNum, formatPKR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types";

const METHODS: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "jazzcash", label: "JazzCash", icon: Smartphone },
  { id: "easypaisa", label: "EasyPaisa", icon: Wallet },
];

export type Payment = { method: PaymentMethod; received: number; change: number; printKot: boolean };

export function PaymentDialog({ open, onOpenChange, total, showKot, onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void; total: number; showKot: boolean; onConfirm: (p: Payment) => Promise<void>;
}) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [received, setReceived] = useState<number | "">("");
  const [printKot, setPrintKot] = useState(true);
  const [busy, setBusy] = useState(false);

  const cash = method === "cash";
  const got = cash ? (received === "" ? total : received) : total;
  const change = got - total;
  const ok = !busy && change >= 0;
  const quick = [...new Set([total, ...[500, 1000, 5000].filter((n) => n > total), Math.ceil(total / 100) * 100].filter((n) => n >= total))].sort((a, b) => a - b).slice(0, 4);

  const confirm = async () => {
    if (!ok) return;
    setBusy(true);
    try {
      await onConfirm({ method, received: got, change, printKot: showKot && printKot });
      setReceived("");
      setMethod("cash");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onKeyDown={(e) => {
          if (e.key === "F4" || (e.key === "Enter" && !e.repeat && e.target instanceof HTMLInputElement)) {
            e.preventDefault();
            void confirm();
          }
        }}
      >
        <DialogHeader><DialogTitle>Payment</DialogTitle></DialogHeader>

        <div className="bg-brand rounded-2xl p-4 text-center text-white">
          <p className="text-sm text-white/80">Total payable</p>
          <p className="text-4xl font-bold tabular-nums">{formatPKR(total)}</p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {METHODS.map(({ id, label, icon: Icon }) => (
            <button
              key={id} type="button" onClick={() => setMethod(id)}
              className={cn("flex flex-col items-center gap-1 rounded-xl border p-2 text-xs font-medium transition", method === id ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-300" : "hover:bg-accent")}
            >
              <Icon className="size-5" /> {label}
            </button>
          ))}
        </div>

        {cash && (
          <div className="space-y-2">
            <Input
              autoFocus type="number" inputMode="numeric" placeholder={`Received (default ${formatNum(total)})`} value={received}
              onChange={(e) => setReceived(e.target.value === "" ? "" : Number(e.target.value))}
              className="h-12 text-center text-xl tabular-nums"
            />
            <div className="grid grid-cols-4 gap-2">
              {quick.map((n) => (
                <Button key={n} type="button" variant="outline" onClick={() => setReceived(n)} className="tabular-nums">
                  {n === total ? "Exact" : formatNum(n)}
                </Button>
              ))}
            </div>
            <div className={cn("rounded-2xl p-3 text-center", change < 0 ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300")}>
              <p className="text-sm">{change < 0 ? "Short by" : "Change"}</p>
              <p className="text-5xl font-extrabold tabular-nums">{formatNum(Math.abs(change))}</p>
            </div>
          </div>
        )}

        {showKot && (
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={printKot} onCheckedChange={setPrintKot} /> Also print kitchen ticket (KOT)
          </label>
        )}

        <Button onClick={confirm} disabled={!ok} className="bg-brand h-14 text-lg font-bold text-white hover:opacity-90">
          {busy ? <Loader2 className="animate-spin" /> : <Printer />} Save & Print <span className="text-xs font-normal opacity-80">(F4)</span>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
