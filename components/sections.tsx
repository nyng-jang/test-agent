"use client";

import { useState } from "react";
import type { CaseData, Category, TestItem } from "@/lib/types";
import { CATEGORIES, STAGES } from "@/lib/types";
import { asilRank, hazardAsil, matrix, summary, testAsil, traceCsv, type TestStatus } from "@/lib/analysis";

const ST_LABEL: Record<TestStatus, string> = { full: "계획에 있음", partial: "부분 반영", missing: "누락" };
const catLabel = (c: Category) => CATEGORIES.find((x) => x.id === c)!.label;

export function Asil({ a }: { a: string }) {
  return <span className={`badge asil-${a}`}>{a === "QM" ? "QM" : `ASIL ${a}`}</span>;
}

export function Overview({ data, s }: { data: CaseData; s: S }) {
  const coveragePct = Math.round(((s.full + s.partial * 0.5) / Math.max(1, s.total)) * 100);
  return (
    <div className="stats">
      <div className="stat"><div className="v">{s.total}</div><div className="l">에이전트 제안 시험</div></div>
      <div className="stat ok"><div className="v">{s.full}</div><div className="l">내 계획에 있음</div></div>
      <div className="stat warn"><div className="v">{s.partial}</div><div className="l">부분 반영</div></div>
      <div className="stat gap"><div className="v">{s.missingCount}</div><div className="l">누락 · 커버리지 {coveragePct}%</div></div>
    </div>
  );
}

export type S = ReturnType<typeof summary>;

