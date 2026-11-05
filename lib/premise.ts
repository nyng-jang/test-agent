import type { Analysis, Premise } from "./types";

export type QState = "answer" | "assume" | "unknown";

/** 1단계의 보완 질문 상태를 분석 전제 목록으로 만든다. */
export function premisesOf(a: Analysis | null, answers: Record<string, string>, qState: Record<string, QState>): Premise[] {
  if (!a) return [];
  const out: Premise[] = (a.facts ?? []).map((f, i) => ({ id: `F${i + 1}`, kind: "fact", q: f.q, text: f.a }));
  for (const q of a.questions) {
    const st = qState[q.id] ?? "assume";
    const ans = answers[q.id]?.trim();
    if (st === "answer" && ans) out.push({ id: q.id, kind: "fact", q: q.q, text: ans });
    else if (st === "unknown") out.push({ id: q.id, kind: "unknown", q: q.q, text: `임시 가정: ${q.assumption}` });
    else out.push({ id: q.id, kind: "assume", q: q.q, text: q.assumption });
  }
  return out;
}
