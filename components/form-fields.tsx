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

// Shrink photos before upload (max 800px JPEG) so POS tiles load fast.
async function shrink(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 800 / Math.max(img.width, img.height));
  const canvas = Object.assign(document.createElement("canvas"), { width: Math.round(img.width * scale), height: Math.round(img.height * scale) });
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((res) => canvas.toBlob((b) => res(b ?? file), "image/jpeg", 0.82));
}

function UploadField({ bucket, folder = "", publicUrl, value, onChange }: {
  bucket: string; folder?: string; publicUrl?: boolean; value?: string | null; onChange: (v: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const upload = async (file?: File) => {
    if (!file) return;
    if (!navigator.onLine) return toast.error("Uploading needs internet");
    setBusy(true);
    const path = `${folder}${crypto.randomUUID()}.jpg`;
    const { error } = await db().storage.from(bucket).upload(path, await shrink(file), { contentType: "image/jpeg" });
    setBusy(false);
    if (error) return toast.error(error.message);
    onChange(publicUrl ? db().storage.from(bucket).getPublicUrl(path).data.publicUrl : path);
  };
  if (value && publicUrl) {
    return (
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="" className="size-16 rounded-xl border object-cover" />
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(null)}><X /> Remove</Button>
      </div>
    );
  }
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
  folder?: string;
  publicUrl?: boolean;
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
              <UploadField bucket={f.bucket ?? "receipts"} folder={f.folder} publicUrl={f.publicUrl} value={field.value} onChange={field.onChange} />
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
