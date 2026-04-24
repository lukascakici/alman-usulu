import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import {
  ATTACH_HEADER,
  CLIENT_SESSION_COOKIE,
  COOKIE_MAX_AGE_SECONDS,
  attachCore,
} from "@/lib/modules/sessions/core";

export const config = {
  // Middleware'in çalışacağı path'ler
  matcher: ["/t/:token*", "/staff/:path*"],
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/t/")) {
    return handleCustomerAttach(request);
  }

  if (pathname.startsWith("/staff")) {
    return handleStaffAuth(request);
  }

  return NextResponse.next();
}

// ---------- Müşteri: QR → oturum ----------------------------------------
async function handleCustomerAttach(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/t\/([^/]+)\/?$/);
  if (!match) return NextResponse.next();
  const qrToken = decodeURIComponent(match[1]);

  const existing = request.cookies.get(CLIENT_SESSION_COOKIE)?.value;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const result = await attachCore(supabase, qrToken, existing);
  if (result.kind !== "ok") return NextResponse.next();

  const forwarded = new Headers(request.headers);
  forwarded.set(ATTACH_HEADER, JSON.stringify(result.session));

  const response = NextResponse.next({ request: { headers: forwarded } });

  if (result.newClientSessionId) {
    response.cookies.set(CLIENT_SESSION_COOKIE, result.newClientSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });
  }

  return response;
}

// ---------- Staff: Supabase Auth session refresh + guard ----------------
async function handleStaffAuth(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Refreshes the session if expired; also sets cookies on `response`
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === "/staff/login";

  if (!user && !isLoginPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/staff/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isLoginPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/staff/mutfak";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
