"use client";

import { Users } from "lucide-react";
import { z } from "zod";
import { CrudSection } from "@/components/crud-section";
import { PageHeader } from "@/components/page-header";
import { useTable } from "@/lib/hooks/use-table";
import { formatDate, formatPKR } from "@/lib/format";
import { num, optText, req } from "@/lib/validators";
import type { Tables } from "@/types";

const schema = z.object({
  name: req, phone: optText, cnic: optText, designation: optText, monthly_salary: num,
  joining_date: z.string().nullish().transform((v) => v || null), is_active: z.boolean(),
});

export default function StaffPage() {
  const table = useTable<Tables<"staff">>("staff");
  return (
    <>
      <PageHeader title="Staff" description="Team members and monthly salaries" />
      <CrudSection
        table={table}
        noun="Staff member"
        emptyIcon={Users}
        searchKeys={["name", "phone", "designation"]}
        schema={schema}
        defaults={{ name: "", phone: "", cnic: "", designation: "", monthly_salary: undefined, joining_date: "", is_active: true }}
        fields={[
          { name: "name", label: "Name" },
          { name: "designation", label: "Designation", placeholder: "e.g. Cook, Waiter" },
          { name: "phone", label: "Phone" },
          { name: "cnic", label: "CNIC (optional)", placeholder: "00000-0000000-0" },
          { name: "monthly_salary", label: "Monthly salary (Rs.)", type: "number", step: "1" },
          { name: "joining_date", label: "Joining date", type: "date" },
          { name: "is_active", label: "Active", type: "switch" },
        ]}
        columns={[
          { key: "name", header: "Name", cell: (r) => <span className="font-medium">{r.name}</span> },
          { key: "designation", header: "Designation", cell: (r) => r.designation ?? "—" },
          { key: "phone", header: "Phone", cell: (r) => r.phone ?? "—" },
          { key: "joining", header: "Joined", cell: (r) => (r.joining_date ? formatDate(`${r.joining_date}T12:00:00Z`) : "—") },
          { key: "salary", header: "Salary", className: "text-right tabular-nums font-semibold", cell: (r) => formatPKR(r.monthly_salary) },
        ]}
      />
    </>
  );
}
