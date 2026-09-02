import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseEnv } from "@/lib/supabase/env";
import { ONBOARDING_COMPLETE_STEP } from "@/lib/onboarding/constants";

function isAppRoute(pathname: string): boolean {
  if (pathname === "/today") return true;
  const prefixes = [
    "/guidance",
    "/metrics",
    "/habits",
    "/history",
    "/settings",
    "/train",
    "/log-food",
  ];
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Refreshes the Supabase session on every request. Logged-out traffic may hit
 * the landing page, sign-in, sign-up, and the OAuth callback; everything else
 * redirects to sign-in. RLS returns nothing without a user.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url: supabaseUrl, key } = supabaseEnv();

  const supabase = createServerClient(supabaseUrl, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // OAuth callback must run even when no session exists yet.
  if (pathname.startsWith("/auth/callback")) {
    return response;
  }

  if (!user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/welcome";
    return NextResponse.rewrite(url);
  }

  const isAuthPage =
    pathname === "/sign-in" || pathname === "/sign-up" || pathname === "/welcome";
  const isCallback = pathname.startsWith("/auth/callback");

  if (!user && !isAuthPage && !isCallback && pathname !== "/onboarding") {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/") {
    const { data: profile } = await supabase
      .from("user_profile")
      .select("onboarding_step")
      .maybeSingle();
    const complete =
      profile != null && profile.onboarding_step >= ONBOARDING_COMPLETE_STEP;
    const url = request.nextUrl.clone();
    url.pathname = complete ? "/today" : "/onboarding";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/sign-in" || pathname === "/sign-up" || pathname === "/welcome")) {
    const url = request.nextUrl.clone();
    const { data: profile } = await supabase
      .from("user_profile")
      .select("onboarding_step")
      .maybeSingle();
    const complete =
      profile != null && profile.onboarding_step >= ONBOARDING_COMPLETE_STEP;
    url.pathname = complete ? "/today" : "/onboarding";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && isAppRoute(pathname)) {
    const { data: profile } = await supabase
      .from("user_profile")
      .select("onboarding_step")
      .maybeSingle();
    const complete =
      profile != null && profile.onboarding_step >= ONBOARDING_COMPLETE_STEP;
    if (!complete) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (user && pathname === "/onboarding") {
    const { data: profile } = await supabase
      .from("user_profile")
      .select("onboarding_step")
      .maybeSingle();
    if (profile != null && profile.onboarding_step >= ONBOARDING_COMPLETE_STEP) {
      const url = request.nextUrl.clone();
      url.pathname = "/today";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
