import { NextRequest, NextResponse } from "next/server";
import { findProtectedRouteByPageType } from "@/config/routes";
import { createHash } from "@/lib/crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, loginType } = body;

    console.log("Login attempt:", {
      loginType,
      password,
      body: JSON.stringify(body, null, 2),
    });

    if (!password || !loginType) {
      return NextResponse.json(
        { error: "Password and login type are required" },
        { status: 400 }
      );
    }

    const protectedRoute = findProtectedRouteByPageType(loginType);

    console.log("Found protected route:", {
      route: protectedRoute,
      loginType,
      authConfig: protectedRoute?.authConfig,
    });

    if (!protectedRoute?.authConfig) {
      return NextResponse.json(
        { error: "Invalid login type" },
        { status: 400 }
      );
    }

    const {
      secret,
      cookieName,
      password: storedPassword,
    } = protectedRoute.authConfig;

    console.log("Comparing passwords:", {
      input: password,
      stored: storedPassword,
      match: password === storedPassword,
      type: {
        input: typeof password,
        stored: typeof storedPassword,
      },
    });

    if (password !== storedPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const hash = await createHash(password, secret);
    const response = NextResponse.json({ success: true });
    response.cookies.set(cookieName, hash, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
