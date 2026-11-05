"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Shell, { StepHead, useStepState } from "@/components/Shell";
import { BlockDiagram, HazardTable } from "@/components/sections";
import { useFlow } from "@/lib/flow";
import { DEMO_CASES } from "@/lib/demo";
import type { Analysis } from "@/lib/types";

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
      const answers = withAnswers && a
        ? a.questions.filter((q) => flow.answers[q.id]?.trim()).map((q) => ({ q: q.q, a: flow.answers[q.id] }))
        : [];
      const r = await fetch("/api/analyze", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ systemInput: flow.systemInput, answers }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "분석하지 못했습니다.");
      if (typeof j.remaining === "number") setRemaining(j.remaining);
      update({ analysis: j.analysis, analyzedInput: flow.systemInput, answers: {}, demoId: null, gap: null, gapKey: null });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const setReqs = (requirements: Analysis["requirements"]) => a && update({ analysis: { ...a, requirements } });
  const answered = a?.questions.some((q) => flow.answers[q.id]?.trim());

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
        <div className="card">
          <label className="f" htmlFor="sys" style={{ marginTop: 0 }}>시스템 설명</label>
          <textarea id="sys" value={flow.systemInput} readOnly={!live} maxLength={3000} style={{ minHeight: 150 }}
            onChange={(e) => update({ systemInput: e.target.value })}
            placeholder="예: 전동식 조향장치(EPS). 토크 센서와 조향각 센서 신호로 ECU가 BLDC 모터 보조 토크를 만든다. CAN으로 차속을 받는다. 12V 전원…" />
          <div className="small muted" style={{ marginTop: 4 }}>
            센서, 처리부, 액추에이터, 통신, 전원, 사용 환경을 적을수록 결과가 좋아집니다. {flow.systemInput.length}/3000
          </div>
          {!live && <div className="notice" style={{ marginTop: 10 }}>데모에서는 예시 설명만 볼 수 있습니다. 직접 입력하려면 로그인하세요.</div>}
          {live && (!a || stale) && (
            <div className="actions" style={{ marginBottom: 0 }}>
              <button className="btn primary lg" disabled={busy || flow.systemInput.trim().length < 20} onClick={() => analyze(false)}>
                {busy ? <span className="loading">분석 중… (30초~1분)</span> : "AI로 시스템 분석"}
              </button>
              {stale && <span className="small muted">설명이 바뀌어 다시 분석해야 합니다.</span>}
            </div>
          )}
          {err && <div className="notice err" style={{ marginTop: 10 }}>{err}</div>}
        </div>
      </section>

      {a && !stale && (
        <>
          <section className="section">
            <h2>{a.name}</h2>
            <p className="desc">{a.summary}</p>
          </section>

          {a.questions.length > 0 && (
            <section className="section">
              <h2>보완이 필요한 정보</h2>
              <p className="desc">
                설명만으로는 시험 조건을 정하기 어려운 부분입니다. {live ? "답을 적고 다시 분석하거나, 비워 두면 오른쪽 가정대로 진행합니다." : "데모에서는 가정값으로 진행합니다."}
              </p>
              <div className="card">
                {a.questions.map((q) => (
                  <div key={q.id} className="q">
                    <div className="qq">{q.q}</div>
                    <div className="small muted">{q.why}</div>
                    <div className="grid2" style={{ marginTop: 6, gap: 8 }}>
                      <input type="text" value={flow.answers[q.id] ?? ""} readOnly={!live} placeholder={live ? "답 (선택)" : "데모: 가정값 사용"}
                        onChange={(e) => update({ answers: { ...flow.answers, [q.id]: e.target.value } })} />
                      <div className="small" style={{ alignSelf: "center" }}><span className="muted">가정:</span> {q.assumption}</div>
                    </div>
                  </div>
                ))}
                {live && (
                  <div className="actions" style={{ marginBottom: 0 }}>
                    <button className="btn" disabled={busy || !answered} onClick={() => analyze(true)}>
                      {busy ? <span className="loading">다시 분석 중…</span> : "답변 반영해 다시 분석"}
                    </button>
                    <span className="small muted">다시 분석하면 아래 요구사항 수정 내용은 새 결과로 바뀝니다.</span>
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
