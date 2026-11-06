"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Asil as AsilT, CaseData, Category, Premise, TestItem } from "@/lib/types";
import { CATEGORIES, PREMISE_LABEL, STAGES } from "@/lib/types";
import {
  asilRank, hazardAsil, matrix, PRIORITY_LABEL, summary, testAsil, traceCsv,
  type CellStatus, type Priority, type TestStatus,
} from "@/lib/analysis";

export type S = ReturnType<typeof summary>;
export const ST_LABEL: Record<TestStatus, string> = { full: "계획에 있음", partial: "부분 반영", missing: "누락" };
const catLabel = (c: Category) => CATEGORIES.find((x) => x.id === c)?.label ?? c;

/* ---------- 상세 패널 열기 ---------- */
const DetailCtx = createContext<(id: string) => void>(() => {});
export const DetailProvider = DetailCtx.Provider;
const useOpen = () => useContext(DetailCtx);

/* ---------- 배지: 계획 상태 / 보완 우선순위 / 안전 중요도는 서로 다른 정보라 모양을 다르게 ---------- */
export function StatusPill({ st }: { st: TestStatus }) {
  return <span className={`pill ${st}`}>{ST_LABEL[st]}</span>;
}
export function PriorityBadge({ p }: { p: Priority | null }) {
  if (!p) return null;
  return <span className={`prio prio-${p}`} title="보완 우선순위: 계획 상태와 안전 중요도를 함께 본 판단">우선순위 {PRIORITY_LABEL[p]}</span>;
}
export function Importance({ a }: { a: AsilT | string }) {
  return (
    <span className="imp" title="안전 중요도(참고): 연결된 안전 목표의 ASIL. HARA 개념을 적용해 본 값이며 공식 산정이 아닙니다.">
      안전 중요도 <b className={`asil-${a}`}>{a === "QM" ? "QM" : `ASIL ${a}`}</b>
    </span>
  );
}
/** 위험·안전 목표 표에서 쓰는 작은 ASIL 표시 */
export function Asil({ a }: { a: string }) {
  return <span className={`badge asil-${a}`}>{a === "QM" ? "QM" : `ASIL ${a}`}</span>;
}
function AssumeTag({ t, premises }: { t: TestItem; premises?: Premise[] }) {
  const ps = (t.assumes ?? []).map((id) => premises?.find((p) => p.id === id)).filter((p): p is Premise => !!p && p.kind !== "fact");
  if (!ps.length) return null;
  const unknown = ps.some((p) => p.kind === "unknown");
  return <span className={`ptag ${unknown ? "unknown" : "assume"}`}>{unknown ? "확인 필요 전제" : "AI 가정 기반"}</span>;
}

function TestButton({ t, className, children }: { t: TestItem; className?: string; children: React.ReactNode }) {
  const open = useOpen();
  return (
    <button type="button" className={`linkish ${className ?? ""}`} onClick={() => open(t.id)} aria-label={`${t.id} ${t.title} 상세 보기`}>
      {children}
    </button>
  );
}

/* ---------- 요약 숫자 ---------- */
export function Overview({ s }: { s: S }) {
  const coveragePct = Math.round(((s.full + s.partial * 0.5) / Math.max(1, s.total)) * 100);
  return (
    <div className="stats result-kpis">
      <div className="stat total"><div className="v">{s.total}</div><div className="l">제안 시험 항목</div></div>
      <div className="stat warn"><div className="v">{s.partial}</div><div className="l">부분 반영</div></div>
      <div className="stat gap"><div className="v">{s.missingCount}</div><div className="l">누락</div></div>
      <div className="stat coverage"><div className="v">{coveragePct}%</div><div className="l">시험 계획 커버리지</div><div className="hint">완전 반영 {s.full}개 · 부분 반영 {s.partial}개</div></div>
    </div>
  );
}

