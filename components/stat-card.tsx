import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  brand: { card: "bg-brand text-white border-transparent", icon: "bg-white/20 text-white", sub: "text-white/80" },
  orange: { card: "from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/20", icon: "from-orange-500 to-amber-500", sub: "" },
  emerald: { card: "from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/20", icon: "from-emerald-500 to-teal-500", sub: "" },
  sky: { card: "from-sky-50 to-blue-50 dark:from-sky-950/40 dark:to-blue-950/20", icon: "from-sky-500 to-blue-500", sub: "" },
  violet: { card: "from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/20", icon: "from-violet-500 to-purple-500", sub: "" },
} as const;

export type StatTone = keyof typeof TONES;

export function StatCard({ title, value, hint, icon: Icon, tone = "orange" }: {
  title: string; value: React.ReactNode; hint?: React.ReactNode; icon: LucideIcon; tone?: StatTone;
}) {
  const t = TONES[tone];
  const brand = tone === "brand";
  return (
    <div className={cn("rounded-2xl border p-5 shadow-sm", !brand && "bg-gradient-to-br", t.card)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-sm font-medium", brand ? t.sub : "text-muted-foreground")}>{title}</p>
          <p className="mt-1 truncate text-2xl font-bold tabular-nums">{value}</p>
          {hint && <p className={cn("mt-1 text-xs", brand ? t.sub : "text-muted-foreground")}>{hint}</p>}
        </div>
        <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-full shadow-sm", brand ? t.icon : cn("bg-gradient-to-br text-white", t.icon))}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}
