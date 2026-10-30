import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, isAdminSession } from "@/lib/adminAuth";

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/admin/login") return NextResponse.next();
  if (await isAdminSession(req.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();
  const login = new URL("/admin/login", req.url);
  login.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/admin/:path*"] };
