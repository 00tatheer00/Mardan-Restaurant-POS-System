"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function PinDialog({ open, onOpenChange, title, description, onSubmit }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; onSubmit: (pin: string) => Promise<boolean>;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await onSubmit(pin);
    setBusy(false);
    setPin("");
    setError(!ok);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setPin(""); setError(false); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader className="items-center text-center">
          <div className="bg-brand mx-auto flex size-12 items-center justify-center rounded-full text-white"><ShieldCheck /></div>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Input
            autoFocus type="password" inputMode="numeric" maxLength={4} value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="h-14 text-center text-3xl tracking-[0.6em]" placeholder="••••"
          />
          {error && <p className="text-center text-sm text-destructive">Wrong PIN</p>}
          <DialogFooter>
            <Button type="submit" disabled={pin.length !== 4 || busy} className="bg-brand w-full text-white">
              {busy && <Loader2 className="animate-spin" />} Approve
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
