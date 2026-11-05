import type { Analysis, Category, GapResult, Stage } from "./types";

const CATS: Category[] = ["env", "func", "comm", "fault", "misuse"];
const STAGES: Stage[] = ["sensor", "process", "actuator", "support"];
const str = (v: unknown, max = 400) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const int = (v: unknown, lo: number, hi: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
};
const pad = (p: string, i: number) => `${p}-${String(i + 1).padStart(2, "0")}`;

/** LLM 출력(또는 클라이언트가 보낸 분석)을 신뢰하지 않고 화면이 쓰는 형태로 정리한다. */
export function normalizeAnalysis(raw: any, systemInput: string): Analysis {
  const blocks = arr(raw?.blocks).slice(0, 14).map((b: any, i) => ({
    id: str(b?.id, 30) || `b${i}`,
    label: str(b?.label, 40) || `블록 ${i + 1}`,
    stage: (STAGES.includes(b?.stage) ? b.stage : "process") as Stage,
  }));
  const requirements = arr(raw?.requirements).slice(0, 15)
    .map((r: any, i) => ({ id: str(r?.id, 20) || pad("REQ", i), text: str(r?.text, 300) }))
    .filter((r) => r.text);
  const safetyGoals = arr(raw?.safetyGoals).slice(0, 8).map((s: any, i) => ({
    id: str(s?.id, 20) || pad("SG", i), text: str(s?.text, 300), safeState: str(s?.safeState, 100),
  }));
  const sgIds = new Set(safetyGoals.map((s) => s.id));
  const hazards = arr(raw?.hazards).slice(0, 8).map((h: any, i) => ({
    id: str(h?.id, 20) || pad("HZ", i), text: str(h?.text, 300), situation: str(h?.situation, 120),
    S: int(h?.S, 0, 3), E: int(h?.E, 0, 4), C: int(h?.C, 0, 3), sg: str(h?.sg, 20),
  })).filter((h) => sgIds.has(h.sg));
  const questions = arr(raw?.questions).slice(0, 6).map((q: any, i) => ({
    id: str(q?.id, 10) || `Q${i + 1}`, q: str(q?.q, 200), why: str(q?.why, 200), assumption: str(q?.assumption, 200),
  })).filter((q) => q.q);
  return {
    name: str(raw?.name, 60) || "내 시스템",
    summary: str(raw?.summary, 400),
    systemInput: systemInput.slice(0, 3000),
    blocks, requirements, hazards, safetyGoals, questions,
  };
}

export function normalizeGap(raw: any, a: Analysis, planLines: string[]): GapResult {
  const reqIds = new Set(a.requirements.map((r) => r.id));
  const sgIds = new Set(a.safetyGoals.map((s) => s.id));
  const blockIds = new Set(a.blocks.map((b) => b.id));
  const seen = new Set<string>();
  const tests = arr(raw?.tests).slice(0, 40).map((t: any, i) => ({
    id: str(t?.id, 20) || `TC-${i + 1}`,
    cat: (CATS.includes(t?.cat) ? t.cat : "func") as Category,
    title: str(t?.title, 120),
    condition: str(t?.condition, 500),
    criteria: str(t?.criteria, 400),
    reqs: arr(t?.reqs).map((x) => str(x, 20)).filter((x) => reqIds.has(x)),
    sgs: arr(t?.sgs).map((x) => str(x, 20)).filter((x) => sgIds.has(x)),
    blocks: arr(t?.blocks).map((x) => str(x, 30)).filter((x) => blockIds.has(x)),
    why: str(t?.why, 300) || undefined,
  })).filter((t) => t.title && !seen.has(t.id) && seen.add(t.id));
  const testIds = new Set(tests.map((t) => t.id));
  const rawPlan = arr(raw?.plan);
  const plan = planLines.map((text, i) => {
    const p: any = rawPlan.find((x: any) => x?.index === i) ?? {};
    const covers: Record<string, "full" | "partial"> = {};
    for (const [k, v] of Object.entries(p?.covers ?? {}))
      if (testIds.has(k) && (v === "full" || v === "partial")) covers[k] = v;
    return { id: pad("P", i), text: text.slice(0, 200), covers };
  });
  return { tests, plan };
}

export function cleanPlan(v: unknown): string[] {
  return arr(v).filter((x) => typeof x === "string" && x.trim()).map((x) => (x as string).trim().slice(0, 200)).slice(0, 60);
}
