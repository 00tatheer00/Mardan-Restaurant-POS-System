import { ldb, localRows } from "@/lib/db";
import { formatDate } from "@/lib/format";

// Per-day counter in IndexedDB, never below the highest invoice already known locally.
export async function nextInvoiceNo(prefix: string) {
  const day = formatDate(new Date(), "yyMMdd");
  const stem = `${prefix}${day}-`;
  return ldb.transaction("rw", ldb.meta, ldb.rows, async () => {
    const cur = Number((await ldb.meta.get(`inv-${day}`))?.value ?? 0);
    const known = (await localRows<{ invoice_no: string }>("orders"))
      .filter((o) => o.invoice_no?.startsWith(stem))
      .map((o) => Number(o.invoice_no.slice(stem.length)) || 0);
    const seq = Math.max(cur, ...known) + 1;
    const running = Number((await ldb.meta.get("inv-running"))?.value ?? 0) + 1;
    await ldb.meta.bulkPut([{ key: `inv-${day}`, value: seq }, { key: "inv-running", value: running }]);
    return `${stem}${String(seq).padStart(4, "0")}`;
  });
}

export function deviceId() {
  let id = localStorage.getItem("kh-device");
  if (!id) localStorage.setItem("kh-device", (id = crypto.randomUUID()));
  return id;
}
