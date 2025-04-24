import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  if (body.password === "12345") {
    const res = NextResponse.json({ ok: true });

    res.headers.set(
      "Set-Cookie",
      `auth=true; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24}`
    );

    return res;
  }

  return new Response("Unauthorized", { status: 401 });
}