/* ---------- 분석 전제 ---------- */
export function PremiseSummary({ premises, tests }: { premises: Premise[]; tests: TestItem[] }) {
  if (!premises.length) return null;
  const count = (k: Premise["kind"]) => premises.filter((p) => p.kind === k).length;
  const dependent = tests.filter((t) => (t.assumes ?? []).some((id) => premises.find((p) => p.id === id && p.kind !== "fact"))).length;
  return (
    <details className="card premise">
      <summary>
        <b>분석 전제</b>
        <span className="ptag fact">사용자 확인 {count("fact")}</span>
        <span className="ptag assume">AI 가정 {count("assume")}</span>
        <span className="ptag unknown">확인 필요 {count("unknown")}</span>
        {dependent > 0 && <span className="small muted">· 가정에 기대는 시험 {dependent}개</span>}
      </summary>
      <ul className="premise-list">
        {premises.map((p) => (
          <li key={p.id}>
            <span className={`ptag ${p.kind}`}>{PREMISE_LABEL[p.kind]}</span>
            <div><div className="small muted">{p.q}</div><div>{p.text}</div></div>
          </li>
        ))}
      </ul>
      <p className="small muted" style={{ margin: "8px 0 0" }}>AI 가정이나 확인 필요 전제에 기대는 시험은 목록에 표시됩니다. 1단계에서 답을 바꾸면 결과를 다시 만들 수 있습니다.</p>
    </details>
  );
}

