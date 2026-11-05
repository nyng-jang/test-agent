// 기획서 검증 기준 + 데이터 무결성 검사. 실행: npm run validate
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = new URL("../data/cases/", import.meta.url).pathname;
const cases = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
const CATS = ["env", "func", "comm", "fault", "misuse"];
let failed = 0;
const check = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`); if (!ok) failed++; };

for (const c of cases) {
  const reqs = new Set(c.requirements.map((r) => r.id));
  const sgs = new Set(c.safetyGoals.map((s) => s.id));
  const blocks = new Set(c.blocks.map((b) => b.id));
  const tests = new Set(c.tests.map((t) => t.id));
  const bad = [];
  for (const t of c.tests) {
    if (!CATS.includes(t.cat)) bad.push(`${t.id}: cat ${t.cat}`);
    if (!t.reqs.length) bad.push(`${t.id}: 근거 요구사항 없음`);
    t.reqs.forEach((r) => reqs.has(r) || bad.push(`${t.id}: ${r} 없음`));
    t.sgs.forEach((s) => sgs.has(s) || bad.push(`${t.id}: ${s} 없음`));
    t.blocks.forEach((b) => blocks.has(b) || bad.push(`${t.id}: block ${b} 없음`));
    if (!t.condition || !t.criteria) bad.push(`${t.id}: 조건/판정 비어 있음`);
  }
  const qids = new Set((c.questions ?? []).map((q) => q.id));
  c.tests.forEach((t) => (t.assumes ?? []).forEach((q) => qids.has(q) || bad.push(`${t.id}: 전제 ${q} 없음`)));
  c.hazards.forEach((h) => sgs.has(h.sg) || bad.push(`${h.id}: ${h.sg} 없음`));
  c.plan.forEach((p) => Object.keys(p.covers).forEach((k) => tests.has(k) || bad.push(`${p.id}: ${k} 없음`)));
  c.safetyGoals.forEach((s) => c.tests.some((t) => t.sgs.includes(s.id)) || bad.push(`${s.id}: 확인 시험 없음`));
  c.requirements.forEach((r) => c.tests.some((t) => t.reqs.includes(r.id)) || bad.push(`${r.id}: 확인 시험 없음`));
  check(bad.length === 0, `[${c.id}] 참조 무결성${bad.length ? "\n      " + bad.join("\n      ") : ""}`);

  const counts = CATS.map((k) => c.tests.filter((t) => t.cat === k).length);
  check(counts.every((n) => n >= 3), `[${c.id}] 카테고리 균형 (각 3개 이상): ${CATS.map((k, i) => `${k}=${counts[i]}`).join(" ")}`);
}

// ASIL 합산식이 S/E/C 전 조합에서 단조(어느 등급이 올라가도 ASIL이 내려가지 않음)인지 확인
const asil = (S, E, C) => (S && E && C ? ["QM", "QM", "QM", "QM", "QM", "QM", "QM", "A", "B", "C", "D"][S + E + C] : "QM");
const rank = (a) => ["QM", "A", "B", "C", "D"].indexOf(a);
let mono = true;
for (let S = 0; S <= 3; S++) for (let E = 0; E <= 4; E++) for (let C = 0; C <= 3; C++) {
  if (S < 3 && rank(asil(S + 1, E, C)) < rank(asil(S, E, C))) mono = false;
  if (E < 4 && rank(asil(S, E + 1, C)) < rank(asil(S, E, C))) mono = false;
  if (C < 3 && rank(asil(S, E, C + 1)) < rank(asil(S, E, C))) mono = false;
}
check(mono && asil(3, 4, 3) === "D" && asil(1, 1, 1) === "QM", "ASIL 합산식 단조성·경계값 (S3E4C3=D, S1E1C1=QM)");

const av = cases.find((c) => c.id === "av");
const covered = new Set(av.plan.flatMap((p) => Object.keys(p.covers)));
const sun = av.tests.filter((t) => t.cat === "env" && /직사광선/.test(t.title));
check(sun.length > 0 && sun.some((t) => !covered.has(t.id)), `[av] 야간 위주 계획에서 직사광선 조건 누락 탐지: ${sun.map((t) => t.id).join(", ")}`);

console.log(failed ? `\n${failed}개 실패` : "\n모두 통과");
process.exit(failed ? 1 : 0);
