import { NextResponse } from "next/server";
import { COOKIE, clientIp, liveEnabled, makeToken, passwordOk } from "@/lib/auth";
import { take } from "@/lib/limit";

export async function POST(req: Request) {
  if (!liveEnabled()) return NextResponse.json({ error: "로그인이 꺼져 있습니다. 데모로 둘러보세요." }, { status: 503 });
  const t = take("login", clientIp(req));
  if (!t.ok) return NextResponse.json({ error: t.reason }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  if (!passwordOk(typeof body?.password === "string" ? body.password : ""))
    return NextResponse.json({ error: "비밀번호가 맞지 않습니다." }, { status: 401 });
  const { value, maxAge } = makeToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, value, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge });
  return res;
}
