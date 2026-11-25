export type CsvCol<T> = { header: string; value: (r: T) => string | number | null | undefined };

export function downloadCSV<T>(name: string, rows: T[], cols: CsvCol<T>[]) {
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.map((c) => esc(c.header)).join(","), ...rows.map((r) => cols.map((c) => esc(c.value(r))).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `${name}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}
