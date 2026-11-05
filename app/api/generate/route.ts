import { timingSafeEqual, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { normalizeCase } from "@/lib/normalize";
import { SYSTEM_PROMPT, userPrompt } from "@/lib/prompt";
import { refund, remaining, take } from "@/lib/limit";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_SYSTEM = 3000;
const MAX_PLAN_LINES = 30;

// 키와 비밀번호는 서버 환경변수에서만 읽는다. NEXT_PUBLIC_ 접두사를 쓰지 않는다.
const enabled = () => Boolean(process.env.ANTHROPIC_API_KEY && process.env.LIVE_PASSWORD);

function passwordOk(input: string) {
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(input), h(process.env.LIVE_PASSWORD ?? ""));
}

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function GET() {
  return NextResponse.json({ enabled: enabled(), remaining: enabled() ? remaining() : 0 });
}

export async function POST(req: Request) {
  if (!enabled()) return NextResponse.json({ error: "실시간 생성이 꺼져 있습니다. 데모 사례를 확인해 주세요." }, { status: 503 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "요청 형식이 잘못됐습니다." }, { status: 400 }); }

  const password = typeof body?.password === "string" ? body.password : "";
  if (!passwordOk(password)) return NextResponse.json({ error: "비밀번호가 맞지 않습니다." }, { status: 401 });

  const systemInput = typeof body?.systemInput === "string" ? body.systemInput.trim() : "";
  if (systemInput.length < 20) return NextResponse.json({ error: "시스템 설명을 20자 이상 입력해 주세요." }, { status: 400 });
  if (systemInput.length > MAX_SYSTEM) return NextResponse.json({ error: `시스템 설명은 ${MAX_SYSTEM}자 이하로 입력해 주세요.` }, { status: 400 });
  const plan: string[] = (Array.isArray(body?.plan) ? body.plan : [])
    .filter((x: unknown) => typeof x === "string" && x.trim())
    .map((x: string) => x.trim().slice(0, 200))
    .slice(0, MAX_PLAN_LINES);

  const ip = clientIp(req);
  const t = take(ip);
  if (!t.ok) return NextResponse.json({ error: t.reason }, { status: 429 });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
        max_tokens: 12000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt(systemInput, plan) }],
      }),
    });
    if (!res.ok) {
      refund(ip);
      console.error("anthropic error", res.status, (await res.text()).slice(0, 500));
      return NextResponse.json({ error: "생성 중 오류가 났습니다. 잠시 후 다시 시도해 주세요." }, { status: 502 });
    }
    const data = await res.json();
    const text: string = (data?.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("no json");
    const parsed = JSON.parse(text.slice(start, end + 1));
    const c = normalizeCase(parsed, systemInput, plan);
    if (!c.tests.length) throw new Error("empty");
    return NextResponse.json({ case: c, remaining: remaining() });
  } catch (e) {
    console.error("generate failed", e);
    return NextResponse.json({ error: "결과를 해석하지 못했습니다. 다시 시도해 주세요." }, { status: 502 });
  }
}
