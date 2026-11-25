"use client";

import { useState } from "react";
import { Ban, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { voidOrder } from "@/app/pos/actions";

export function VoidDialog({ order, isOwner, onClose, onDone }: {
  order: { id: string; invoice_no: string } | null; isOwner: boolean; onClose: () => void; onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setBusy(true);
    const res = await voidOrder(order.id, reason, isOwner ? undefined : pin).catch(() => ({ error: "Voiding needs internet" }));
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success(`${order.invoice_no} voided`);
    setReason("");
    setPin("");
    onDone();
    onClose();
  };

  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive"><Ban className="size-5" /> Void {order?.invoice_no}</DialogTitle>
          <DialogDescription>The invoice stays in history marked VOID and is excluded from sales.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="void-reason">Reason</Label>
            <Textarea id="void-reason" autoFocus required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {!isOwner && (
            <div className="space-y-1.5">
              <Label htmlFor="void-pin">Owner PIN</Label>
              <Input id="void-pin" type="password" inputMode="numeric" maxLength={4} required value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Void invoice</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
