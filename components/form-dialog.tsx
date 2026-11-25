"use client";

import { useForm, type FieldValues, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormFields, type FieldDef } from "@/components/form-fields";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  schema: z.ZodType;
  fields: FieldDef[];
  values: FieldValues;
  onSubmit: (values: FieldValues) => Promise<boolean | void>;
  submitLabel?: string;
};

export function FormDialog({ open, onOpenChange, title, schema, fields, values, onSubmit, submitLabel = "Save" }: Props) {
  const form = useForm<FieldValues>({ resolver: zodResolver(schema as never) as unknown as Resolver<FieldValues>, defaultValues: values });

  const submit = form.handleSubmit(async (v) => {
    if ((await onSubmit(v)) !== false) onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-6">
          <FormFields form={form} fields={fields} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting} className="bg-brand text-white hover:opacity-90">
              {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
