"use server";

import { randomBytes } from "node:crypto";
import { getProfile } from "@/lib/auth/session";
import { hashPin } from "@/lib/auth/pin";
import { createAdminClient } from "@/lib/supabase/server";
import { userSchema, type UserInput } from "@/lib/validators";
import type { UserRole } from "@/types";

export type UserRow = {
  id: string; full_name: string; username: string | null; role: UserRole; is_active: boolean; email: string; has_pin: boolean;
};

async function requireOwner() {
  const me = await getProfile();
  if (me?.role !== "owner") throw new Error("Only the owner can manage users.");
  return me;
}

export async function listUsers(): Promise<UserRow[]> {
  await requireOwner();
  const admin = createAdminClient();
  const [{ data: profiles }, { data: auth }] = await Promise.all([
    admin.from("profiles").select("id, full_name, username, role, is_active, pin_hash").order("full_name"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const emails = new Map(auth?.users.map((u) => [u.id, u.email ?? ""]));
  return (profiles ?? []).map(({ pin_hash, ...p }) => ({ ...p, email: emails.get(p.id) ?? "", has_pin: !!pin_hash }));
}

export async function saveUser(id: string | null, input: UserInput): Promise<{ error?: string }> {
  try {
    const me = await requireOwner();
    const parsed = userSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const v = parsed.data;
    const admin = createAdminClient();

    const { data: taken } = await admin.from("profiles").select("id").eq("username", v.username).maybeSingle();
    if (taken && taken.id !== id) return { error: "Username already taken." };

    if (!id) {
      if (v.role !== "cashier" && (!v.email || !v.password)) return { error: "Owner/Manager need email and password." };
      if (v.role === "cashier" && !v.pin) return { error: "Cashier needs a 4-digit PIN." };
      const { data, error } = await admin.auth.admin.createUser({
        email: v.email || `${v.username}@cashier.local`,
        password: v.password || randomBytes(24).toString("base64url"),
        email_confirm: true,
        user_metadata: { full_name: v.full_name, username: v.username },
        app_metadata: { role: v.role },
      });
      if (error) return { error: error.message };
      id = data.user.id;
    } else {
      if (id === me.id && (v.role !== "owner" || !v.is_active)) return { error: "You can't demote or disable yourself." };
      if (v.role !== "cashier" && (!v.email || !v.password)) {
        const { data: cur } = await admin.auth.admin.getUserById(id);
        if (cur.user?.email?.endsWith("@cashier.local") && (!v.email || !v.password)) return { error: "Owner/Manager need an email and password to sign in." };
      }
      const { error } = await admin.auth.admin.updateUserById(id, {
        ...(v.email && { email: v.email, email_confirm: true }),
        ...(v.password && { password: v.password }),
        app_metadata: { role: v.role },
        ban_duration: v.is_active ? "none" : "876000h",
      });
      if (error) return { error: error.message };
    }

    const { error } = await admin
      .from("profiles")
      .update({ full_name: v.full_name, username: v.username, role: v.role, is_active: v.is_active, ...(v.pin && { pin_hash: hashPin(v.pin) }) })
      .eq("id", id);
    return error ? { error: error.message } : {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}
