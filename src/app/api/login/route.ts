// src/app/api/login/route.ts
import { isPasswordValid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    console.log("Received password:", password);

    if (isPasswordValid(password)) {
      console.log("Password is valid, redirecting to /furniset");
      const redirectUrl = new URL("/furniset", request.url);
      console.log("Redirect URL:", redirectUrl.toString());
      
      const response = new NextResponse(null, {
        status: 302,
        headers: {
          Location: redirectUrl.toString(),
          "Set-Cookie": `auth=true; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24}`
        }
      });
      
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));
      return response;
    }

    console.log("Invalid password");
    return new NextResponse("Unauthorized", { status: 401 });
  } catch (error) {
    console.error("Login error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
