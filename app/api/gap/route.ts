import { NextResponse } from "next/server";
import { guardAi } from "@/lib/guard";
import { callClaudeJson } from "@/lib/claude";
import { cleanPlan, cleanPremises, normalizeAnalysis, normalizeGap } from "@/lib/normalize";
import { GAP_PROMPT, gapUser } from "@/lib/prompt";
import { refund, remaining } from "@/lib/limit";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const analysis = normalizeAnalysis(body?.analysis, typeof body?.analysis?.systemInput === "string" ? body.analysis.systemInput : "");
  if (!analysis.requirements.length) return NextResponse.json({ error: "시스템 분석 결과가 없습니다. 1단계부터 진행해 주세요." }, { status: 400 });
  const plan = cleanPlan(body?.plan);
  const premises = cleanPremises(body?.premises);

  const g = guardAi(req);
  if (g instanceof NextResponse) return g;
  try {
    const { questions, facts, ...forPrompt } = analysis;
    const raw = await callClaudeJson(GAP_PROMPT, gapUser(JSON.stringify(forPrompt), plan, JSON.stringify(premises)), 12000);
    const gap = normalizeGap(raw, analysis, plan, premises);
    if (!gap.tests.length) throw new Error("empty gap");
    return NextResponse.json({ gap, remaining: remaining("ai") });
  } catch (e: any) {
    if (e?.upstream) refund("ai", g.ip);
    console.error("gap failed", e);
    return NextResponse.json({ error: "누락 탐지 중 오류가 났습니다. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
