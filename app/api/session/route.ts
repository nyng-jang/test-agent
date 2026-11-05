import { NextResponse } from "next/server";
import { liveEnabled, readCookie, tokenOk } from "@/lib/auth";
import { remaining } from "@/lib/limit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const loggedIn = tokenOk(readCookie(req));
  return NextResponse.json({ liveEnabled: liveEnabled(), loggedIn, remaining: loggedIn ? remaining("ai") : 0 });
}
