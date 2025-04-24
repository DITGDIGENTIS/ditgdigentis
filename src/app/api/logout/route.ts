import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ status: "logged out" });
  res.cookies.delete("auth");
  return res;
}

