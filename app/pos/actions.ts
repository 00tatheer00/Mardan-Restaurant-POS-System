"use server";

import { getProfile } from "@/lib/auth/session";
import { verifyPin } from "@/lib/auth/pin";
import { createAdminClient } from "@/lib/supabase/server";

async function ownerPinOk(pin: string) {
  if (!/^\d{4}$/.test(pin)) return false;
  const { data } = await createAdminClient().from("profiles").select("pin_hash").eq("role", "owner").eq("is_active", true);
  return (data ?? []).some((o) => verifyPin(pin, o.pin_hash));
}

export async function approveWithPin(pin: string) {
  return !!(await getProfile()) && (await ownerPinOk(pin));
}

export async function voidOrder(id: string, reason: string, pin?: string): Promise<{ error?: string }> {
  const me = await getProfile();
  if (!me) return { error: "Not signed in." };
  if (reason.trim().length < 3) return { error: "Enter a reason." };
  if (me.role !== "owner" && !(pin && (await ownerPinOk(pin)))) return { error: "Wrong owner PIN." };
  const { error } = await createAdminClient().from("orders").update({ status: "void", void_reason: reason.trim() }).eq("id", id);
  return error ? { error: error.message } : {};
}
