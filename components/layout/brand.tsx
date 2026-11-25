import { Flame } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="bg-brand flex size-9 shrink-0 items-center justify-center rounded-xl text-white shadow-md">
        <Flame className="size-5" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="font-bold">Kabab House</p>
          <p className="text-xs text-muted-foreground">Mardan</p>
        </div>
      )}
    </div>
  );
}
