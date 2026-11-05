import type { CaseData } from "./types";
import { CATEGORIES } from "./types";
import { testStatusMap } from "./analysis";

export interface Check { label: string; pass: boolean; detail: string }

/** 기획서의 검증 기준을 데이터로 확인한다. scripts/validate.mjs와 같은 기준. */
export function runChecks(cases: CaseData[]): Check[] {
  const out: Check[] = [];
  const av = cases.find((c) => c.id === "av");
  if (av) {
    const st = testStatusMap(av);
    const sun = av.tests.filter((t) => /직사광선/.test(t.title) && t.cat === "env");
    const caught = sun.length > 0 && sun.some((t) => st[t.id] === "missing");
    out.push({
      label: "자율주행: 야간 위주 계획에서 주간 직사광선 조건을 누락으로 잡아내는가",
      pass: caught,
      detail: sun.map((t) => `${t.id} ${st[t.id] === "missing" ? "누락 표시" : "반영됨"}`).join(", ") || "직사광선 항목 없음",
    });
  }
  const MIN = 3;
  for (const c of cases) {
    const counts = CATEGORIES.map((k) => c.tests.filter((t) => t.cat === k.id).length);
    out.push({
      label: `${c.tab}: 5개 카테고리가 고르게 채워지는가 (각 ${MIN}개 이상)`,
      pass: counts.every((n) => n >= MIN),
      detail: CATEGORIES.map((k, i) => `${k.short} ${counts[i]}`).join(" · "),
    });
  }
  return out;
}
