import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json();

  if (password === "12345") {
    const response = NextResponse.redirect(new URL("/furniset", req.url));
    response.cookies.set({
      name: "auth",
      value: "true",
      httpOnly: true,
      path: "/",
      sameSite: "strict",
      maxAge: 60 * 60 * 24,
    });
    return response;
  }

  return new Response("Unauthorized", { status: 401 });
}
