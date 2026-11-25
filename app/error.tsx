"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // A new deploy invalidates server actions on already-open pages: reload once to get the fresh page.
  useEffect(() => {
    if (/Server Action .* was not found/i.test(error.message) && !sessionStorage.getItem("kh-reloaded")) {
      sessionStorage.setItem("kh-reloaded", "1");
      window.location.reload();
    } else {
      sessionStorage.removeItem("kh-reloaded");
    }
  }, [error]);
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive"><AlertTriangle /></div>
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">{error.message || "Unexpected error."} Your saved data is safe.</p>
      <Button onClick={reset} className="bg-brand text-white"><RotateCcw /> Try again</Button>
    </div>
  );
}
