// Hand-written to match supabase/migrations. Replace with `npm run db:types` once a project is linked.
type Base = { branch_id: string; created_at: string; updated_at: string | null; created_by: string | null };
type Tbl<R, Opt extends keyof R = never> = {
  Row: R & Base;
  Insert: Omit<R, Opt | "id"> & Partial<Pick<R, Opt>> & { id?: string } & Partial<Base>;
  Update: Partial<R & Base>;
  Relationships: [];
};
type View<R> = { Row: R; Relationships: [] };
type N = number;
type S = string;
type Nul<T> = T | null;

export type UserRole = "owner" | "manager" | "cashier";
export type OrderType = "dine_in" | "takeaway" | "delivery";
export type OrderStatus = "open" | "paid" | "void";
export type PaymentMethod = "cash" | "card" | "jazzcash" | "easypaisa";
export type RawUnit = "kg" | "litre" | "piece";

export type Database = {
  public: {
    Tables: {
      branches: { Row: { id: S; name: S; address: Nul<S>; created_at: S; updated_at: Nul<S> }; Insert: { id?: S; name: S; address?: Nul<S> }; Update: { name?: S; address?: Nul<S> }; Relationships: [] };
      profiles: Tbl<{ id: S; full_name: S; username: Nul<S>; role: UserRole; pin_hash: Nul<S>; pin_failed_count: N; pin_locked_until: Nul<S>; is_active: boolean }, "username" | "role" | "pin_hash" | "pin_failed_count" | "pin_locked_until" | "is_active">;
      settings: Tbl<{
        id: S; restaurant_name: S; address: Nul<S>; phone: Nul<S>; ntn: Nul<S>; strn: Nul<S>; pos_id: S; invoice_prefix: S;
        tax_enabled: boolean; tax_rate: N; tax_inclusive: boolean; receipt_footer: Nul<S>; logo_url: Nul<S>;
        expected_yield_per_kg: N; discount_limit: N;
      }, "restaurant_name" | "address" | "phone" | "ntn" | "strn" | "pos_id" | "invoice_prefix" | "tax_enabled" | "tax_rate" | "tax_inclusive" | "receipt_footer" | "logo_url" | "expected_yield_per_kg" | "discount_limit">;
      categories: Tbl<{ id: S; name: S; sort_order: N; is_active: boolean }, "sort_order" | "is_active">;
      products: Tbl<{ id: S; name: S; unit: S }, "unit">;
      menu_items: Tbl<{
        id: S; category_id: S; name: S; price: N; unit: S; image_url: Nul<S>; is_active: boolean; sort_order: N;
        product_id: Nul<S>; product_qty_per_unit: N;
      }, "unit" | "image_url" | "is_active" | "sort_order" | "product_id" | "product_qty_per_unit">;
      orders: Tbl<{
        id: S; invoice_no: S; order_type: OrderType; table_no: Nul<S>; status: OrderStatus; subtotal: N; discount: N;
        tax_amount: N; total: N; payment_method: Nul<PaymentMethod>; amount_received: Nul<N>; change_due: Nul<N>;
        void_reason: Nul<S>; cashier_id: Nul<S>; device_id: Nul<S>; created_at_local: S; synced_at: Nul<S>;
      }, "order_type" | "table_no" | "status" | "subtotal" | "discount" | "tax_amount" | "total" | "payment_method" | "amount_received" | "change_due" | "void_reason" | "cashier_id" | "device_id" | "created_at_local" | "synced_at">;
      order_items: Tbl<{ id: S; order_id: S; menu_item_id: Nul<S>; name_snapshot: S; unit_price: N; qty: N; line_total: N }, "menu_item_id">;
      raw_items: Tbl<{ id: S; name: S; unit: RawUnit; is_active: boolean }, "unit" | "is_active">;
      suppliers: Tbl<{ id: S; name: S; phone: Nul<S>; is_active: boolean }, "phone" | "is_active">;
      purchases: Tbl<{
        id: S; date: S; raw_item_id: S; supplier_id: Nul<S>; qty: N; rate: N; total: N; is_paid: boolean; note: Nul<S>;
      }, "date" | "supplier_id" | "is_paid" | "note">;
      supplier_payments: Tbl<{ id: S; supplier_id: S; date: S; amount: N; note: Nul<S> }, "date" | "note">;
      production_batches: Tbl<{
        id: S; date: S; raw_item_id: S; raw_qty: N; product_id: S; qty_produced: N; note: Nul<S>;
      }, "date" | "note">;
      day_closings: Tbl<{
        id: S; date: S; product_id: S; opening_qty: N; produced_qty: N; sold_qty: N; leftover_qty: N; wastage_qty: N;
        difference: N; closed_by: Nul<S>;
      }, "date" | "opening_qty" | "produced_qty" | "sold_qty" | "leftover_qty" | "wastage_qty" | "difference" | "closed_by">;
      expense_categories: Tbl<{ id: S; name: S; is_active: boolean }, "is_active">;
      expenses: Tbl<{
        id: S; date: S; category_id: S; amount: N; payment_method: PaymentMethod; note: Nul<S>; receipt_url: Nul<S>;
      }, "date" | "payment_method" | "note" | "receipt_url">;
      staff: Tbl<{
        id: S; name: S; phone: Nul<S>; cnic: Nul<S>; designation: Nul<S>; monthly_salary: N; joining_date: Nul<S>; is_active: boolean;
      }, "phone" | "cnic" | "designation" | "monthly_salary" | "joining_date" | "is_active">;
      salary_advances: Tbl<{ id: S; staff_id: S; date: S; amount: N; note: Nul<S> }, "date" | "note">;
      salary_payments: Tbl<{
        id: S; staff_id: S; month: S; base_salary: N; advances_deducted: N; amount_paid: N; paid_on: Nul<S>; note: Nul<S>;
      }, "advances_deducted" | "amount_paid" | "paid_on" | "note">;
    };
    Views: {
      v_daily_sales: View<{
        date: S; orders_count: N; subtotal: N; discount: N; tax_amount: N; total: N; avg_bill: N;
        cash: N; card: N; jazzcash: N; easypaisa: N;
      }>;
      v_hourly_sales: View<{ date: S; hour: N; orders_count: N; total: N }>;
      v_item_sales: View<{ date: S; menu_item_id: Nul<S>; name: S; category_id: Nul<S>; category_name: Nul<S>; qty: N; amount: N }>;
      v_daily_pnl: View<{ date: S; sales: N; purchases: N; expenses: N; salaries: N; net: N }>;
      v_production_recon: View<{
        date: S; product_id: S; product_name: S; opening_qty: N; raw_qty: N; produced_qty: N; yield_per_kg: Nul<N>;
        sold_qty: N; leftover_qty: N; wastage_qty: N; difference: N; is_closed: boolean;
      }>;
      v_raw_stock: View<{ raw_item_id: S; name: S; unit: RawUnit; is_active: boolean; purchased_qty: N; used_qty: N; balance_qty: N }>;
      v_supplier_ledger: View<{ supplier_id: S; name: S; phone: Nul<S>; is_active: boolean; purchased: N; paid: N; balance: N }>;
    };
    Functions: {
      auth_role: { Args: Record<string, never>; Returns: UserRole };
      has_role: { Args: { roles: UserRole[] }; Returns: boolean };
      pk_today: { Args: Record<string, never>; Returns: string };
    };
    Enums: {
      user_role: UserRole;
      order_type: OrderType;
      order_status: OrderStatus;
      payment_method: PaymentMethod;
      raw_unit: RawUnit;
    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
