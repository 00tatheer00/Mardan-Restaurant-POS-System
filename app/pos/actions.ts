"use server";

import { getProfile } from "@/lib/auth/session";
import { verifyPin } from "@/lib/auth/pin";
import { createAdminClient } from "@/lib/supabase/server";

// Returns an error message, or null when the PIN belongs to an active owner. 5 wrong tries → 5 min lock.
async function checkOwnerPin(pin: string): Promise<string | null> {
  if (!/^\d{4}$/.test(pin)) return "Enter the 4-digit owner PIN.";
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id, pin_hash, pin_failed_count, pin_locked_until").eq("role", "owner").eq("is_active", true);
  const owners = (data ?? []).filter((o) => o.pin_hash);
  if (!owners.length) return "No owner PIN set yet. Owner: Settings → Users → edit yourself → PIN.";
  if (owners.some((o) => o.pin_locked_until && new Date(o.pin_locked_until) > new Date())) return "Too many wrong PINs. Try again in 5 minutes.";
  const ids = owners.map((o) => o.id);
  if (owners.some((o) => verifyPin(pin, o.pin_hash))) {
    if (owners.some((o) => o.pin_failed_count)) await admin.from("profiles").update({ pin_failed_count: 0, pin_locked_until: null }).in("id", ids);
    return null;
  }
  const count = Math.max(...owners.map((o) => o.pin_failed_count)) + 1;
  await admin
    .from("profiles")
    .update(count >= 5 ? { pin_failed_count: 0, pin_locked_until: new Date(Date.now() + 5 * 60_000).toISOString() } : { pin_failed_count: count })
    .in("id", ids);
  return "Wrong owner PIN.";
}

export async function approveWithPin(pin: string): Promise<{ error?: string }> {
  if (!(await getProfile())) return { error: "Not signed in." };
  const error = await checkOwnerPin(pin);
  return error ? { error } : {};
}

export async function voidOrder(id: string, reason: string, pin?: string): Promise<{ error?: string }> {
  const me = await getProfile();
  if (!me) return { error: "Not signed in." };
  if (reason.trim().length < 3) return { error: "Enter a reason." };
  if (me.role !== "owner") {
    const error = await checkOwnerPin(pin ?? "");
    if (error) return { error };
  }
  const { data, error } = await createAdminClient().from("orders").update({ status: "void", void_reason: reason.trim() }).eq("id", id).select("id");
  if (error) return { error: error.message };
  if (!data.length) return { error: "This order hasn't synced yet. Try again in a few seconds." };
  return {};
}
