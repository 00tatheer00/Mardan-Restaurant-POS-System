import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { canAccess, homeFor, type Role } from "@/lib/auth/roles";
import type { Database } from "@/types/database";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const path = request.nextUrl.pathname;
  const redirect = (to: string) => {
    const r = NextResponse.redirect(new URL(to, request.url));
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return path === "/login" ? response : redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", user.id).single();
  const role = profile?.is_active ? (profile.role as Role) : null;
  if (!role) return path === "/login" ? response : redirect("/login?error=inactive");

  if (path === "/" || path === "/login" || !canAccess(role, path)) return redirect(homeFor(role));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest|sw.js|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
