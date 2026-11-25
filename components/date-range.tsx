"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { monthStart, shiftDay, todayStr } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Range = { from: string; to: string };

export function useDateRange(initial: "today" | "month" | number = "month") {
  return useState<Range>(() => {
    const to = todayStr();
    return { from: initial === "today" ? to : initial === "month" ? monthStart(to) : shiftDay(to, -initial + 1), to };
  });
}

const PRESETS: [string, () => Range][] = [
  ["Today", () => ({ from: todayStr(), to: todayStr() })],
  ["7 days", () => ({ from: shiftDay(todayStr(), -6), to: todayStr() })],
  ["This month", () => ({ from: monthStart(), to: todayStr() })],
  ["30 days", () => ({ from: shiftDay(todayStr(), -29), to: todayStr() })],
];

export function DateRange({ value, onChange, disabled }: { value: Range; onChange: (r: Range) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Input type="date" value={value.from} max={value.to} disabled={disabled} onChange={(e) => e.target.value && onChange({ ...value, from: e.target.value })} className="w-40" />
      <span className="text-sm text-muted-foreground">to</span>
      <Input type="date" value={value.to} min={value.from} disabled={disabled} onChange={(e) => e.target.value && onChange({ ...value, to: e.target.value })} className="w-40" />
      {!disabled && (
        <div className="flex rounded-lg bg-muted p-0.5 text-xs">
          {PRESETS.map(([label, fn]) => {
            const r = fn();
            const active = r.from === value.from && r.to === value.to;
            return (
              <button key={label} type="button" onClick={() => onChange(r)} className={cn("rounded-md px-2 py-1.5", active ? "bg-card font-medium shadow" : "text-muted-foreground")}>
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
