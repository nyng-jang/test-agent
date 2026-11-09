"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Shell, { useStepState } from "@/components/Shell";
import { AppFrame, useScrollSpy } from "@/components/AppFrame";
import { BlockDiagram, HazardTable } from "@/components/sections";
import { AiProgress } from "@/components/AiProgress";
import { Term } from "@/components/Term";
import type { QState } from "@/lib/premise";
import { simulateAnalyze } from "@/lib/showcase";
import { analyzeLive } from "@/lib/ai";
import { demoById } from "@/lib/demo";
import { useFlow } from "@/lib/flow";
import { DEMO_CASES } from "@/lib/demo";
import type { Analysis, Block, Fact, Stage } from "@/lib/types";

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
  return <Shell step={1} wide><SystemStep /></Shell>;
}

function SystemStep() {
  const { mode, llm, flow, update, fillDemo, reset } = useFlow();
  const showcase = mode === "showcase";
  const { analysisOk } = useStepState();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const live = mode === "live" || showcase;
  const a = flow.analysis;
  const stale = !!a && flow.analyzedInput !== flow.systemInput;

  const analyze = async (withAnswers: boolean) => {
    setBusy(true); setErr("");
    try {
      const newFacts: Fact[] = withAnswers && a
        ? a.questions.filter((q) => (flow.qState[q.id] ?? "assume") === "answer" && flow.answers[q.id]?.trim()).map((q) => ({ q: q.q, a: flow.answers[q.id].trim() }))
        : [];
      const facts = [...(withAnswers ? a?.facts ?? [] : []), ...newFacts];
      if (showcase) {
        const sim = await simulateAnalyze(flow.systemInput, facts);
        if (!sim.ok) throw new Error(sim.error);
        update({ analysis: { ...sim.analysis, facts }, analyzedInput: flow.systemInput, answers: {}, qState: {}, demoId: sim.demoId, gap: null, gapKey: null });
        return;
      }
      if (!llm) throw new Error("API 키가 없습니다. 첫 화면에서 키를 다시 넣어 주세요.");
      const analysis = await analyzeLive(llm, flow.systemInput, facts);
      const demo = flow.demoId ? demoById(flow.demoId) : undefined;
      const keepDemo = demo && demo.systemInput.replace(/\s+/g, "") === flow.systemInput.replace(/\s+/g, "");
      update({ analysis: { ...analysis, facts }, analyzedInput: flow.systemInput, answers: {}, qState: {}, demoId: keepDemo ? flow.demoId : null, gap: null, gapKey: null });
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

  const done = !!a && !stale;
  const hasPremise = done && (a!.questions.length > 0 || (a!.facts?.length ?? 0) > 0);
  const secs = [
    { id: "sec-input", label: "시스템 설명", show: true },
    { id: "sec-summary", label: "분석 요약", show: done },
    { id: "sec-blocks", label: "구성 블록", n: a?.blocks.length, show: done },
    { id: "sec-req", label: "요구사항", n: a?.requirements.length, show: done },
    { id: "sec-premise", label: "분석 전제 확인", n: (a?.questions.length ?? 0) + (a?.facts?.length ?? 0), show: hasPremise },
    { id: "sec-hazard", label: "위험 분석", n: a?.hazards.length, show: done },
  ];
  const active = useScrollSpy(secs.filter((x) => x.show).map((x) => x.id));

  return (
    <AppFrame
      target={{ k: "1단계 · 시스템 입력", name: done ? a!.name : "새 시스템", meta: done ? <>구성 블록 {a!.blocks.length} · 요구사항 {a!.requirements.length} · 위험 {a!.hazards.length}</> : "아직 분석 전" }}
      items={secs.map((x) => ({ id: x.id, label: x.label, n: x.show ? x.n : undefined, href: `#${x.id}`, on: x.show && active === x.id, off: !x.show }))}
      links={done ? [{ label: "다음: 내 시험 계획 →", href: "/plan" }] : undefined}
      crumb={[done ? a!.name : "새 시스템", "1단계", "시스템 입력"]}
      title="시스템 입력"
      desc="시험할 시스템을 설명하면 AI가 구성 블록, 요구사항, 위험(HARA)을 정리합니다. 시험 조건을 정하는 데 빠진 정보가 있으면 질문으로 알려줍니다."
    >
      <section className="section" id="sec-input">
        <div className="presets">
          <span className="small muted">예시 불러오기</span>
          {DEMO_CASES.map((c) => (
            <button key={c.id} className="btn" aria-pressed={flow.demoId === c.id} onClick={() => fillDemo(c.id)}>{c.tab}</button>
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
          {!live && <div className="notice" style={{ marginTop: 10 }}>데모에서는 예시 설명만 볼 수 있습니다. 직접 입력하려면 첫 화면에서 내 API 키를 넣어 주세요.</div>}
          {live && (!a || stale) && (
            <div className="actions" style={{ marginBottom: 0 }}>
              {!busy && (
                <button className="btn primary lg" disabled={flow.systemInput.trim().length < 20} onClick={() => analyze(false)}>AI로 시스템 분석</button>
              )}
              {!busy && stale && <span className="small muted">설명이 바뀌어 다시 분석해야 합니다.</span>}
            </div>
          )}
          {busy && <div style={{ marginTop: 14 }}><AiProgress typical={showcase ? 8 : 35} steps={["시스템 설명 읽는 중", "구성 블록 정리 중", "요구사항 정리 중", "위험·안전 목표 분석 중", "빠진 정보 질문 만드는 중"]} /></div>}
          {err && <div className="notice err" style={{ marginTop: 10 }}>{err}</div>}
        </div>
      </section>

      {a && !stale && (
        <>
          <section className="section analysis-overview" id="sec-summary">
            <h2>{a.name}</h2>
            <p className="desc">{a.summary}</p>
          </section>

          <section className="section" id="sec-blocks">
            <h2>구성 블록 ({a.blocks.length})</h2>
            <p className="desc">시스템이 어떤 부품으로 이뤄지고 신호가 어떻게 흐르는지(센서 → 처리 → 액추에이터) 정리했습니다. AI가 설명을 바탕으로 만든 초안이라 실제와 다를 수 있습니다. {live ? "블록 이름을 눌러 고치고, ⠿를 끌어 다른 칸으로 옮기세요. 빠진 블록은 각 칸의 “+ 추가”로 넣습니다." : ""}</p>
            {live ? (
              <BlockDiagramEditor blocks={a.blocks} onChange={(blocks) => update({ analysis: { ...a, blocks } })} />
            ) : (
              <BlockDiagram data={{ blocks: a.blocks, tests: [] }} plain />
            )}
          </section>

          <section className="section" id="sec-req">
            <h2><Term k="requirement">요구사항</Term> ({a.requirements.length})</h2>
            <p className="desc">시스템이 제대로 동작하려면 만족해야 하는 기능·성능 조건입니다. 다음 단계에서 AI가 제안하는 시험의 근거가 됩니다. {live ? "AI가 정리한 내용이 맞는지 확인하고, 각 줄을 눌러 고치거나 추가하세요." : ""}</p>
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

          {(a.questions.length > 0 || (a.facts?.length ?? 0) > 0) && (
            <section className="section" id="sec-premise">
              <h2><Term k="premise">분석 전제 확인</Term></h2>
              <p className="desc">
                시스템 설명만으로는 알기 어려워 AI가 추가로 확인하고 싶은 정보입니다. 질문마다 <b>직접 답하기</b>, <b>AI 가정 사용</b>(AI가 임시로 정한 값으로 진행), <b>확인 필요</b>(팀에 물어봐야 함) 중 하나를 고르세요. 고른 상태는 이름표로 결과 화면까지 따라가서, 어떤 시험이 가정에 기대는지 알 수 있습니다.
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

          <section className="section" id="sec-hazard">
            <h2>위험 분석 (<Term k="hara">HARA</Term> 개념 적용)</h2>
            <p className="desc">어떤 상황에서 어떤 위험이 생길 수 있고, 이를 막으려면 어떤 안전 목표가 필요한지 정리했습니다. 위험마다 심각도(S)·노출(E)·제어 가능성(C)을 매겨 <Term k="asil">ASIL</Term>을 참고값으로 붙였습니다. ISO 26262의 위험 분석 개념을 적용해 본 것이며, 규격 준수나 인증을 뜻하지 않습니다.</p>
            <div className="card" style={{ padding: 0 }}><HazardTable a={a} /></div>
          </section>

          <div className="actions">
            <span className="spacer" />
            <button className="btn primary lg" disabled={!analysisOk || a.requirements.some((r) => !r.text.trim()) || a.blocks.some((b) => !b.label.trim())} onClick={() => router.push("/plan")}>
              다음: 내 시험 계획 →
            </button>
          </div>
        </>
      )}
    </AppFrame>
  );
}

const EDIT_STAGES: { id: Stage; label: string }[] = [
  { id: "sensor", label: "센서·입력" },
  { id: "process", label: "처리·통신" },
  { id: "actuator", label: "액추에이터·출력" },
  { id: "support", label: "공통 (전원·안전)" },
];

/**
 * 구조도 자체를 편집: 이름은 블록 안에서 바로 고치고,
 * 블록은 끌어서(드래그) 다른 칸이나 다른 블록 앞으로 옮긴다.
 * 터치·키보드는 ⠿ 를 눌러 집은 뒤 옮길 칸의 "여기로 옮기기"를 누른다.
 */
function BlockDiagramEditor({ blocks, onChange }: { blocks: Block[]; onChange: (b: Block[]) => void }) {
  const [held, setHeld] = useState<string | null>(null); // 집은 블록(클릭 이동)
  const [drag, setDrag] = useState<string | null>(null); // 끌고 있는 블록
  const [over, setOver] = useState<string | null>(null); // 놓일 칸 또는 블록
  const [fresh, setFresh] = useState<string | null>(null);
  const moving = drag ?? held;

  const set = (id: string, patch: Partial<Block>) => onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const remove = (id: string) => { onChange(blocks.filter((b) => b.id !== id)); if (held === id) setHeld(null); };
  const add = (stage: Stage) => {
    let n = blocks.length + 1;
    while (blocks.some((b) => b.id === `u${n}`)) n++;
    onChange([...blocks, { id: `u${n}`, label: "", stage }]);
    setFresh(`u${n}`);
  };
  /** id 블록을 stage 칸의 before 블록 앞(없으면 맨 뒤)으로 */
  const move = (id: string, stage: Stage, before?: string) => {
    const b = blocks.find((x) => x.id === id);
    if (!b || id === before) return;
    const rest = blocks.filter((x) => x.id !== id);
    const moved = { ...b, stage };
    let at = before ? rest.findIndex((x) => x.id === before) : -1;
    if (at < 0) { const last = rest.map((x) => x.stage).lastIndexOf(stage); at = last + 1 || rest.length; }
    onChange([...rest.slice(0, at), moved, ...rest.slice(at)]);
    setHeld(null); setDrag(null); setOver(null);
  };

  const dropProps = (stage: Stage, before?: string) => ({
    onDragOver: (e: React.DragEvent) => { if (!drag) return; e.preventDefault(); e.stopPropagation(); setOver(before ?? stage); },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (drag) move(drag, stage, before); },
  });

  const renderBlock = (b: Block) => (
    <div key={b.id} className={`block eblock ${held === b.id ? "held" : ""} ${drag === b.id ? "dragging" : ""} ${over === b.id && drag !== b.id ? "drop-before" : ""}`}
      draggable onDragStart={(e) => { setDrag(b.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", b.id); }}
      onDragEnd={() => { setDrag(null); setOver(null); }} {...dropProps(b.stage, b.id)}>
      <button type="button" className="grip" aria-label={held === b.id ? `${b.label || "블록"} 옮기기 취소` : `${b.label || "블록"} 옮기기`}
        aria-pressed={held === b.id} title="끌어서 옮기기 (누르면 집기)" onClick={() => setHeld(held === b.id ? null : b.id)}>⠿</button>
      <input type="text" value={b.label} placeholder="블록 이름" aria-label="블록 이름" autoFocus={fresh === b.id}
        onChange={(e) => set(b.id, { label: e.target.value })} draggable={false}
        onDragStart={(e) => e.preventDefault()} />
      <button type="button" className="x" aria-label={`${b.label || "블록"} 삭제`} title="삭제" onClick={() => remove(b.id)}>×</button>
    </div>
  );

  const target = (stage: Stage) => moving && blocks.find((b) => b.id === moving)?.stage !== stage;
  const tail = (stage: Stage) => (
    <>
      {held && target(stage) && (
        <button type="button" className="move-here" onClick={() => move(held, stage)}>여기로 옮기기</button>
      )}
      <button type="button" className="add-block" onClick={() => add(stage)}>+ 추가</button>
    </>
  );
  const colCls = (stage: Stage) => `${moving ? "drop-zone" : ""} ${over === stage ? "drop-over" : ""}`;
  const support = blocks.filter((b) => b.stage === "support");

  return (
    <div className="card block-edit" onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null); }}>
      <div className="flow">
        {EDIT_STAGES.slice(0, 3).map((st, i) => (
          <FlowEditCol key={st.id} last={i === 2} title={st.label} cls={colCls(st.id)} drop={dropProps(st.id)}>
            {blocks.filter((b) => b.stage === st.id).map(renderBlock)}
            {tail(st.id)}
          </FlowEditCol>
        ))}
      </div>
      <div className={`support ${colCls("support")}`} {...dropProps("support")}>
        <h4>공통 (전원·안전)</h4>
        {support.map(renderBlock)}
        {tail("support")}
      </div>
      <p className="small muted" style={{ margin: "10px 0 0" }}>
        {held ? `“${blocks.find((b) => b.id === held)?.label || "블록"}”을(를) 옮길 칸의 “여기로 옮기기”를 누르세요.` : "⠿ 를 잡고 끌어서 옮깁니다. 터치 화면에서는 ⠿ 를 눌러 집은 뒤 옮길 칸을 고르세요."}
      </p>
    </div>
  );
}

function FlowEditCol({ title, last, cls, drop, children }: { title: string; last: boolean; cls: string; drop: object; children: React.ReactNode }) {
  return (
    <>
      <div className={`stage ${cls}`} {...drop}>
        <h4>{title}</h4>
        {children}
      </div>
      {!last && <div className="arrow" aria-hidden>→</div>}
    </>
  );
}
