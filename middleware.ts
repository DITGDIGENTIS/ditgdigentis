// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  try {
    const isProtected = req.nextUrl.pathname.startsWith("/furniset");
    const isLoggedIn = req.cookies.get("auth")?.value === "true";

    if (isProtected && !isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    return new Response("Internal middleware error", { status: 500 });
  }
}

export const config = {
  matcher: ["/furniset", "/furniset/:path*"],
};
