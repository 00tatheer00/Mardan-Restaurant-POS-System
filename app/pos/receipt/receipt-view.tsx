"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cacheRows, getRow, localRows, type Data } from "@/lib/db";
import { db } from "@/lib/hooks/use-table";
import { formatDate, formatNum } from "@/lib/format";
import { ORDER_TYPE_LABEL, PAYMENT_LABEL, type Order, type OrderItem } from "@/lib/pos/orders";
import type { Tables } from "@/types";

const CSS = `
@page { size: 80mm auto; margin: 0; }
html, body { background: #fff !important; color: #000 !important; }
.rc { width: 72mm; margin: 0 auto; padding: 3mm 0 6mm; font: 12px/1.35 "Courier New", Courier, monospace; color: #000; position: relative; }
.rc .c { text-align: center; }
.rc .b { font-weight: 700; }
.rc .hr { border-top: 1px dashed #000; margin: 4px 0; }
.rc .hr2 { border-top: 2px solid #000; margin: 4px 0; }
.rc .row { display: flex; flex-wrap: wrap; justify-content: space-between; column-gap: 6px; }
.rc .items { display: grid; grid-template-columns: 1fr 5ch 7ch 9ch; column-gap: 2px; }
.rc .items > :nth-child(4n+2), .rc .items > :nth-child(4n+3), .rc .items > :nth-child(4n+4) { text-align: right; }
.rc .big { font-size: 15px; }
.rc .tag { border: 2px solid #000; padding: 2px 0; margin: 4px 0; letter-spacing: 3px; }
.rc .wm { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 64px; font-weight: 900; transform: rotate(-30deg); opacity: .18; pointer-events: none; }
.rc.kot { font-size: 16px; }
.rc.kot .items { grid-template-columns: 5ch 1fr; font-size: 18px; font-weight: 700; row-gap: 4px; }
.rc.kot .items > * { text-align: left !important; }
.rc .qr svg { width: 32mm; height: 32mm; margin: 4px auto; display: block; }
@media print { .no-print { display: none !important; } }
`;

type Settings = Tables<"settings">;
type Loaded = { order: Order; items: OrderItem[]; s?: Settings; cashier?: string; qr: string };

async function localFirst<T>(table: string, local: () => Promise<T | undefined>, remote: () => PromiseLike<{ data: unknown }>) {
  const hit = await local();
  if (hit && (!Array.isArray(hit) || hit.length)) return hit;
  try {
    const { data } = await remote();
    if (data) await cacheRows(table, (Array.isArray(data) ? data : [data]) as Data[]);
    return (await local()) ?? undefined;
  } catch {
    return hit;
  }
}

async function load(id: string): Promise<Loaded | null> {
  const order = await localFirst("orders", () => getRow<Order>("orders", id), () => db().from("orders").select("*").eq("id", id).maybeSingle());
  if (!order) return null;
  // Voids happen server-side: refresh status when online.
  if (navigator.onLine) {
    try {
      const { data } = await db().from("orders").select("*").eq("id", id).maybeSingle();
      if (data) { await cacheRows("orders", [data as Data]); Object.assign(order, data); }
    } catch { /* offline */ }
  }
  const [items, settings, cashier] = await Promise.all([
    localFirst("order_items", () => localRows<OrderItem>("order_items", (r) => r.order_id === id), () => db().from("order_items").select("*").eq("order_id", id)),
    localFirst("settings", () => localRows<Settings>("settings").then((r) => r[0]), () => db().from("settings").select("*").limit(1)),
    order.cashier_id
      ? localFirst("profiles", () => getRow<{ full_name: string }>("profiles", order.cashier_id!), () => db().from("profiles").select("id, full_name").eq("id", order.cashier_id!))
      : undefined,
  ]);
  const date = formatDate(order.created_at_local, "dd-MMM-yyyy HH:mm");
  const qr = await QRCode.toString(JSON.stringify({ inv: order.invoice_no, date, total: Number(order.total), pos: settings?.pos_id }), { type: "svg", margin: 0 });
  return { order, items: (items ?? []).sort((a, b) => String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""))), s: settings, cashier: cashier?.full_name, qr };
}

