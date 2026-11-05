import type { Asil, CaseData, Category, CoverLevel, Hazard, TestItem } from "./types";

const ASIL_ORDER: Asil[] = ["QM", "A", "B", "C", "D"];

/**
 * S/E/C → ASIL. 위험도 표의 일반적인 경향을 합산식으로 표현한 것:
 * S(1~3) + E(1~4) + C(1~3) 합이 10=D, 9=C, 8=B, 7=A, 그 이하는 QM. 어느 하나라도 0이면 QM.
 */
export function asilOf(S: number, E: number, C: number): Asil {
  if (S <= 0 || E <= 0 || C <= 0) return "QM";
  const sum = S + E + C;
  if (sum >= 10) return "D";
  if (sum === 9) return "C";
  if (sum === 8) return "B";
  if (sum === 7) return "A";
  return "QM";
}

export const maxAsil = (list: Asil[]): Asil =>
  list.reduce<Asil>((m, a) => (ASIL_ORDER.indexOf(a) > ASIL_ORDER.indexOf(m) ? a : m), "QM");

export const asilRank = (a: Asil) => ASIL_ORDER.indexOf(a);

export const hazardAsil = (h: Hazard) => asilOf(h.S, h.E, h.C);

export function sgAsilMap(c: CaseData): Record<string, Asil> {
  const m: Record<string, Asil> = {};
  for (const sg of c.safetyGoals) m[sg.id] = "QM";
  for (const h of c.hazards) m[h.sg] = maxAsil([m[h.sg] ?? "QM", hazardAsil(h)]);
  return m;
}

export const testAsil = (t: TestItem, sgAsil: Record<string, Asil>) =>
  maxAsil(t.sgs.map((s) => sgAsil[s] ?? "QM"));

export type TestStatus = CoverLevel | "missing";

export function testStatusMap(c: CaseData): Record<string, TestStatus> {
  const m: Record<string, TestStatus> = {};
  for (const t of c.tests) m[t.id] = "missing";
  for (const p of c.plan)
    for (const [tid, lvl] of Object.entries(p.covers)) {
      if (!(tid in m)) continue;
      if (lvl === "full" || m[tid] === "missing") m[tid] = lvl;
    }
  return m;
}

export type CellStatus = "covered" | "partial" | "gap" | "none";

export function matrix(c: CaseData, status: Record<string, TestStatus>) {
  const cats: Category[] = ["env", "func", "comm", "fault", "misuse"];
  return c.requirements.map((r) => ({
    req: r,
    cells: cats.map((cat) => {
      const tests = c.tests.filter((t) => t.cat === cat && t.reqs.includes(r.id));
      let s: CellStatus = "none";
      if (tests.length) {
        const st = tests.map((t) => status[t.id]);
        if (st.every((x) => x === "full")) s = "covered";
        else if (st.every((x) => x === "missing")) s = "gap";
        else s = "partial";
      }
      return { cat, tests, status: s };
    }),
  }));
}

export function summary(c: CaseData) {
  const status = testStatusMap(c);
  const sgA = sgAsilMap(c);
  const full = c.tests.filter((t) => status[t.id] === "full").length;
  const partial = c.tests.filter((t) => status[t.id] === "partial").length;
  const missing = c.tests
    .filter((t) => status[t.id] !== "full")
    .sort((a, b) => {
      const d = asilRank(testAsil(b, sgA)) - asilRank(testAsil(a, sgA));
      if (d) return d;
      return (status[a.id] === "missing" ? 0 : 1) - (status[b.id] === "missing" ? 0 : 1);
    });
  return { status, sgA, full, partial, missingCount: c.tests.length - full - partial, missing, total: c.tests.length };
}

export function traceCsv(c: CaseData) {
  const status = testStatusMap(c);
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = [["요구사항", "요구사항 내용", "시험 ID", "카테고리", "시험 항목", "시험 조건", "판정 기준", "안전 목표", "내 계획 반영"]];
  const catLabel: Record<string, string> = { env: "환경", func: "기능", comm: "통신", fault: "고장·Fail-safe", misuse: "오작동" };
  const stLabel = { full: "반영", partial: "부분", missing: "누락" } as const;
  for (const r of c.requirements)
    for (const t of c.tests.filter((t) => t.reqs.includes(r.id)))
      rows.push([r.id, r.text, t.id, catLabel[t.cat], t.title, t.condition, t.criteria, t.sgs.join(" "), stLabel[status[t.id]]]);
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\n");
}
