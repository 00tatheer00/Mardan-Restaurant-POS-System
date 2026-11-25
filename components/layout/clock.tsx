"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/format";

export function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  return (
    <div className="hidden text-right leading-tight tabular-nums sm:block">
      <p className="text-sm font-semibold">{now ? formatDate(now, "hh:mm a") : "--:--"}</p>
      <p className="text-xs text-muted-foreground">{now ? formatDate(now, "EEE, dd MMM yyyy") : " "}</p>
    </div>
  );
}
