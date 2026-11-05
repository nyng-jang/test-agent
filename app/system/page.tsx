"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Shell, { StepHead, useStepState } from "@/components/Shell";
import { BlockDiagram, HazardTable } from "@/components/sections";
import { AiProgress } from "@/components/AiProgress";
import type { QState } from "@/lib/premise";
import { useFlow } from "@/lib/flow";
import { DEMO_CASES } from "@/lib/demo";
import type { Analysis, Fact } from "@/lib/types";

const GUIDE = [
  { k: "시스템 개요", d: "어떤 기능을 하는 시스템인가", ex: "운영자 버튼으로 차량 구동 전원을 무선 차단하는 비상정지 장치" },
  { k: "입력부", d: "센서, 스위치, 외부 입력 신호", ex: "이중 접점 비상 버튼, 송신기 배터리 전압 감시" },
  { k: "제어부", d: "MCU, 제어 로직, 통신 처리", ex: "송·수신기 MCU, 100ms 하트비트, 500ms 미수신 시 정지" },
  { k: "출력부", d: "모터, 릴레이, 액추에이터, 표시", ex: "모터 전원 릴레이, 상태 LED·부저" },
  { k: "전원·통신", d: "전압, 전원 변동, CAN·무선 등", ex: "송신기 3.7V 리튬, 수신기 12V, 2.4GHz RF" },
  { k: "사용 환경", d: "온도, 진동, 습도, 외부 광원, 주변 기기", ex: "실외 대회장 주간, 최대 50m, 타 팀 무선 기기 다수" },
];
const TEMPLATE = GUIDE.map((g) => `[${g.k}] `).join("\n");

export default function SystemPage() {
  return <Shell step={1}><SystemStep /></Shell>;
}

