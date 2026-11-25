"use client";

import { Controller, type FieldValues, type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Check, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/hooks/use-table";
import { cn } from "@/lib/utils";

function UploadField({ bucket, value, onChange }: { bucket: string; value?: string | null; onChange: (v: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const upload = async (file?: File) => {
    if (!file) return;
    if (!navigator.onLine) return toast.error("Uploading needs internet");
    setBusy(true);
    const path = `${crypto.randomUUID()}.${file.name.split(".").pop()}`;
    const { error } = await db().storage.from(bucket).upload(path, file);
    setBusy(false);
    if (error) return toast.error(error.message);
    onChange(path);
  };
  return value ? (
    <div className="flex h-9 items-center gap-2 text-sm text-emerald-600">
      <Check className="size-4" /> Attached
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove" onClick={() => onChange(null)}><X /></Button>
    </div>
  ) : (
    <Button type="button" variant="outline" size="sm" disabled={busy} asChild>
      <label className="cursor-pointer">
        {busy ? <Loader2 className="animate-spin" /> : <Paperclip />} Attach photo
        <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => upload(e.target.files?.[0])} />
      </label>
    </Button>
  );
}

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "number" | "password" | "email" | "date" | "textarea" | "select" | "switch" | "upload";
  bucket?: string;
  options?: { value: string; label: string }[];
  nullable?: boolean;
  placeholder?: string;
  hint?: string;
  full?: boolean;
  step?: string;
};

const NONE = "__none";

export function FormFields<T extends FieldValues>({ form, fields }: { form: UseFormReturn<T>; fields: FieldDef[] }) {
  const { register, control, formState: { errors } } = form;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        const name = f.name as never;
        const error = errors[f.name]?.message as string | undefined;
        const type = f.type ?? "text";
        let input: React.ReactNode;

        if (type === "switch") {
          input = (
            <Controller control={control} name={name} render={({ field }) => (
              <div className="flex h-9 items-center gap-2">
                <Switch id={f.name} checked={!!field.value} onCheckedChange={field.onChange} />
                {f.hint && <span className="text-sm text-muted-foreground">{f.hint}</span>}
              </div>
            )} />
          );
        } else if (type === "select") {
          input = (
            <Controller control={control} name={name} render={({ field }) => (
              <Select value={field.value ?? (f.nullable ? NONE : undefined)} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
                <SelectTrigger id={f.name} className="w-full"><SelectValue placeholder={f.placeholder ?? "Select…"} /></SelectTrigger>
                <SelectContent>
                  {f.nullable && <SelectItem value={NONE}>None</SelectItem>}
                  {f.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          );
        } else if (type === "upload") {
          input = (
            <Controller control={control} name={name} render={({ field }) => (
              <UploadField bucket={f.bucket ?? "receipts"} value={field.value} onChange={field.onChange} />
            )} />
          );
        } else if (type === "textarea") {
          input = <Textarea id={f.name} placeholder={f.placeholder} {...register(name)} />;
        } else {
          input = (
            <Input
              id={f.name}
              type={type}
              step={f.step ?? (type === "number" ? "any" : undefined)}
              placeholder={f.placeholder}
              {...register(name, type === "number" ? { valueAsNumber: true } : undefined)}
            />
          );
        }

        return (
          <div key={f.name} className={cn("space-y-1.5", (f.full || type === "textarea") && "sm:col-span-2")}>
            <Label htmlFor={f.name}>{f.label}</Label>
            {input}
            {error ? <p className="text-xs text-destructive">{error}</p> : f.hint && type !== "switch" && <p className="text-xs text-muted-foreground">{f.hint}</p>}
          </div>
        );
      })}
    </div>
  );
}
