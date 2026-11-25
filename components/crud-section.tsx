"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, type LucideIcon } from "lucide-react";
import type { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DataTable, type Column } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import type { FieldDef } from "@/components/form-fields";
import type { useTable } from "@/lib/hooks/use-table";

type Row = { id: string; is_active?: boolean };

type Props<T extends Row> = {
  table: ReturnType<typeof useTable<T>>;
  noun: string;
  columns: Column<T>[];
  fields: FieldDef[];
  schema: z.ZodType;
  defaults: Record<string, unknown>;
  searchKeys?: (keyof T)[];
  filter?: (row: T) => boolean;
  toolbar?: React.ReactNode;
  emptyIcon?: LucideIcon;
  toForm?: (row: T) => Record<string, unknown>;
  fromForm?: (values: Record<string, unknown>) => Record<string, unknown>;
};

export function CrudSection<T extends Row>({
  table, noun, columns, fields, schema, defaults, searchKeys, filter, toolbar, emptyIcon, toForm, fromForm,
}: Props<T>) {
  const [editing, setEditing] = useState<T | null>(null);
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const hasActive = table.rows.some((r) => "is_active" in r);

  const values = useMemo(
    () => (editing ? (toForm ? toForm(editing) : (editing as Record<string, unknown>)) : defaults),
    [editing, defaults, toForm],
  );

  const openForm = (row: T | null) => {
    setEditing(row);
    setFormKey((k) => k + 1);
    setOpen(true);
  };

  const allColumns: Column<T>[] = [
    ...columns,
    ...(hasActive
      ? [{
          key: "is_active",
          header: "Active",
          className: "w-20",
          cell: (r: T) => <Switch checked={!!r.is_active} onCheckedChange={(v) => table.save({ id: r.id, is_active: v } as Partial<T>, { silent: true })} />,
        }]
      : []),
    {
      key: "_actions",
      header: "",
      className: "w-12 text-right",
      cell: (r: T) => <Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => openForm(r)}><Pencil /></Button>,
    },
  ];

  return (
    <>
      <DataTable
        data={filter ? table.rows.filter(filter) : table.rows}
        columns={allColumns}
        loading={table.loading}
        searchKeys={searchKeys}
        searchPlaceholder={`Search ${noun.toLowerCase()}s…`}
        emptyText={`No ${noun.toLowerCase()}s yet`}
        emptyIcon={emptyIcon}
        toolbar={
          <>
            {toolbar}
            <Button onClick={() => openForm(null)} className="bg-brand ml-auto text-white hover:opacity-90"><Plus /> Add {noun}</Button>
          </>
        }
      />
      <FormDialog
        key={formKey}
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Edit ${noun}` : `Add ${noun}`}
        schema={schema}
        fields={fields}
        values={values}
        onSubmit={(v) => {
          const data = fromForm ? fromForm(v) : v;
          return table.save({ ...data, id: editing?.id } as Partial<T>);
        }}
      />
      {hasActive && table.rows.some((r) => !r.is_active) && (
        <p className="mt-2 text-xs text-muted-foreground"><Badge variant="secondary">Inactive</Badge> rows are hidden from POS but kept for history.</p>
      )}
    </>
  );
}
