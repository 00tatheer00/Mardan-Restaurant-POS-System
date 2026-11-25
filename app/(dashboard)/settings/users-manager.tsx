"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { KeyRound, Pencil, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import type { FieldDef } from "@/components/form-fields";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { userSchema, type UserInput } from "@/lib/validators";
import { cn } from "@/lib/utils";
import { listUsers, saveUser, type UserRow } from "./actions";

const ROLE_TONE = {
  owner: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  manager: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  cashier: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

const fields = (editing: boolean): FieldDef[] => [
  { name: "full_name", label: "Full name" },
  { name: "username", label: "Username", hint: "Used for PIN login" },
  { name: "role", label: "Role", type: "select", options: Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label })) },
  { name: "email", label: "Email", type: "email", hint: "Required for owner/manager" },
  { name: "password", label: editing ? "New password" : "Password", type: "password", hint: editing ? "Leave blank to keep" : "Owner/manager login" },
  { name: "pin", label: editing ? "New PIN" : "PIN", type: "password", placeholder: "4 digits", hint: editing ? "Leave blank to keep" : "For POS login & approvals" },
  { name: "is_active", label: "Active", type: "switch" },
];

const blank: UserInput = { full_name: "", username: "", role: "cashier", email: "", password: "", pin: "", is_active: true };

export function UsersManager() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, startLoading] = useTransition();
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const load = useCallback(() => {
    startLoading(async () => {
      try {
        setRows(await listUsers());
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }, []);
  useEffect(load, [load]);

  const openForm = (u: UserRow | null) => {
    setEditing(u);
    setFormKey((k) => k + 1);
    setOpen(true);
  };

  const columns: Column<UserRow>[] = [
    { key: "full_name", header: "Name", cell: (u) => <span className="font-medium">{u.full_name}</span> },
    { key: "username", header: "Username", cell: (u) => u.username ?? "—" },
    { key: "role", header: "Role", cell: (u) => <Badge className={cn("border-0", ROLE_TONE[u.role])}>{ROLE_LABEL[u.role]}</Badge> },
    { key: "email", header: "Email", cell: (u) => (u.email.endsWith("@cashier.local") ? <span className="text-muted-foreground">PIN only</span> : u.email) },
    { key: "has_pin", header: "PIN", cell: (u) => (u.has_pin ? <KeyRound className="size-4 text-emerald-600" /> : <span className="text-muted-foreground">—</span>) },
    { key: "is_active", header: "Status", cell: (u) => <Badge variant={u.is_active ? "secondary" : "destructive"}>{u.is_active ? "Active" : "Disabled"}</Badge> },
    { key: "_a", header: "", className: "w-12 text-right", cell: (u) => <Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => openForm(u)}><Pencil /></Button> },
  ];

  const values: UserInput = editing
    ? { ...blank, full_name: editing.full_name, username: editing.username ?? "", role: editing.role, is_active: editing.is_active, email: editing.email.endsWith("@cashier.local") ? "" : editing.email }
    : blank;

  return (
    <>
      <DataTable
        data={rows}
        columns={columns}
        loading={loading && !rows.length}
        searchKeys={["full_name", "username"]}
        searchPlaceholder="Search users…"
        emptyIcon={Users}
        toolbar={<Button onClick={() => openForm(null)} className="bg-brand ml-auto text-white hover:opacity-90"><Plus /> Add user</Button>}
      />
      <FormDialog
        key={formKey}
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Edit ${editing.full_name}` : "Add user"}
        schema={userSchema}
        fields={fields(!!editing)}
        values={values}
        onSubmit={async (v) => {
          const res = await saveUser(editing?.id ?? null, v as UserInput);
          if (res.error) {
            toast.error(res.error);
            return false;
          }
          toast.success("User saved");
          load();
        }}
      />
    </>
  );
}
