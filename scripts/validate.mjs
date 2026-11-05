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
  c.hazards.forEach((h) => sgs.has(h.sg) || bad.push(`${h.id}: ${h.sg} 없음`));
  c.plan.forEach((p) => Object.keys(p.covers).forEach((k) => tests.has(k) || bad.push(`${p.id}: ${k} 없음`)));
  c.safetyGoals.forEach((s) => c.tests.some((t) => t.sgs.includes(s.id)) || bad.push(`${s.id}: 확인 시험 없음`));
  c.requirements.forEach((r) => c.tests.some((t) => t.reqs.includes(r.id)) || bad.push(`${r.id}: 확인 시험 없음`));
  check(bad.length === 0, `[${c.id}] 참조 무결성${bad.length ? "\n      " + bad.join("\n      ") : ""}`);

  const counts = CATS.map((k) => c.tests.filter((t) => t.cat === k).length);
  check(counts.every((n) => n >= 3), `[${c.id}] 카테고리 균형 (각 3개 이상): ${CATS.map((k, i) => `${k}=${counts[i]}`).join(" ")}`);
}

const av = cases.find((c) => c.id === "av");
const covered = new Set(av.plan.flatMap((p) => Object.keys(p.covers)));
const sun = av.tests.filter((t) => t.cat === "env" && /직사광선/.test(t.title));
check(sun.length > 0 && sun.some((t) => !covered.has(t.id)), `[av] 야간 위주 계획에서 직사광선 조건 누락 탐지: ${sun.map((t) => t.id).join(", ")}`);

console.log(failed ? `\n${failed}개 실패` : "\n모두 통과");
process.exit(failed ? 1 : 0);
