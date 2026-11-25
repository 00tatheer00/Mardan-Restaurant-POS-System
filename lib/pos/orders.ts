import { fromZonedTime } from "date-fns-tz";
import { localDelete, localRows, localSave, localSaveMany, type Data } from "@/lib/db";
import { formatDate, TZ } from "@/lib/format";
import type { Tables, TablesInsert } from "@/types";

export type Order = Tables<"orders">;
export type OrderItem = Tables<"order_items">;
export const ORDER_TYPE_LABEL = { dine_in: "Dine-in", takeaway: "Takeaway", delivery: "Delivery" } as const;
export const PAYMENT_LABEL = { cash: "Cash", card: "Card", jazzcash: "JazzCash", easypaisa: "EasyPaisa" } as const;

// Writes go to IndexedDB + sync queue (order → item deletes → items, in that order).
export async function persistOrder(order: TablesInsert<"orders">, items: TablesInsert<"order_items">[], existing: boolean) {
  const id = order.id!;
  if (existing) {
    const old = await localRows<OrderItem>("order_items", (r) => r.order_id === id);
    await localDelete("order_items", old.map((r) => r.id));
    const { invoice_no, cashier_id, created_at_local, ...rest } = order;
    void invoice_no; void cashier_id; void created_at_local;
    await localSave("orders", { ...rest, id } as Data);
  } else {
    await localSave("orders", order as Data);
  }
  await localSaveMany("order_items", items as Data[]);
}

export const startOfTodayISO = () => fromZonedTime(`${formatDate(new Date(), "yyyy-MM-dd")}T00:00:00`, TZ).toISOString();
export const dayRangeISO = (from: string, to: string) => ({
  from: fromZonedTime(`${from}T00:00:00`, TZ).toISOString(),
  to: fromZonedTime(`${to}T23:59:59.999`, TZ).toISOString(),
});

export function printUrl(url: string) {
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0";
  frame.src = url;
  document.body.appendChild(frame);
  setTimeout(() => frame.remove(), 60_000);
}

export const receiptUrl = (id: string, opts: { copy?: boolean; kot?: boolean; print?: boolean } = {}) =>
  `/pos/receipt?id=${id}${opts.print ? "&print=1" : ""}${opts.copy ? "&copy=1" : ""}${opts.kot ? "&type=kot" : ""}`;

export const printReceipt = (id: string, opts: { copy?: boolean; kot?: boolean } = {}) => printUrl(receiptUrl(id, { ...opts, print: true }));
