import { NextResponse } from "next/server";
import { guardAi } from "@/lib/guard";
import { callClaudeJson } from "@/lib/claude";
import { normalizeAnalysis } from "@/lib/normalize";
import { ANALYZE_PROMPT, analyzeUser } from "@/lib/prompt";
import { refund, remaining } from "@/lib/limit";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const systemInput = typeof body?.systemInput === "string" ? body.systemInput.trim() : "";
  if (systemInput.length < 20) return NextResponse.json({ error: "시스템 설명을 20자 이상 입력해 주세요." }, { status: 400 });
  if (systemInput.length > 3000) return NextResponse.json({ error: "시스템 설명은 3000자 이하로 입력해 주세요." }, { status: 400 });
  const answers = (Array.isArray(body?.answers) ? body.answers : [])
    .filter((x: any) => typeof x?.q === "string" && typeof x?.a === "string" && x.a.trim())
    .slice(0, 8)
    .map((x: any) => ({ q: x.q.slice(0, 200), a: x.a.trim().slice(0, 400) }));

  const g = guardAi(req);
  if (g instanceof NextResponse) return g;
  try {
    const raw = await callClaudeJson(ANALYZE_PROMPT, analyzeUser(systemInput, answers), 6000);
    const analysis = normalizeAnalysis(raw, systemInput);
    if (!analysis.requirements.length) throw new Error("empty analysis");
    return NextResponse.json({ analysis, remaining: remaining("ai") });
  } catch (e: any) {
    if (e?.upstream) refund("ai", g.ip);
    console.error("analyze failed", e);
    return NextResponse.json({ error: "분석 중 오류가 났습니다. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
