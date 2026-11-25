"use client";

import { useState } from "react";
import { Beef, LayoutGrid, UtensilsCrossed } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrudSection } from "@/components/crud-section";
import type { Column } from "@/components/data-table";
import type { FieldDef } from "@/components/form-fields";
import { useTable } from "@/lib/hooks/use-table";
import { formatPKR } from "@/lib/format";
import { categoryEmoji } from "@/lib/pos/emoji";
import type { Tables } from "@/types";

type Category = Tables<"categories">;
type Product = Tables<"products">;
type MenuItem = Tables<"menu_items">;

const name = z.string().trim().min(1, "Required");
const sortOrder = z.number({ error: "Enter a number" }).int().min(0);

const categorySchema = z.object({ name, sort_order: sortOrder });
const categoryDefaults = { name: "", sort_order: 0 };
const categoryFields: FieldDef[] = [
  { name: "name", label: "Name", placeholder: "e.g. Kabab" },
  { name: "sort_order", label: "Display order", type: "number", step: "1" },
];

const productSchema = z.object({ name, unit: name });
const productDefaults = { name: "", unit: "pcs" };
const productFields: FieldDef[] = [
  { name: "name", label: "Name", placeholder: "e.g. Chapli Kabab" },
  { name: "unit", label: "Unit", placeholder: "pcs" },
];

const UNITS = ["plate", "half plate", "piece", "seekh", "glass", "bottle", "bowl"].map((u) => ({ value: u, label: u }));

const itemSchema = z.object({
  name,
  category_id: z.string({ error: "Pick a category" }).min(1, "Pick a category"),
  price: z.number({ error: "Enter a price" }).min(0),
  unit: name,
  sort_order: sortOrder,
  product_id: z.string().nullable(),
  product_qty_per_unit: z.number({ error: "Enter a number" }).min(0),
  image_url: z.string().nullish(),
  is_active: z.boolean(),
});
const itemDefaults = { name: "", category_id: undefined, price: 0, unit: "plate", sort_order: 0, product_id: null, product_qty_per_unit: 0, image_url: null, is_active: true };
const itemFromForm = (v: Record<string, unknown>) => ({
  ...v,
  image_url: v.image_url || null,
  product_qty_per_unit: v.product_id ? v.product_qty_per_unit : 0,
});

function ItemsTab() {
  const items = useTable<MenuItem>("menu_items", { order: "sort_order" });
  const cats = useTable<Category>("categories", { order: "sort_order" });
  const products = useTable<Product>("products");
  const [cat, setCat] = useState("all");

  const fields: FieldDef[] = [
    { name: "name", label: "Item name", full: true, placeholder: "e.g. Chapli Kabab Plate" },
    { name: "category_id", label: "Category", type: "select", options: cats.rows.map((c) => ({ value: c.id, label: c.name })) },
    { name: "price", label: "Price (Rs.)", type: "number", step: "1" },
    { name: "unit", label: "Unit", type: "select", options: UNITS },
    { name: "sort_order", label: "Display order", type: "number", step: "1" },
    { name: "product_id", label: "Recipe: uses product", type: "select", nullable: true, options: products.rows.map((p) => ({ value: p.id, label: p.name })), hint: "For production vs sales reconciliation" },
    { name: "product_qty_per_unit", label: "Product qty per unit", type: "number", hint: "e.g. plate = 2 kababs" },
    { name: "image_url", label: "Photo (optional)", type: "upload", bucket: "logos", folder: "menu/", publicUrl: true, full: true },
    { name: "is_active", label: "Show on POS", type: "switch" },
  ];

  const columns: Column<MenuItem>[] = [
    {
      key: "name", header: "Item",
      cell: (r) => (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {r.image_url ? <img src={r.image_url} alt="" className="size-10 rounded-lg object-cover" /> : <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-lg">{categoryEmoji(cats.byId.get(r.category_id)?.name)}</span>}
          <span className="font-medium">{r.name}</span>
        </div>
      ),
    },
    { key: "category", header: "Category", cell: (r) => <Badge variant="secondary">{cats.byId.get(r.category_id)?.name ?? "—"}</Badge> },
    { key: "price", header: "Price", className: "text-right tabular-nums", cell: (r) => formatPKR(r.price) },
    { key: "unit", header: "Unit" },
    {
      key: "recipe",
      header: "Recipe",
      cell: (r) => (r.product_id ? `${Number(r.product_qty_per_unit)} × ${products.byId.get(r.product_id)?.name ?? "?"}` : <span className="text-muted-foreground">—</span>),
    },
  ];

  return (
    <CrudSection
      table={items}
      noun="Item"
      columns={columns}
      fields={fields}
      schema={itemSchema}
      defaults={itemDefaults}
      fromForm={itemFromForm}
      searchKeys={["name"]}
      emptyIcon={UtensilsCrossed}
      filter={cat === "all" ? undefined : (r) => r.category_id === cat}
      toolbar={
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {cats.rows.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      }
    />
  );
}

function CategoriesTab() {
  const table = useTable<Category>("categories", { order: "sort_order" });
  return (
    <CrudSection
      table={table}
      noun="Category"
      columns={[{ key: "name", header: "Name", cell: (r) => <span className="font-medium">{r.name}</span> }, { key: "sort_order", header: "Order", className: "w-24" }]}
      fields={categoryFields}
      schema={categorySchema}
      defaults={categoryDefaults}
      searchKeys={["name"]}
      emptyIcon={LayoutGrid}
    />
  );
}

function ProductsTab() {
  const table = useTable<Product>("products");
  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">Products are what the kitchen makes (e.g. Chapli Kabab pcs). Link menu items to them to reconcile production vs sales.</p>
      <CrudSection
        table={table}
        noun="Product"
        columns={[{ key: "name", header: "Name", cell: (r) => <span className="font-medium">{r.name}</span> }, { key: "unit", header: "Unit", className: "w-24" }]}
        fields={productFields}
        schema={productSchema}
        defaults={productDefaults}
        searchKeys={["name"]}
        emptyIcon={Beef}
      />
    </>
  );
}

export function MenuManager() {
  return (
    <Tabs defaultValue="items">
      <TabsList className="mb-4">
        <TabsTrigger value="items">Items</TabsTrigger>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="products">Products</TabsTrigger>
      </TabsList>
      <TabsContent value="items"><ItemsTab /></TabsContent>
      <TabsContent value="categories"><CategoriesTab /></TabsContent>
      <TabsContent value="products"><ProductsTab /></TabsContent>
    </Tabs>
  );
}
