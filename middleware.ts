import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req });

  const isAuthRoute = pathname.startsWith("/api/auth");
  const isLogin = pathname === "/login";

  if (isAuthRoute) {
    return NextResponse.next();
  }

  if (!token && !isLogin) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }

  if (token && isLogin) {
    const url = new URL("/dashboard", req.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|login|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)).*)",
  ],
}