function SystemStep() {
  const { mode, flow, update, loadDemo, reset, setRemaining } = useFlow();
  const { analysisOk } = useStepState();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const live = mode === "live";
  const a = flow.analysis;
  const stale = !!a && flow.analyzedInput !== flow.systemInput;

  const analyze = async (withAnswers: boolean) => {
    setBusy(true); setErr("");
    try {
      const newFacts: Fact[] = withAnswers && a
        ? a.questions.filter((q) => (flow.qState[q.id] ?? "assume") === "answer" && flow.answers[q.id]?.trim()).map((q) => ({ q: q.q, a: flow.answers[q.id].trim() }))
        : [];
      const facts = [...(withAnswers ? a?.facts ?? [] : []), ...newFacts];
      const answers = facts;
      const r = await fetch("/api/analyze", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ systemInput: flow.systemInput, answers }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "분석하지 못했습니다.");
      if (typeof j.remaining === "number") setRemaining(j.remaining);
      update({ analysis: { ...j.analysis, facts }, analyzedInput: flow.systemInput, answers: {}, qState: {}, demoId: null, gap: null, gapKey: null });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const setReqs = (requirements: Analysis["requirements"]) => a && update({ analysis: { ...a, requirements } });
  const qs = (id: string): QState => flow.qState[id] ?? "assume";
  const setQs = (id: string, v: QState) => update({ qState: { ...flow.qState, [id]: v } });
  const answered = a?.questions.some((q) => qs(q.id) === "answer" && flow.answers[q.id]?.trim());

  return (
    <>
      <StepHead n={1} title="시스템 입력"
        desc="시험할 시스템을 설명하면 AI가 구성 블록, 요구사항, 위험(HARA)을 정리합니다. 시험 조건을 정하는 데 빠진 정보가 있으면 질문으로 알려줍니다." />

      <section className="section">
        <div className="presets">
          <span className="small muted">예시 불러오기</span>
          {DEMO_CASES.map((c) => (
            <button key={c.id} className="btn" aria-pressed={flow.demoId === c.id} onClick={() => loadDemo(c.id)}>{c.tab}</button>
          ))}
          {live && <button className="btn" aria-pressed={!flow.demoId && !flow.systemInput} onClick={reset}>새로 입력</button>}
        </div>
        <div className="card system-input-card">
          <label className="f" htmlFor="sys" style={{ marginTop: 0 }}>시스템 설명</label>
          <textarea id="sys" value={flow.systemInput} readOnly={!live} maxLength={3000} style={{ minHeight: 150 }}
            onChange={(e) => update({ systemInput: e.target.value })}
            placeholder="예: 전동식 조향장치(EPS). 토크 센서와 조향각 센서 신호로 ECU가 BLDC 모터 보조 토크를 만든다. CAN으로 차속을 받는다. 12V 전원…" />
          <div className="small muted" style={{ marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ flex: 1 }}>아래 6가지를 담을수록 빠진 정보 질문이 줄고 결과가 정확해집니다.</span>
            <span>{flow.systemInput.length}/3000</span>
          </div>
          <details className="guide" open={live && !flow.systemInput}>
            <summary>작성 가이드 (6가지 항목)</summary>
            <dl className="guide-list">
              {GUIDE.map((g) => (
                <div key={g.k}><dt>{g.k}</dt><dd>{g.d}<div className="small muted">예: {g.ex}</div></dd></div>
              ))}
            </dl>
            {live && (
              <button type="button" className="btn" onClick={() => update({ systemInput: flow.systemInput ? `${flow.systemInput}\n\n${TEMPLATE}` : TEMPLATE })}>
                항목 틀을 입력칸에 넣기
              </button>
            )}
          </details>
          {!live && <div className="notice" style={{ marginTop: 10 }}>데모에서는 예시 설명만 볼 수 있습니다. 직접 입력하려면 로그인하세요.</div>}
          {live && (!a || stale) && (
            <div className="actions" style={{ marginBottom: 0 }}>
              {!busy && (
                <button className="btn primary lg" disabled={flow.systemInput.trim().length < 20} onClick={() => analyze(false)}>AI로 시스템 분석</button>
              )}
              {!busy && stale && <span className="small muted">설명이 바뀌어 다시 분석해야 합니다.</span>}
            </div>
          )}
          {busy && <div style={{ marginTop: 14 }}><AiProgress typical={40} steps={["시스템 설명 읽는 중", "구성 블록 정리 중", "요구사항 정리 중", "위험·안전 목표 분석 중", "빠진 정보 질문 만드는 중"]} /></div>}
          {err && <div className="notice err" style={{ marginTop: 10 }}>{err}</div>}
        </div>
      </section>

      {a && !stale && (
        <>
          <section className="section analysis-overview">\n            <h2>{a.name}</h2>
            <p className="desc">{a.summary}</p>
          </section>

          {(a.questions.length > 0 || (a.facts?.length ?? 0) > 0) && (
            <section className="section">
              <h2>분석 전제 확인</h2>
              <p className="desc">
                설명만으로는 시험 조건을 정하기 어려운 정보입니다. 질문마다 <b>직접 답하기</b>, <b>AI 가정 사용</b>, <b>확인 필요</b>(팀에 물어봐야 함) 중 하나를 고르세요. 고른 상태는 결과 화면까지 표시되어, 어떤 시험이 가정에 기대는지 알 수 있습니다.
              </p>
              <div className="card">
                {(a.facts ?? []).map((f, i) => (
                  <div key={`f${i}`} className="q">
                    <div className="q-top"><span className="ptag fact">사용자 확인</span><span className="qq">{f.q}</span></div>
                    <div style={{ marginTop: 4 }}>{f.a}</div>
                  </div>
                ))}
                {a.questions.map((q) => {
                  const st = qs(q.id);
                  const kind = st === "answer" && flow.answers[q.id]?.trim() ? "fact" : st === "unknown" ? "unknown" : "assume";
                  return (
                    <div key={q.id} className="q">
                      <div className="q-top">
                        <span className={`ptag ${kind}`}>{kind === "fact" ? "사용자 확인" : kind === "unknown" ? "확인 필요" : "AI 가정"}</span>
                        <span className="qq">{q.q}</span>
                      </div>
                      <div className="small muted">{q.why}</div>
                      <div className="seg" role="radiogroup" aria-label={`${q.q} 처리 방법`} style={{ marginTop: 8 }}>
                        {([["answer", "직접 답하기"], ["assume", "AI 가정 사용"], ["unknown", "확인 필요"]] as [QState, string][]).map(([v, l]) => (
                          <button key={v} type="button" role="radio" aria-checked={st === v} className="btn" aria-pressed={st === v} disabled={!live && v !== "assume"} onClick={() => setQs(q.id, v)}>{l}</button>
                        ))}
                      </div>
                      {st === "answer" ? (
                        <input type="text" style={{ marginTop: 8 }} value={flow.answers[q.id] ?? ""} placeholder="답을 적어 주세요" aria-label={`${q.q} 답`}
                          onChange={(e) => update({ answers: { ...flow.answers, [q.id]: e.target.value } })} />
                      ) : (
                        <div className="assume-box small">
                          <span className="muted">{st === "unknown" ? "임시로 쓰는 가정:" : "AI가 쓰는 가정:"}</span> {q.assumption}
                        </div>
                      )}
                    </div>
                  );
                })}
                {!live && <div className="notice" style={{ marginTop: 10 }}>데모에서는 AI 가정으로 진행합니다.</div>}
                {live && (
                  <div className="actions" style={{ marginBottom: 0 }}>
                    <button className="btn" disabled={busy || !answered} onClick={() => analyze(true)}>답변 반영해 다시 분석</button>
                    <span className="small muted">다시 분석하면 답변이 요구사항·위험에도 반영됩니다. 다시 분석하지 않아도 답변은 누락 탐지에 전달됩니다. 아래 요구사항 수정 내용은 다시 분석하면 새 결과로 바뀝니다.</span>
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="section">
            <h2>요구사항 ({a.requirements.length})</h2>
            <p className="desc">시험 항목의 근거가 됩니다. {live ? "AI가 정리한 내용이 맞는지 확인하고 고치거나 추가하세요." : ""}</p>
            <div className="card">
              {a.requirements.map((r, i) => (
                <div key={i} className="req-row">
                  <span className="mono muted">{r.id}</span>
                  {live ? (
                    <input type="text" value={r.text} onChange={(e) => setReqs(a.requirements.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
                  ) : (
                    <span>{r.text}</span>
                  )}
                  {live ? (
                    <button className="icon-btn" aria-label={`${r.id} 삭제`} onClick={() => setReqs(a.requirements.filter((_, j) => j !== i))}>×</button>
                  ) : <span />}
                </div>
              ))}
              {live && (
                <button className="btn" style={{ marginTop: 6 }} onClick={() => {
                  const max = a.requirements.reduce((m, r) => Math.max(m, Number(r.id.replace(/\D/g, "")) || 0), 0);
                  setReqs([...a.requirements, { id: `REQ-${String(max + 1).padStart(2, "0")}`, text: "" }]);
                }}>+ 요구사항 추가</button>
              )}
            </div>
          </section>

          <section className="section">
            <h2>구성 블록</h2>
            <p className="desc">센서 → 처리 → 액추에이터 흐름으로 정리한 시스템 구조입니다.</p>
            <BlockDiagram data={{ blocks: a.blocks, tests: [] }} plain />
          </section>

          <section className="section">
            <h2>위험 분석 (HARA 개념 적용)</h2>
            <p className="desc">위험마다 심각도(S)·노출(E)·제어 가능성(C)을 매겨 ASIL을 정하고 안전 목표로 이었습니다. 규격 준수가 아니라 개념을 적용해 본 것입니다.</p>
            <div className="card" style={{ padding: 0 }}><HazardTable a={a} /></div>
          </section>

          <div className="actions">
            <span className="spacer" />
            <button className="btn primary lg" disabled={!analysisOk || a.requirements.some((r) => !r.text.trim())} onClick={() => router.push("/plan")}>
              다음: 내 시험 계획 →
            </button>
          </div>
        </>
      )}
    </>
  );
}
