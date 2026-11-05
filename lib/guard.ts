import { NextResponse } from "next/server";
import { clientIp, liveEnabled, readCookie, tokenOk } from "./auth";
import { take } from "./limit";

/** AI 호출 전 공통 확인: 실시간 사용 가능 + 로그인 + 횟수. 통과하면 ip를 돌려준다. */
export function guardAi(req: Request): { ip: string } | NextResponse {
  if (!liveEnabled()) return NextResponse.json({ error: "AI 생성이 꺼져 있습니다. 데모로 둘러보세요." }, { status: 503 });
  if (!tokenOk(readCookie(req))) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const ip = clientIp(req);
  const t = take("ai", ip);
  if (!t.ok) return NextResponse.json({ error: t.reason }, { status: 429 });
  return { ip };
}
