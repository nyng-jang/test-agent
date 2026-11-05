import type { CaseData, Category, Stage } from "./types";

const CATS: Category[] = ["env", "func", "comm", "fault", "misuse"];
const STAGES: Stage[] = ["sensor", "process", "actuator", "support"];
const str = (v: unknown, max = 400) => (typeof v === "string" ? v.slice(0, max) : "");
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const int = (v: unknown, lo: number, hi: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
};

/** LLM 출력을 신뢰하지 않고 화면이 쓰는 형태로 정리한다. 없는 ID 참조는 버린다. */
export function normalizeCase(raw: any, systemInput: string, planLines: string[]): CaseData {
  const blocks = arr(raw?.blocks).slice(0, 14).map((b: any, i) => ({
    id: str(b?.id, 30) || `b${i}`,
    label: str(b?.label, 40) || `블록 ${i + 1}`,
    stage: (STAGES.includes(b?.stage) ? b.stage : "process") as Stage,
  }));
  const requirements = arr(raw?.requirements).slice(0, 10).map((r: any, i) => ({
    id: str(r?.id, 20) || `REQ-${String(i + 1).padStart(2, "0")}`,
    text: str(r?.text, 300),
  }));
  const safetyGoals = arr(raw?.safetyGoals).slice(0, 8).map((s: any, i) => ({
    id: str(s?.id, 20) || `SG-${String(i + 1).padStart(2, "0")}`,
    text: str(s?.text, 300),
    safeState: str(s?.safeState, 100),
  }));
  const sgIds = new Set(safetyGoals.map((s) => s.id));
  const reqIds = new Set(requirements.map((r) => r.id));
  const blockIds = new Set(blocks.map((b) => b.id));
  const hazards = arr(raw?.hazards).slice(0, 8).map((h: any, i) => ({
    id: str(h?.id, 20) || `HZ-${String(i + 1).padStart(2, "0")}`,
    text: str(h?.text, 300),
    situation: str(h?.situation, 120),
    S: int(h?.S, 0, 3), E: int(h?.E, 0, 4), C: int(h?.C, 0, 3),
    sg: str(h?.sg, 20),
  })).filter((h) => sgIds.has(h.sg));
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
  }));
  const testIds = new Set(tests.map((t) => t.id));
  const rawPlan = arr(raw?.plan);
  const plan = planLines.map((text, i) => {
    const p: any = rawPlan.find((x: any) => x?.index === i) ?? rawPlan[i] ?? {};
    const covers: Record<string, "full" | "partial"> = {};
    for (const [k, v] of Object.entries(p?.covers ?? {}))
      if (testIds.has(k) && (v === "full" || v === "partial")) covers[k] = v;
    return { id: `P-${String(i + 1).padStart(2, "0")}`, text: text.slice(0, 200), covers };
  });
  return {
    id: "live",
    name: str(raw?.name, 60) || "실시간 생성 결과",
    tab: "실시간",
    summary: str(raw?.summary, 300),
    systemInput,
    planNote: planLines.length ? "직접 입력한 계획입니다." : "계획을 입력하지 않아 모든 제안 항목이 누락으로 표시됩니다.",
    blocks, requirements, hazards, safetyGoals, tests, plan,
    live: true,
  };
}