export function GapCompare({ data, s }: { data: CaseData; s: S }) {
  const [onlyGap, setOnlyGap] = useState(false);
  const title = (id: string) => data.tests.find((t) => t.id === id)?.title ?? id;
  return (
    <section className="section">
      <h2>누락 하이라이트: 내 계획 vs 에이전트 제안</h2>
      <p className="desc">왼쪽은 사람이 짠 계획, 오른쪽은 에이전트가 제안한 시험 항목입니다. 계획에 없는 항목은 빨간색, 일부만 다룬 항목은 노란 점선으로 표시합니다.</p>
      <div className="compare">
        <div className="card">
          <h3>내 시험 계획 ({data.plan.length}개)</h3>
          {data.planNote && <p className="small muted" style={{ marginTop: -4 }}>{data.planNote}</p>}
          {data.plan.map((p) => {
            const entries = Object.entries(p.covers);
            return (
              <div key={p.id} className="plan-item">
                <div className="t">{p.text}</div>
                <div className="small" style={{ marginTop: 4 }}>
                  {entries.length === 0 ? (
                    <span className="muted">대응되는 제안 항목 없음 (기준이 정량화되지 않음)</span>
                  ) : (
                    entries.map(([tid, lvl]) => (
                      <span key={tid} className={`chip ${lvl}`} title={title(tid)}>
                        {tid} {lvl === "partial" ? "· 부분" : ""}
                      </span>
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
            <button className="btn" aria-pressed={onlyGap} onClick={() => setOnlyGap((v) => !v)}>
              누락·부분만 보기
            </button>
          </div>
          {CATEGORIES.map((c) => {
            const items = data.tests.filter((t) => t.cat === c.id && (!onlyGap || s.status[t.id] !== "full"));
            if (!items.length) return null;
            return (
              <div key={c.id} className="agent-cat">
                <h4>{c.label}</h4>
                {items.map((t) => (
                  <div key={t.id} className={`agent-item ${s.status[t.id]}`}>
                    <span className="id">{t.id}</span>
                    <span className="grow">{t.title}</span>
                    <Asil a={testAsil(t, s.sgA)} />
                    <span className={`pill ${s.status[t.id]}`}>{ST_LABEL[s.status[t.id]]}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function Priority({ data, s, limit = 5, title, desc }: { data: CaseData; s: S; limit?: number; title?: string; desc?: string }) {
  const [cat, setCat] = useState<Category | "all">("all");
  const list = s.missing.filter((t) => cat === "all" || t.cat === cat);
  const top = limit ? list.slice(0, limit) : list;
  if (!s.missing.length) return <section className="section"><div className="notice">계획에서 빠진 항목이 없습니다.</div></section>;
  return (
    <section className="section">
      <h2>{title ?? "먼저 보완할 시험 항목"}</h2>
      <p className="desc">{desc ?? `누락·부분 반영 항목 중 위험도(ASIL)가 높은 순서로 ${limit}개입니다.`}</p>
      {!limit && (
        <div className="toolbar">
          <button className="btn" aria-pressed={cat === "all"} onClick={() => setCat("all")}>전체 {s.missing.length}</button>
          {CATEGORIES.map((c) => {
            const n = s.missing.filter((t) => t.cat === c.id).length;
            return n ? <button key={c.id} className="btn" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.label} {n}</button> : null;
          })}
        </div>
      )}
      <div className="card">
        <ol className="priority">
          {top.map((t) => (
            <li key={t.id}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                <Asil a={testAsil(t, s.sgA)} />
                <span className={`pill ${s.status[t.id]}`}>{ST_LABEL[s.status[t.id]]}</span>
              </div>
              <div>
                <div><b>{t.title}</b> <span className="small muted">{t.id} · {catLabel(t.cat)}</span></div>
                <div className="small"><b>조건</b> {t.condition}</div>
                <div className="small"><b>판정</b> {t.criteria}</div>
                <div className="small mono muted">근거 {[...t.reqs, ...t.sgs].join(" ")}</div>
                {t.why && <div className="why">왜 필요한가: {t.why}</div>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function CoverageMatrix({ data, status }: { data: CaseData; status: Record<string, TestStatus> }) {
  const rows = matrix(data, status);
  const label = { covered: "반영", partial: "부분", gap: "누락", none: "–" } as const;
  return (
    <section className="section">
      <h2>커버리지 매트릭스</h2>
      <p className="desc">행은 요구사항, 열은 시험 카테고리입니다. 칸 숫자는 에이전트가 제안한 시험 수이고, 색은 내 계획이 그 칸을 얼마나 다뤘는지입니다.</p>
      <div className="card matrix-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th className="req">요구사항</th>
              {CATEGORIES.map((c) => <th key={c.id}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.req.id}>
                <td className="req"><b>{r.req.id}</b>{r.req.text}</td>
                {r.cells.map((cell) => (
                  <td
                    key={cell.cat}
                    className={`cell ${cell.status}`}
                    title={cell.tests.map((t) => `${t.id} ${t.title} (${ST_LABEL[status[t.id]]})`).join("\n") || "해당 시험 없음"}
                  >
                    {cell.tests.length ? `${label[cell.status]} ${cell.tests.length}` : label.none}
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
      </div>
    </section>
  );
}

export function BlockDiagram({ data, status, plain }: { data: Pick<CaseData, "blocks" | "tests">; status?: Record<string, TestStatus>; plain?: boolean }) {
  const [sel, setSel] = useState<string | null>(null);
  const testsFor = (bid: string) => data.tests.filter((t) => t.blocks.includes(bid));
  const renderBlock = (b: CaseData["blocks"][number]) => {
    if (plain || !status) return <div key={b.id} className="block" style={{ cursor: "default" }}><div style={{ fontWeight: 600, fontSize: 14 }}>{b.label}</div></div>;
    const ts = testsFor(b.id);
    const g = ts.filter((t) => status[t.id] !== "full").length;
    return (
      <button key={b.id} className={`block ${sel === b.id ? "sel" : ""} ${g ? "has-gap" : ""}`} onClick={() => setSel(sel === b.id ? null : b.id)}>
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
      <p className="desc">센서 → 처리 → 액추에이터 흐름에서 각 시험이 어디에 걸리는지 보여줍니다. 블록을 누르면 해당 시험 목록이 나옵니다. 왼쪽 빨간 띠는 보완이 필요한 블록입니다.</p></>}
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
              <div key={t.id} className={`agent-item ${status![t.id]}`}>
                <span className="id">{t.id}</span>
                <span className="grow">{t.title}</span>
                <span className={`pill ${status![t.id]}`}>{ST_LABEL[status![t.id]]}</span>
              </div>
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

export function SafetyTrace({ data, s }: { data: CaseData; s: S }) {
  return (
    <section className="section">
      <h2>기능안전 추적: 위험 → 안전 목표 → 시험 항목</h2>
      <p className="desc">
        ISO 26262의 HARA 개념을 적용해봤습니다(공식 적용 대상이 아니므로 &ldquo;준수&rdquo;가 아니라 개념 적용). 위험마다 심각도(S)·노출(E)·제어 가능성(C)을 매기고, 그 조합으로 ASIL을 정한 뒤, 안전 목표와 그것을 확인하는 시험 항목으로 이어 붙였습니다.
      </p>
      <div className="card">
        <div className="trace-head"><span>위험 (HARA)</span><span /><span>안전 목표</span><span /><span>확인하는 시험 항목</span></div>
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
                    <div className="mono muted" style={{ marginTop: 2 }}>S{h.S} · E{h.E} · C{h.C} → {hazardAsil(h)}</div>
                  </div>
                ))}
              </div>
              <div className="arrow">→</div>
              <div className="node sg">
                <div className="k"><span>{sg.id}</span><Asil a={s.sgA[sg.id]} /></div>
                <div>{sg.text}</div>
                <div className="small muted" style={{ marginTop: 2 }}>안전 상태: {sg.safeState}</div>
              </div>
              <div className="arrow">→</div>
              <div className="node">
                {tests.length === 0 ? (
                  <span className="pill missing">이 안전 목표를 확인하는 시험이 없음</span>
                ) : (
                  tests.map((t) => (
                    <span key={t.id} className={`chip ${s.status[t.id]}`} title={`${t.title} (${ST_LABEL[s.status[t.id]]})`}>
                      {t.id} {t.title}
                    </span>
                  ))
                )}
              </div>
            </div>
          );
        })}
        <p className="small muted" style={{ marginBottom: 0 }}>
          ASIL 산정은 S·E·C 등급을 합산하는 단순화된 방식(합 10=D, 9=C, 8=B, 7=A, 그 이하 QM)으로 표현했습니다. 등급 값은 이 사례에 대한 저의 판단입니다.
        </p>
      </div>
    </section>
  );
}

export function TestTable({ data, s }: { data: CaseData; s: S }) {
  const [cat, setCat] = useState<Category | "all">("all");
  const list: TestItem[] = data.tests.filter((t) => cat === "all" || t.cat === cat);
  return (
    <section className="section">
      <h2>시험 항목 상세</h2>
      <p className="desc">카테고리별 시험 조건, 판정 기준, 근거 요구사항입니다. 수치는 예시 값입니다.</p>
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
            <tr><th>ID</th><th>시험 항목</th><th>시험 조건</th><th>판정 기준</th><th>근거</th><th>내 계획</th></tr>
          </thead>
          <tbody>
            {list
              .slice()
              .sort((a, b) => (cat === "all" ? 0 : asilRank(testAsil(b, s.sgA)) - asilRank(testAsil(a, s.sgA))))
              .map((t) => (
                <tr key={t.id} className={s.status[t.id]}>
                  <td className="mono">{t.id}</td>
                  <td><b>{t.title}</b><div style={{ marginTop: 4 }}><Asil a={testAsil(t, s.sgA)} /></div></td>
                  <td>{t.condition}</td>
                  <td>{t.criteria}</td>
                  <td className="mono">{[...t.reqs, ...t.sgs].join(" ")}</td>
                  <td><span className={`pill ${s.status[t.id]}`}>{ST_LABEL[s.status[t.id]]}</span></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function TraceTable({ data, status }: { data: CaseData; status: Record<string, TestStatus> }) {
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
      <h2>요구사항 ↔ 시험항목 추적표</h2>
      <div className="toolbar">
        <p className="desc" style={{ margin: 0, flex: 1 }}>요구사항마다 어떤 시험이 그것을 확인하는지, 내 계획에 반영됐는지 보여줍니다.</p>
        <button className="btn primary" onClick={download}>CSV 내려받기</button>
      </div>
      <div className="card tbl-wrap" style={{ padding: 0 }}>
        <table className="tbl">
          <thead><tr><th>요구사항</th><th>내용</th><th>시험 항목</th><th>반영</th></tr></thead>
          <tbody>
            {data.requirements.map((r) => {
              const ts = data.tests.filter((t) => t.reqs.includes(r.id));
              const done = ts.filter((t) => status[t.id] === "full").length;
              return (
                <tr key={r.id}>
                  <td className="mono">{r.id}</td>
                  <td style={{ maxWidth: 320 }}>{r.text}</td>
                  <td>
                    {ts.length === 0 && <span className="pill missing">확인하는 시험 없음</span>}
                    {ts.map((t) => (
                      <span key={t.id} className={`chip ${status[t.id]}`} title={t.title}>{t.id}</span>
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

export function HazardTable({ a }: { a: Pick<CaseData, "hazards" | "safetyGoals"> }) {
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead><tr><th>위험</th><th>상황</th><th>S·E·C</th><th>ASIL</th><th>안전 목표</th></tr></thead>
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
