"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { verifyPin } from "@/lib/auth/pin";

export type LoginState = { error?: string };

const emailSchema = z.object({ email: z.email(), password: z.string().min(6) });
const pinSchema = z.object({ username: z.string().trim().min(1), pin: z.string().regex(/^\d{4}$/) });

export async function signInWithEmail(_: LoginState, fd: FormData): Promise<LoginState> {
  const parsed = emailSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Enter a valid email and password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };
  redirect("/");
}

export async function signInWithPin(_: LoginState, fd: FormData): Promise<LoginState> {
  const parsed = pinSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Enter username and 4-digit PIN." };
  const fail = { error: "Invalid username or PIN." };

  const admin = createAdminClient();
  const { data: p } = await admin
    .from("profiles")
    .select("id, pin_hash, is_active, pin_failed_count, pin_locked_until")
    .eq("username", parsed.data.username.toLowerCase())
    .single();
  if (!p?.is_active) return fail;
  if (p.pin_locked_until && new Date(p.pin_locked_until) > new Date()) return { error: "Too many wrong PINs. Try again in a few minutes." };
  if (!verifyPin(parsed.data.pin, p.pin_hash)) {
    const count = p.pin_failed_count + 1;
    await admin
      .from("profiles")
      .update({ pin_failed_count: count >= 5 ? 0 : count, pin_locked_until: count >= 5 ? new Date(Date.now() + 5 * 60_000).toISOString() : null })
      .eq("id", p.id);
    return fail;
  }
  if (p.pin_failed_count) await admin.from("profiles").update({ pin_failed_count: 0, pin_locked_until: null }).eq("id", p.id);

  const { data: u } = await admin.auth.admin.getUserById(p.id);
  if (!u.user?.email) return fail;
  const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: u.user.email });
  if (error) return { error: error.message };

  const supabase = await createClient();
  const { error: otpError } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
  if (otpError) return { error: otpError.message };
  redirect("/pos");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
