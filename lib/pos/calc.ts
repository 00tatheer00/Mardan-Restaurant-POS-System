export type CartLine = { menu_item_id: string; name: string; price: number; qty: number };
export type Discount = { type: "amount" | "percent"; value: number };
type TaxSettings = { tax_enabled: boolean; tax_rate: number; tax_inclusive: boolean } | undefined;

export function calcTotals(lines: CartLine[], discount: Discount, s: TaxSettings) {
  const subtotal = Math.round(lines.reduce((a, l) => a + l.price * l.qty, 0));
  const raw = discount.type === "percent" ? (subtotal * discount.value) / 100 : discount.value;
  const disc = Math.round(Math.min(subtotal, Math.max(0, raw || 0)));
  const base = subtotal - disc;
  const rate = s?.tax_enabled ? Number(s.tax_rate) : 0;
  const tax = !rate ? 0 : s!.tax_inclusive ? Math.round(base - base / (1 + rate / 100)) : Math.round((base * rate) / 100);
  const total = s?.tax_inclusive ? base : base + tax;
  return { subtotal, discount: disc, tax, total, rate, inclusive: !!s?.tax_inclusive };
}

export type Totals = ReturnType<typeof calcTotals>;
