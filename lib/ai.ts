// 1단계 분석·3단계 누락 탐지. 내 키(live)면 AI를 부르고, 체험(showcase)이면 사례 데이터로 재현한다.
import type { Analysis, Fact, GapResult, Premise } from "./types";
import { callJson, type LlmConfig } from "./llm";
import { normalizeAnalysis, normalizeGap } from "./normalize";
import { ANALYZE_PROMPT, GAP_PROMPT, analyzeUser, gapUser } from "./prompt";

export async function analyzeLive(cfg: LlmConfig, systemInput: string, facts: Fact[]): Promise<Analysis> {
  const text = systemInput.trim();
  if (text.length < 20) throw new Error("시스템 설명을 20자 이상 입력해 주세요.");
  if (text.length > 3000) throw new Error("시스템 설명은 3000자 이하로 입력해 주세요.");
  const raw = await callJson(cfg, ANALYZE_PROMPT, analyzeUser(text, facts.slice(0, 10)), 8000);
  const a = normalizeAnalysis(raw, text);
  if (!a.requirements.length) throw new Error("분석 결과가 비어 있습니다. 설명을 조금 더 자세히 적어 주세요.");
  return a;
}

export async function gapLive(cfg: LlmConfig, analysis: Analysis, plan: string[], premises: Premise[]): Promise<GapResult> {
  const { questions, facts, ...forPrompt } = analysis;
  const lines = plan.slice(0, 60);
  const raw = await callJson(cfg, GAP_PROMPT, gapUser(JSON.stringify(forPrompt), lines, JSON.stringify(premises)), 16000);
  const gap = normalizeGap(raw, analysis, lines, premises);
  if (!gap.tests.length) throw new Error("누락 탐지 결과가 비어 있습니다. 다시 시도해 주세요.");
  return gap;
}
