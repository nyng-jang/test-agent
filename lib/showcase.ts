// 시연판: API 키 없이 배포했을 때, 미리 만들어 둔 3개 사례 데이터로 분석·누락 탐지를 재현한다.
// 실제 버전과 같은 응답 형태({ analysis } / { gap })를 돌려주므로 화면 코드는 그대로 쓴다.
import type { Analysis, CaseData, Fact, GapResult, PlanItem } from "./types";
import { DEMO_CASES, demoAnalysis, demoById, demoGap, demoPlanLines } from "./demo";

const KEYWORDS: Record<string, RegExp[]> = {
  av: [/자율\s*주행/, /차선/, /lidar|라이다/i, /트랙/, /대회/],
  estop: [/e-?stop|이\s*스탑/i, /비상\s*정지/, /송신기/, /수신기/, /하트비트|heartbeat/i, /릴레이/],
  dsm: [/사이드\s*미러/, /카메라\s*모니터|cms/i, /serdes/i, /디스플레이/, /후측방/],
};

const norm = (s: string) => s.replace(/\s+/g, "");

export function matchCase(text: string): CaseData | null {
  const exact = DEMO_CASES.find((c) => norm(c.systemInput) === norm(text));
  if (exact) return exact;
  let best: CaseData | null = null, bestScore = 0;
  for (const c of DEMO_CASES) {
    const score = (KEYWORDS[c.id] ?? []).filter((re) => re.test(text)).length;
    if (score > bestScore) { best = c; bestScore = score; }
  }
  return bestScore >= 2 ? best : null;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function simulateAnalyze(systemInput: string, facts: Fact[]) {
  await wait(5500 + Math.random() * 2500);
  const c = matchCase(systemInput);
  if (!c) {
    return { ok: false as const, error: "시연판에서는 자율주행 대회 차량, 무선 E-stop, 디지털 사이드미러 시스템을 분석할 수 있습니다. 예시를 불러오거나 이 시스템들을 설명해 주세요." };
  }
  const a: Analysis = demoAnalysis(c);
  const answered = new Set(facts.map((f) => f.q));
  return { ok: true as const, demoId: c.id, analysis: { ...a, systemInput, questions: a.questions.filter((q) => !answered.has(q.q)) } };
}

/* ---- 계획 줄 ↔ 제안 시험 대조 (글자 2개 묶음 겹침 비율) ---- */
const grams = (s: string) => {
  const t = s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").split(" ").filter(Boolean);
  const out = new Set<string>();
  for (const w of t) {
    if (w.length < 2) continue;
    for (let i = 0; i < w.length - 1; i++) out.add(w.slice(i, i + 2));
  }
  return out;
};
const overlap = (a: Set<string>, b: Set<string>) => {
  if (!a.size) return 0;
  let n = 0;
  a.forEach((g) => { if (b.has(g)) n++; });
  return n / a.size;
};
const hasDetail = (l: string) => /[(\[:→]|->|\d/.test(l);

export function localGap(c: CaseData, lines: string[]): GapResult {
  const preset = demoPlanLines(c).map(norm);
  if (lines.length === preset.length && lines.every((l, i) => norm(l) === preset[i])) return demoGap(c);
  const tg = c.tests.map((t) => ({ t, title: grams(t.title), all: grams(`${t.title} ${t.condition}`) }));
  const known = new Map(c.plan.map((p) => [norm(p.text), p.covers]));
  const plan: PlanItem[] = lines.map((text, i) => {
    const id = `P-${String(i + 1).padStart(2, "0")}`;
    const k = known.get(norm(text));
    if (k) return { id, text, covers: { ...k } };
    const g = grams(text);
    const scored = tg
      .map((x) => ({ id: x.t.id, s: Math.max(overlap(g, x.title), overlap(g, x.all) * 0.9) }))
      .filter((x) => x.s >= 0.34)
      .sort((a, b) => b.s - a.s)
      .slice(0, 2);
    const covers: PlanItem["covers"] = {};
    scored.forEach((x, k) => { covers[x.id] = k === 0 && x.s >= 0.55 && hasDetail(text) ? "full" : "partial"; });
    return { id, text, covers };
  });
  return { tests: c.tests, plan };
}

export async function simulateGap(demoId: string | null, analysis: Analysis | null, lines: string[]) {
  await wait(7000 + Math.random() * 3000);
  const c = (demoId && demoById(demoId)) || (analysis && matchCase(analysis.systemInput));
  if (!c) return { ok: false as const, error: "누락 탐지에 실패했습니다. 1단계부터 다시 진행해 주세요." };
  return { ok: true as const, gap: localGap(c, lines) };
}
