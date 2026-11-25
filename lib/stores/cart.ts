import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine, Discount } from "@/lib/pos/calc";
import type { OrderType } from "@/types";

type CartState = {
  lines: CartLine[];
  orderType: OrderType;
  tableNo: string;
  discount: Discount;
  orderId: string | null;
  invoiceNo: string | null;
  add: (item: { id: string; name: string; price: number }) => void;
  setQty: (id: string, qty: number) => void;
  set: (p: Partial<Pick<CartState, "orderType" | "tableNo" | "discount">>) => void;
  load: (p: Pick<CartState, "lines" | "orderType" | "tableNo" | "discount" | "orderId" | "invoiceNo">) => void;
  clear: () => void;
};

const empty = { lines: [], orderType: "takeaway" as OrderType, tableNo: "", discount: { type: "amount", value: 0 } as Discount, orderId: null, invoiceNo: null };

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      ...empty,
      add: (item) =>
        set((s) => {
          const found = s.lines.find((l) => l.menu_item_id === item.id);
          return {
            lines: found
              ? s.lines.map((l) => (l === found ? { ...l, qty: l.qty + 1 } : l))
              : [...s.lines, { menu_item_id: item.id, name: item.name, price: Number(item.price), qty: 1 }],
          };
        }),
      setQty: (id, qty) =>
        set((s) => ({ lines: qty <= 0 ? s.lines.filter((l) => l.menu_item_id !== id) : s.lines.map((l) => (l.menu_item_id === id ? { ...l, qty } : l)) })),
      set: (p) => set(p),
      load: (p) => set(p),
      clear: () => set(empty),
    }),
    { name: "kh-cart", partialize: ({ lines, orderType, tableNo, discount, orderId, invoiceNo }) => ({ lines, orderType, tableNo, discount, orderId, invoiceNo }) },
  ),
);
