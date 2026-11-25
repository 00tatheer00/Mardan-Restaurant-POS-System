"use client";

import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { retryFailed, useSync } from "@/lib/sync";
import { cn } from "@/lib/utils";

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

export function SyncPill() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  const { pending, failed, syncing, lastError } = useSync();

  const [label, tone] = failed
    ? [`${failed} failed · retry`, "bg-destructive/10 text-destructive [&>span]:bg-destructive"]
    : syncing
      ? ["Syncing…", "bg-sky-500/10 text-sky-700 dark:text-sky-300 [&>span]:bg-sky-500 [&>span]:animate-pulse"]
      : online
        ? [pending ? `Online · ${pending} pending` : "Online · Synced", "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 [&>span]:bg-emerald-500"]
        : [`Offline · ${pending} pending`, "bg-amber-500/10 text-amber-700 dark:text-amber-300 [&>span]:bg-amber-500"];

  return (
    <button
      type="button"
      title={lastError}
      onClick={() => {
        if (failed && lastError) toast.error(lastError);
        void retryFailed();
      }}
      className={cn("flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap", tone)}
    >
      <span className="size-2 rounded-full" />
      {label}
    </button>
  );
}
