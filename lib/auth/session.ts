import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, username, role, is_active")
    .eq("id", user.id)
    .single();
  return data?.is_active ? (data as Profile) : null;
});
