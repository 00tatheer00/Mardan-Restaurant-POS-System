import { z } from "zod";

const optional = (s: z.ZodType<string>) => z.union([s, z.literal("")]);

export const userSchema = z.object({
  full_name: z.string().trim().min(1, "Required"),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_.]{3,20}$/, "3–20 chars: a-z, 0-9, _ ."),
  role: z.enum(["owner", "manager", "cashier"]),
  email: optional(z.email("Invalid email")),
  password: optional(z.string().min(8, "Min 8 characters")),
  pin: optional(z.string().regex(/^\d{4}$/, "Exactly 4 digits")),
  is_active: z.boolean(),
});
export type UserInput = z.infer<typeof userSchema>;

const text = z.string().trim();
export const settingsSchema = z.object({
  restaurant_name: text.min(1, "Required"),
  address: text,
  phone: text,
  ntn: text,
  strn: text,
  logo_url: text,
  pos_id: text.min(1, "Required"),
  invoice_prefix: text.max(6, "Max 6 characters"),
  receipt_footer: text,
  tax_enabled: z.boolean(),
  tax_rate: z.number({ error: "Enter a number" }).min(0).max(100),
  tax_inclusive: z.boolean(),
  expected_yield_per_kg: z.number({ error: "Enter a number" }).positive(),
  discount_limit: z.number({ error: "Enter a number" }).min(0),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

export const req = z.string().trim().min(1, "Required");
export const num = z.number({ error: "Enter a number" }).min(0, "Can't be negative");
export const pos = z.number({ error: "Enter a number" }).positive("Must be more than 0");
export const optText = z.string().trim().nullish().transform((v) => v || null);
export const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");
export const pick = (msg = "Select one") => z.string({ error: msg }).min(1, msg);