/* ---------- 보완 항목 목록 (결과 첫 화면) ---------- */
export function GapList({ data, s }: { data: CaseData; s: S }) {
  const [prio, setPrio] = useState<Priority | "all">("all");
  const [cat, setCat] = useState<Category | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(() => s.missing.find((t) => s.prio[t.id] === "high")?.id ?? s.missing[0]?.id ?? null);
  const open = useOpen();
  if (!s.missing.length) return <div className="notice">계획에서 빠진 항목이 없습니다.</div>;
  const list = s.missing.filter((t) => (prio === "all" || s.prio[t.id] === prio) && (cat === "all" || t.cat === cat));
  const reqText = (id: string) => data.requirements.find((r) => r.id === id)?.text ?? "";
  return (
    <section className="section">
      <div className="toolbar gaplist-toolbar">
        <div>
          <h2 style={{ margin: 0, fontSize: 19 }}>우선 확인할 항목</h2>
          <p className="small muted" style={{ margin: "3px 0 0" }}>누락되었거나 일부만 반영된 시험을 선택해 조건과 근거를 확인하세요.</p>
        </div>
        <div className="seg" role="group" aria-label="우선순위 필터">
          <button className="btn" aria-pressed={prio === "all"} onClick={() => setPrio("all")}>전체 {s.missing.length}</button>
          {(["high", "mid", "low"] as Priority[]).map((p) =>
            s.byPrio[p] ? <button key={p} className="btn" aria-pressed={prio === p} onClick={() => setPrio(p)}>{PRIORITY_LABEL[p]} {s.byPrio[p]}</button> : null,
          )}
        </div>
        <label className="small">
          <span className="sr-only">카테고리</span>
          <select value={cat} onChange={(e) => setCat(e.target.value as Category | "all")}>
            <option value="all">모든 카테고리</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
      </div>
      <ul className="gaplist">
        {list.map((t) => {
          const isOpen = expanded === t.id;
          return (
            <li key={t.id} className={`gapcard ${s.status[t.id]} ${isOpen ? "expanded" : "collapsed"}`}>
              <button type="button" className="gapcard-btn linkish" onClick={() => setExpanded(isOpen ? null : t.id)} aria-expanded={isOpen} aria-controls={`gap-detail-${t.id}`}>
                <div className="gapcard-top">
                  <PriorityBadge p={s.prio[t.id]} />
                  <StatusPill st={s.status[t.id]} />
                  <AssumeTag t={t} premises={data.premises} />
                  <span className="spacer" />
                  <span className="small muted">{catLabel(t.cat)} · {t.id}</span>
                </div>
                <div className="gapcard-title">{t.title}</div>
                <div className="gapcard-foot">
                  <Importance a={testAsil(t, s.sgA)} />
                  <span className="more">{isOpen ? "상세 접기 ↑" : "시험 조건·근거 보기 →"}</span>
                </div>
              </button>
              {isOpen && (
                <div className="gapcard-expanded" id={`gap-detail-${t.id}`}>
                  <dl className="kv">
                    <dt>시험 조건</dt><dd>{t.condition}</dd>
                    <dt>판정 기준</dt><dd>{t.criteria}</dd>
                    {t.reqs.length > 0 && <><dt>관련 요구사항</dt><dd>{t.reqs.map((r) => <div key={r}><span className="mono muted">{r}</span> {reqText(r)}</div>)}</dd></>}
                    {t.sgs.length > 0 && <><dt>안전 목표</dt><dd>{t.sgs.join(" · ")}</dd></>}
                  </dl>
                  {t.why && <p className="why">보완이 필요한 이유: {t.why}</p>}
                  <button type="button" className="btn detail-link" onClick={() => open(t.id)}>추적 정보와 상세 근거 열기</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
/* ---------- 계획 비교 ---------- */
export function GapCompare({ data, s }: { data: CaseData; s: S }) {
  const [onlyGap, setOnlyGap] = useState(false);
  const open = useOpen();
  const title = (id: string) => data.tests.find((t) => t.id === id)?.title ?? id;
  return (
    <section className="section">
      <h2>내 계획 vs 에이전트 제안</h2>
      <p className="desc">왼쪽은 내가 짠 계획, 오른쪽은 에이전트 제안입니다. 빨간 테두리는 누락, 노란 점선은 일부만 다룬 항목입니다.</p>
      <div className="compare">
        <div className="card">
          <h3>내 시험 계획 ({data.plan.length}개)</h3>
          {data.planNote && <p className="small muted" style={{ marginTop: -4 }}>{data.planNote}</p>}
          {data.plan.map((p) => {
            const entries = Object.entries(p.covers);
            return (
              <div key={p.id} className="plan-item">
                {p.originalId && <div className="small muted">원본 ID: {p.originalId} · 내부 참조: {p.temporaryId ?? p.id}</div>}
                <div className="t">{p.text}</div>
                {p.review?.length ? <div className="small warn-t" style={{ marginTop: 4 }}>확인 필요: {p.review.join(" · ")}</div> : null}
                <div className="small" style={{ marginTop: 4 }}>
                  {entries.length === 0 ? (
                    <span className="muted">대응되는 제안 항목 없음</span>
                  ) : (
                    entries.map(([tid, lvl]) => (
                      <button key={tid} type="button" className={`chip ${lvl}`} onClick={() => open(tid)} title={title(tid)}>
                        {tid} {lvl === "partial" ? "· 부분" : ""}
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="card">
          <div className="toolbar">
            <h3 style={{ margin: 0, flex: 1 }}>에이전트 제안 ({data.tests.length}개)</h3>
            <button className="btn" aria-pressed={onlyGap} onClick={() => setOnlyGap((v) => !v)}>누락·부분만</button>
          </div>
          {CATEGORIES.map((c) => {
            const items = data.tests.filter((t) => t.cat === c.id && (!onlyGap || s.status[t.id] !== "full"));
            if (!items.length) return null;
            return (
              <div key={c.id} className="agent-cat">
                <h4>{c.label}</h4>
                {items.map((t) => (
                  <TestButton key={t.id} t={t} className={`agent-item ${s.status[t.id]}`}>
                    <span className="id">{t.id}</span>
                    <span className="grow">{t.title}</span>
                    <StatusPill st={s.status[t.id]} />
                  </TestButton>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- 커버리지 매트릭스 ---------- */
export function CoverageMatrix({ data, s }: { data: CaseData; s: S }) {
  const rows = matrix(data, s.status);
  const [sel, setSel] = useState<{ r: string; c: Category } | null>(null);
  const label: Record<CellStatus, string> = { covered: "반영", partial: "부분", gap: "누락", none: "–" };
  const selCell = sel ? rows.find((r) => r.req.id === sel.r)?.cells.find((c) => c.cat === sel.c) : null;
  return (
    <section className="section">
      <h2>커버리지 매트릭스</h2>
      <p className="desc">행은 요구사항, 열은 시험 카테고리입니다. 숫자는 제안 시험 수, 색은 내 계획이 그 칸을 얼마나 다뤘는지입니다. 칸을 누르면 해당 시험이 아래에 나옵니다.</p>
      <div className="card matrix-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th className="req" scope="col">요구사항</th>
              {CATEGORIES.map((c) => <th key={c.id} scope="col">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.req.id}>
                <th scope="row" className="req"><b>{r.req.id}</b>{r.req.text}</th>
                {r.cells.map((cell) => (
                  <td key={cell.cat} className={`cell ${cell.status} ${sel?.r === r.req.id && sel?.c === cell.cat ? "sel" : ""}`}>
                    {cell.tests.length ? (
                      <button type="button" className="cell-btn" onClick={() => setSel({ r: r.req.id, c: cell.cat })}
                        aria-label={`${r.req.id} ${catLabel(cell.cat)}: ${label[cell.status]} ${cell.tests.length}개`}>
                        {label[cell.status]} {cell.tests.length}
                      </button>
                    ) : label.none}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="legend">
          <span className="covered">모두 계획에 있음</span>
          <span className="partial">일부만 있음</span>
          <span className="gap">전부 누락</span>
          <span className="none">해당 시험 없음</span>
        </div>
        {selCell && (
          <div style={{ marginTop: 12 }}>
            <div className="small muted" style={{ marginBottom: 6 }}>{sel!.r} × {catLabel(sel!.c)}</div>
            {selCell.tests.map((t) => (
              <TestButton key={t.id} t={t} className={`agent-item ${s.status[t.id]}`}>
                <span className="id">{t.id}</span><span className="grow">{t.title}</span><StatusPill st={s.status[t.id]} />
              </TestButton>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- 블록도 ---------- */
export function BlockDiagram({ data, status, plain }: { data: Pick<CaseData, "blocks" | "tests">; status?: Record<string, TestStatus>; plain?: boolean }) {
  const [sel, setSel] = useState<string | null>(null);
  const testsFor = (bid: string) => data.tests.filter((t) => t.blocks.includes(bid));
  const renderBlock = (b: CaseData["blocks"][number]) => {
    if (plain || !status) return <div key={b.id} className="block" style={{ cursor: "default" }}><div style={{ fontWeight: 600, fontSize: 14 }}>{b.label}</div></div>;
    const ts = testsFor(b.id);
    const g = ts.filter((t) => status[t.id] !== "full").length;
    return (
      <button key={b.id} type="button" className={`block ${sel === b.id ? "sel" : ""} ${g ? "has-gap" : ""}`} aria-pressed={sel === b.id} onClick={() => setSel(sel === b.id ? null : b.id)}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{b.label}</div>
        <div className="n">시험 {ts.length} · {g ? <b className="g">보완 {g}</b> : "보완 0"}</div>
      </button>
    );
  };
  const selBlock = status ? data.blocks.find((b) => b.id === sel) : undefined;
  const support = data.blocks.filter((b) => b.stage === "support");
  return (
    <section className="section">
      {!plain && <><h2>시스템 블록도</h2>
      <p className="desc">센서 → 처리 → 액추에이터 흐름에서 각 시험이 어디에 걸리는지 보여줍니다. 왼쪽 빨간 띠는 보완이 필요한 블록입니다. 블록을 누르면 걸린 시험이 나옵니다.</p></>}
      <div className="card">
        <div className="flow">
          {STAGES.map((st, i) => (
            <FlowCol key={st.id} last={i === STAGES.length - 1} title={st.label}>
              {data.blocks.filter((b) => b.stage === st.id).map(renderBlock)}
            </FlowCol>
          ))}
        </div>
        {support.length > 0 && (
          <div className="support">
            <h4>공통 (전원·안전)</h4>
            {support.map(renderBlock)}
          </div>
        )}
        {selBlock && (
          <div style={{ marginTop: 12 }}>
            <div className="small muted" style={{ marginBottom: 6 }}>{selBlock.label}에 걸린 시험</div>
            {testsFor(selBlock.id).map((t) => (
              <TestButton key={t.id} t={t} className={`agent-item ${status![t.id]}`}>
                <span className="id">{t.id}</span><span className="grow">{t.title}</span><StatusPill st={status![t.id]} />
              </TestButton>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function FlowCol({ title, last, children }: { title: string; last: boolean; children: React.ReactNode }) {
  return (
    <>
      <div className="stage">
        <h4>{title}</h4>
        {children}
      </div>
      {!last && <div className="arrow" aria-hidden>→</div>}
    </>
  );
}

/* ---------- 기능안전 추적 ---------- */
export function SafetyTrace({ data, s }: { data: CaseData; s: S }) {
  const open = useOpen();
  return (
    <section className="section">
      <h2>기능안전 추적: 위험 → 안전 목표 → 시험</h2>
      <p className="desc">
        ISO 26262의 HARA 개념을 적용해 봤습니다(규격 준수가 아니라 개념 적용). 위험마다 심각도(S)·노출(E)·제어 가능성(C)을 매겨 안전 중요도(ASIL)를 정하고, 안전 목표와 그것을 확인하는 시험으로 이었습니다.
      </p>
      <div className="card">
        <div className="trace-head"><span>위험</span><span /><span>안전 목표</span><span /><span>확인하는 시험</span></div>
        {data.safetyGoals.map((sg) => {
          const hz = data.hazards.filter((h) => h.sg === sg.id);
          const tests = data.tests.filter((t) => t.sgs.includes(sg.id));
          return (
            <div key={sg.id} className="trace-row">
              <div style={{ display: "flex", flexDirection: "column", gap: 6, height: "100%" }}>
                {hz.map((h) => (
                  <div key={h.id} className="node hz">
                    <div className="k"><span>{h.id} · {h.situation}</span><Asil a={hazardAsil(h)} /></div>
                    <div>{h.text}</div>
                    <div className="mono muted" style={{ marginTop: 2 }}>S{h.S} · E{h.E} · C{h.C}</div>
                  </div>
                ))}
              </div>
              <div className="arrow" aria-hidden>→</div>
              <div className="node sg">
                <div className="k"><span>{sg.id}</span><Asil a={s.sgA[sg.id]} /></div>
                <div>{sg.text}</div>
                <div className="small muted" style={{ marginTop: 2 }}>안전 상태: {sg.safeState}</div>
              </div>
              <div className="arrow" aria-hidden>→</div>
              <div className="node">
                {tests.length === 0 ? (
                  <span className="pill missing">이 안전 목표를 확인하는 시험이 없음</span>
                ) : (
                  tests.map((t) => (
                    <button key={t.id} type="button" className={`chip ${s.status[t.id]}`} onClick={() => open(t.id)} title={ST_LABEL[s.status[t.id]]}>
                      {t.id} {t.title}
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
        <p className="small muted" style={{ marginBottom: 0 }}>
          ASIL은 S·E·C 조합표를 합산식(합 10=D, 9=C, 8=B, 7=A, 그 이하 QM)으로 옮겨 계산했습니다. S·E·C 등급은 이 사례에 대한 판단이므로 참고용입니다.
        </p>
      </div>
    </section>
  );
}

/* ---------- 전체 시험 목록 ---------- */
export function TestTable({ data, s }: { data: CaseData; s: S }) {
  const [cat, setCat] = useState<Category | "all">("all");
  const list: TestItem[] = data.tests.filter((t) => cat === "all" || t.cat === cat);
  return (
    <section className="section">
      <h2>전체 시험 목록</h2>
      <p className="desc">에이전트가 제안한 모든 시험입니다. 행을 누르면 상세가 열립니다. 수치는 예시 값입니다.</p>
      <div className="toolbar">
        <button className="btn" aria-pressed={cat === "all"} onClick={() => setCat("all")}>전체 {data.tests.length}</button>
        {CATEGORIES.map((c) => (
          <button key={c.id} className="btn" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
            {c.label} {data.tests.filter((t) => t.cat === c.id).length}
          </button>
        ))}
      </div>
      <div className="card tbl-wrap" style={{ padding: 0 }}>
        <table className="tbl">
          <thead>
            <tr><th scope="col">ID</th><th scope="col">시험 항목</th><th scope="col">시험 조건</th><th scope="col">판정 기준</th><th scope="col">내 계획</th></tr>
          </thead>
          <tbody>
            {list.slice().sort((a, b) => (cat === "all" ? 0 : asilRank(testAsil(b, s.sgA)) - asilRank(testAsil(a, s.sgA)))).map((t) => (
              <tr key={t.id} className={s.status[t.id]}>
                <td className="mono">{t.id}</td>
                <td><TestButton t={t}><b>{t.title}</b></TestButton><div className="small muted">{catLabel(t.cat)}</div></td>
                <td>{t.condition}</td>
                <td>{t.criteria}</td>
                <td><StatusPill st={s.status[t.id]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- 추적표 ---------- */
export function TraceTable({ data, s }: { data: CaseData; s: S }) {
  const open = useOpen();
  const download = () => {
    const blob = new Blob([traceCsv(data)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `traceability-${data.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section className="section">
      <div className="toolbar">
        <h2 style={{ margin: 0, flex: 1 }}>요구사항 ↔ 시험 추적표</h2>
        <button className="btn primary" onClick={download}>CSV 내려받기</button>
      </div>
      <p className="desc">요구사항마다 어떤 시험이 그것을 확인하는지, 내 계획에 반영됐는지 보여줍니다.</p>
      <div className="card tbl-wrap" style={{ padding: 0 }}>
        <table className="tbl">
          <thead><tr><th scope="col">요구사항</th><th scope="col">내용</th><th scope="col">시험</th><th scope="col">반영</th></tr></thead>
          <tbody>
            {data.requirements.map((r) => {
              const ts = data.tests.filter((t) => t.reqs.includes(r.id));
              const done = ts.filter((t) => s.status[t.id] === "full").length;
              return (
                <tr key={r.id}>
                  <td className="mono">{r.id}</td>
                  <td style={{ maxWidth: 320 }}>{r.text}</td>
                  <td>
                    {ts.length === 0 && <span className="pill missing">확인하는 시험 없음</span>}
                    {ts.map((t) => (
                      <button key={t.id} type="button" className={`chip ${s.status[t.id]}`} title={t.title} onClick={() => open(t.id)}>{t.id}</button>
                    ))}
                  </td>
                  <td className="mono">{done}/{ts.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- 1단계 위험 표 ---------- */
export function HazardTable({ a }: { a: Pick<CaseData, "hazards" | "safetyGoals"> }) {
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead><tr><th scope="col">위험</th><th scope="col">상황</th><th scope="col">S·E·C</th><th scope="col">ASIL (참고)</th><th scope="col">안전 목표</th></tr></thead>
        <tbody>
          {a.hazards.map((h) => {
            const sg = a.safetyGoals.find((g) => g.id === h.sg);
            return (
              <tr key={h.id}>
                <td><span className="mono muted">{h.id}</span> {h.text}</td>
                <td>{h.situation}</td>
                <td className="mono">S{h.S} E{h.E} C{h.C}</td>
                <td><Asil a={hazardAsil(h)} /></td>
                <td><span className="mono muted">{sg?.id}</span> {sg?.text}<div className="small muted">안전 상태: {sg?.safeState}</div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- 시험 상세 패널 ---------- */
export function DetailPanel({ data, s, id, onClose }: { data: CaseData; s: S; id: string | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    lastFocus.current = document.activeElement as HTMLElement;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>("button, a[href], [tabindex]:not([tabindex='-1'])");
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      lastFocus.current?.focus();
    };
  }, [id, onClose]);

  const t = data.tests.find((x) => x.id === id);
  if (!id || !t) return null;

  return (
    <div className="drawer-back" onClick={onClose}>
      <div ref={panelRef} className="drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <div className="small muted">{t.id} · {catLabel(t.cat)}</div>
            <h2 id="detail-title" style={{ fontSize: 19, marginTop: 2 }}>{t.title}</h2>
          </div>
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="닫기">×</button>
        </div>
        <TestDetailBody data={data} s={s} t={t} />
      </div>
    </div>
  );
}

/** 시험 상세 내용 (드로어와 결과 화면의 오른쪽 상세 패널이 함께 씀) */
export function TestDetailBody({ data, s, t }: { data: CaseData; s: S; t: TestItem }) {
  const st = s.status[t.id];
  const reqs = t.reqs.map((r) => data.requirements.find((x) => x.id === r)).filter(Boolean) as CaseData["requirements"];
  const sgs = t.sgs.map((g) => data.safetyGoals.find((x) => x.id === g)).filter(Boolean) as CaseData["safetyGoals"];
  const blocks = t.blocks.map((b) => data.blocks.find((x) => x.id === b)).filter(Boolean) as CaseData["blocks"];
  const plans = data.plan.filter((p) => p.covers[t.id]);
  const prem = (t.assumes ?? []).map((pid) => data.premises?.find((p) => p.id === pid)).filter(Boolean) as Premise[];
  const stageLabel = (x: string) => STAGES.find((st) => st.id === x)?.label ?? "공통";
  return (
    <>
        <div className="drawer-badges">
          <PriorityBadge p={s.prio[t.id]} />
          <StatusPill st={st} />
          <Importance a={testAsil(t, s.sgA)} />
        </div>

        <div className="drawer-sec">
          <h3>시험 조건</h3><p>{t.condition}</p>
          <h3>판정 기준</h3><p>{t.criteria}</p>
          {t.why && <><h3>왜 필요한가</h3><p>{t.why}</p></>}
        </div>

        <div className="drawer-sec">
          <h3>내 계획과의 연결</h3>
          {plans.length ? (
            <ul className="plain">{plans.map((p) => <li key={p.id}><StatusPill st={p.covers[t.id]} /> {p.text}</li>)}</ul>
          ) : <p className="muted">내 계획에 대응하는 항목이 없습니다.</p>}
        </div>

        <div className="drawer-sec">
          <h3>근거 요구사항</h3>
          {reqs.length ? <ul className="plain">{reqs.map((r) => <li key={r.id}><span className="mono muted">{r.id}</span> {r.text}</li>)}</ul> : <p className="muted">연결된 요구사항 없음</p>}
        </div>

        {sgs.length > 0 && (
          <div className="drawer-sec">
            <h3>안전 목표</h3>
            <ul className="plain">
              {sgs.map((g) => (
                <li key={g.id}>
                  <span className="mono muted">{g.id}</span> {g.text} <Asil a={s.sgA[g.id]} />
                  <div className="small muted">안전 상태: {g.safeState}</div>
                  {data.hazards.filter((h) => h.sg === g.id).map((h) => (
                    <div key={h.id} className="small muted">← {h.id} {h.text} (S{h.S} E{h.E} C{h.C})</div>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        )}

        {blocks.length > 0 && (
          <div className="drawer-sec">
            <h3>걸리는 시스템 블록</h3>
            <div>{blocks.map((b) => <span key={b.id} className="chip static">{stageLabel(b.stage)} · {b.label}</span>)}</div>
          </div>
        )}

        <div className="drawer-sec">
          <h3>분석 전제</h3>
          {prem.length ? (
            <ul className="plain">
              {prem.map((p) => (
                <li key={p.id}><span className={`ptag ${p.kind}`}>{PREMISE_LABEL[p.kind]}</span> {p.q}<div className="small">{p.text}</div></li>
              ))}
            </ul>
          ) : <p className="muted">이 시험이 기대는 보완 질문 전제는 없습니다.</p>}
        </div>

        <p className="small muted" style={{ marginTop: 16 }}>AI가 만든 제안입니다. 조건과 판정 기준의 수치는 실제 사양에 맞게 검토한 뒤 계획에 넣으세요.</p>
    </>
  );
}