export function ReceiptView() {
  const [p, setP] = useState<{ id: string; kot: boolean; copy: boolean; print: boolean } | null>(null);
  const [data, setData] = useState<Loaded | null | undefined>(undefined);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const params = { id: sp.get("id") ?? "", kot: sp.get("type") === "kot", copy: sp.get("copy") === "1", print: sp.get("print") === "1" };
    let alive = true;
    load(params.id).then((d) => {
      if (!alive) return;
      setP(params);
      setData(d);
      if (d && params.print) setTimeout(() => window.print(), 250);
    });
    return () => { alive = false; };
  }, []);

  if (data === undefined || !p) return <style>{CSS}</style>;
  if (!data) return <div className="rc c">Receipt not found</div>;

  const { order, items, s, cashier, qr } = data;
  const type = `${ORDER_TYPE_LABEL[order.order_type]}${order.table_no ? ` T${order.table_no}` : ""}`;
  const date = formatDate(order.created_at_local, "dd-MMM-yyyy");
  const time = formatDate(order.created_at_local, "HH:mm");
  const rate = s?.tax_enabled ? Number(s.tax_rate) : 0;
  const credit = process.env.NEXT_PUBLIC_SOFTWARE_CREDIT;

  const controls = (
    <div className="no-print fixed right-4 bottom-4 flex gap-2">
      <Button onClick={() => window.print()} className="bg-brand text-white"><Printer /> Print</Button>
      <Button variant="outline" onClick={() => window.close()}>Close</Button>
    </div>
  );

  if (p.kot) {
    return (
      <>
        <style>{CSS}</style>
        <div className="rc kot">
          <div className="c b big tag">KITCHEN ORDER</div>
          <div className="c b" style={{ fontSize: 22 }}>{type}</div>
          <div className="row"><span>{order.invoice_no}</span><span>{time}</span></div>
          <div>By: {cashier ?? "-"}</div>
          <div className="hr2" />
          <div className="items">
            {items.map((i) => [<span key={i.id + "q"}>{formatNum(i.qty)} x</span>, <span key={i.id + "n"}>{i.name_snapshot}</span>])}
          </div>
          <div className="hr2" />
        </div>
        {controls}
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="rc">
        {order.status === "void" && <div className="wm">VOID</div>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {s?.logo_url && <img src={s.logo_url} alt="" style={{ maxWidth: "40mm", maxHeight: "20mm", margin: "0 auto 4px", display: "block", filter: "grayscale(1)" }} />}
        <div className="c b big">{(s?.restaurant_name ?? "Kabab House").toUpperCase()}</div>
        {(s?.address || s?.phone) && <div className="c">{[s?.address, s?.phone].filter(Boolean).join(" · ")}</div>}
        {s?.ntn && <div className="c">NTN: {s.ntn}</div>}
        {s?.strn && <div className="c">STRN: {s.strn}</div>}
        {p.copy && <div className="c b tag">DUPLICATE</div>}
        <div className="hr" />
        <div className="c b">{rate ? "SALES TAX INVOICE" : "INVOICE"}</div>
        <div>Invoice #: {order.invoice_no}</div>
        <div>POS ID   : {s?.pos_id ?? "-"}</div>
        <div className="row"><span>Date: {date}</span><span>Time: {time}</span></div>
        <div className="row"><span>Cashier: {cashier ?? "-"}</span><span>{type}</span></div>
        {order.status === "open" && <div className="c b tag">UNPAID · OPEN</div>}
        <div className="hr" />
        <div className="items b"><span>Item</span><span>Qty</span><span>Rate</span><span>Amount</span></div>
        <div className="hr" />
        <div className="items">
          {items.map((i) => [
            <span key={i.id + "n"}>{i.name_snapshot}</span>,
            <span key={i.id + "q"}>{formatNum(i.qty)}</span>,
            <span key={i.id + "r"}>{formatNum(i.unit_price)}</span>,
            <span key={i.id + "a"}>{formatNum(i.line_total)}</span>,
          ])}
        </div>
        <div className="hr" />
        <div className="row"><span>Sub Total</span><span>{formatNum(order.subtotal)}</span></div>
        {Number(order.discount) > 0 && <div className="row"><span>Discount</span><span>-{formatNum(order.discount)}</span></div>}
        {rate > 0 && <div className="row"><span>Sales Tax ({rate}%{s?.tax_inclusive ? " incl." : ""})</span><span>{formatNum(order.tax_amount)}</span></div>}
        <div className="hr2" />
        <div className="row b big"><span>TOTAL (PKR)</span><span>{formatNum(order.total)}</span></div>
        <div className="hr2" />
        {order.payment_method && (
          <>
            <div className="row"><span>Payment: {PAYMENT_LABEL[order.payment_method]}</span><span>Received: {formatNum(order.amount_received)}</span></div>
            <div className="row"><span /><span>Change: {formatNum(order.change_due)}</span></div>
            <div className="hr" />
          </>
        )}
        <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} />
        <div className="hr" />
        {s?.receipt_footer && <div className="c">{s.receipt_footer}</div>}
        {order.status === "void" && <div className="c b">VOID: {order.void_reason}</div>}
        {credit && <div className="c" style={{ fontSize: 10, marginTop: 4 }}>{credit}</div>}
      </div>
      {controls}
    </>
  );
}
