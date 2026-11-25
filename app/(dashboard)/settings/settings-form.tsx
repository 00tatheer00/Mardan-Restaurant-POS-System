"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FormFields, type FieldDef } from "@/components/form-fields";
import { db, useTable } from "@/lib/hooks/use-table";
import { settingsSchema, type SettingsInput } from "@/lib/validators";
import type { Tables } from "@/types";

type Settings = Tables<"settings">;

const SECTIONS: { title: string; description: string; fields: FieldDef[] }[] = [
  {
    title: "Restaurant",
    description: "Printed at the top of every receipt",
    fields: [
      { name: "restaurant_name", label: "Restaurant name", full: true },
      { name: "address", label: "Address", full: true },
      { name: "phone", label: "Phone" },
      { name: "ntn", label: "NTN" },
      { name: "strn", label: "STRN (optional)" },
    ],
  },
  {
    title: "Receipt & POS",
    description: "Terminal and invoice numbering",
    fields: [
      { name: "pos_id", label: "POS / Terminal ID", placeholder: "POS-01" },
      { name: "invoice_prefix", label: "Invoice prefix", placeholder: "KH-", hint: "Invoice: KH-YYMMDD-0001" },
      { name: "receipt_footer", label: "Receipt footer", type: "textarea" },
    ],
  },
  {
    title: "Tax",
    description: "Sales tax shown on invoices",
    fields: [
      { name: "tax_enabled", label: "Charge sales tax", type: "switch" },
      { name: "tax_rate", label: "Tax rate (%)", type: "number" },
      { name: "tax_inclusive", label: "Prices include tax", type: "switch", hint: "Tax is extracted from item prices" },
    ],
  },
  {
    title: "Operations",
    description: "Production and discount controls",
    fields: [
      { name: "expected_yield_per_kg", label: "Expected kabab yield (pcs/kg)", type: "number" },
      { name: "discount_limit", label: "Discount limit without PIN (Rs.)", type: "number", step: "1" },
    ],
  },
];

const DEFAULTS: SettingsInput = {
  restaurant_name: "Kabab House", address: "", phone: "", ntn: "", strn: "", logo_url: "", pos_id: "POS-01", invoice_prefix: "KH-",
  receipt_footer: "Thank you! Please visit again.", tax_enabled: true, tax_rate: 15, tax_inclusive: false, expected_yield_per_kg: 20, discount_limit: 100,
};

const toForm = (s?: Settings): SettingsInput =>
  s ? (Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, s[k as keyof Settings] ?? ""])) as SettingsInput) : DEFAULTS;

function Form({ row, save }: { row?: Settings; save: (v: Partial<Settings>) => Promise<boolean> }) {
  const form = useForm<SettingsInput>({ resolver: zodResolver(settingsSchema) as Resolver<SettingsInput>, defaultValues: toForm(row) });
  const [uploading, setUploading] = useState(false);
  const logo = form.watch("logo_url");

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    const path = `logo-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await db().storage.from("logos").upload(path, file, { upsert: true });
    setUploading(false);
    if (error) return toast.error(error.message);
    form.setValue("logo_url", db().storage.from("logos").getPublicUrl(path).data.publicUrl, { shouldDirty: true });
  };

  const submit = form.handleSubmit(async (v) => {
    const nullable = ["address", "phone", "ntn", "strn", "logo_url", "receipt_footer"] as const;
    const data: Partial<Settings> = { ...v, id: row?.id };
    nullable.forEach((k) => (data[k] = v[k] || null));
    if (await save(data)) form.reset(v);
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        {SECTIONS.map((s, i) => (
          <Card key={s.title} className="rounded-2xl">
            <CardHeader>
              <CardTitle>{s.title}</CardTitle>
              <CardDescription>{s.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {i === 0 && (
                <div className="flex items-center gap-4">
                  <div className="flex size-16 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {logo ? <img src={logo} alt="Logo" className="size-full object-contain" /> : <ImagePlus className="text-muted-foreground" />}
                  </div>
                  <div className="space-x-2">
                    <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                      <label className="cursor-pointer">
                        {uploading && <Loader2 className="animate-spin" />} Upload logo
                        <input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
                      </label>
                    </Button>
                    {logo && <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue("logo_url", "", { shouldDirty: true })}>Remove</Button>}
                  </div>
                </div>
              )}
              <FormFields form={form} fields={s.fields} />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="sticky bottom-0 flex justify-end py-2">
        <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty} className="bg-brand text-white shadow-lg hover:opacity-90">
          {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Save />} Save settings
        </Button>
      </div>
    </form>
  );
}

export function SettingsForm() {
  const table = useTable<Settings>("settings", { order: "created_at" });
  if (table.loading) return <div className="grid gap-4 xl:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>;
  return <Form key={table.rows[0]?.id ?? "new"} row={table.rows[0]} save={table.save} />;
}
