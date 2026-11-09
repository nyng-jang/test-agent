"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Shell, { useStepState } from "@/components/Shell";
import { AppFrame } from "@/components/AppFrame";
import { Term } from "@/components/Term";
import { ICON } from "@/lib/icons";
import {
  BlockDiagram, CoverageMatrix, DetailPanel, DetailProvider, GapCompare,
  SafetyTrace, StatusPill, TestDetailBody, TraceTable,
} from "@/components/sections";
import { flowPremises, useFlow } from "@/lib/flow";
import { PRIORITY_LABEL, summary, testAsil, type Priority, type TestStatus } from "@/lib/analysis";
import { runChecks } from "@/lib/checks";
import { DEMO_CASES } from "@/lib/demo";
import { CATEGORIES, type CaseData, type Category, type TestItem } from "@/lib/types";

export default function ResultPage() {
  return <Shell step={3} wide><ResultStep /></Shell>;
}

type ViewId = "gaps" | "tests" | "compare" | "trace" | "blocks";
const VIEW_IDS: ViewId[] = ["gaps", "tests", "compare", "trace", "blocks"];
type S = ReturnType<typeof summary>;
const catLabel = (c: Category) => CATEGORIES.find((x) => x.id === c)?.label ?? c;

function ResultStep() {
  const { flow } = useFlow();
  const { gapOk } = useStepState();
  const [view, setView] = useState<ViewId>("gaps");
  const [detail, setDetail] = useState<string | null>(null); // 좁은 화면용 드로어
  const closeDetail = useCallback(() => setDetail(null), []);

  useEffect(() => {
    const h = window.location.hash.slice(1) as ViewId;
    if (VIEW_IDS.includes(h)) setView(h);
  }, []);
  const go = (id: ViewId) => { setView(id); history.replaceState(null, "", `#${id}`); window.scrollTo({ top: 0 }); };

  const data: CaseData | null = useMemo(() => {
    if (!flow.analysis || !flow.gap) return null;
    const demo = DEMO_CASES.find((c) => c.id === flow.demoId);
    return {
      ...flow.analysis, ...flow.gap,
      id: flow.demoId ?? "my-system",
      tab: demo?.tab ?? flow.analysis.name,
      planNote: demo?.planNote,
      premises: flowPremises(flow),
    };
  }, [flow]);
  const s = useMemo(() => (data ? summary(data) : null), [data]);

  if (!gapOk || !data || !s)
    return (
      <div className="rs-empty">
        <h1>분석 결과</h1>
        <div className="notice">먼저 <Link href="/plan">2단계 내 시험 계획</Link>에서 누락 탐지를 실행해 주세요.</div>
      </div>
    );

  const checks = flow.demoId ? runChecks(DEMO_CASES).filter((c) => c.label.startsWith(`${data.tab}:`)) : [];
  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `test-gap-${data.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const nav: { id: ViewId; label: string; n?: number }[] = [
    { id: "gaps", label: "보완 항목", n: s.missing.length },
    { id: "tests", label: "전체 시험", n: s.total },
    { id: "compare", label: "내 계획과 비교", n: data.plan.length },
    { id: "trace", label: "요구사항별 시험 확인", n: data.requirements.length },
    { id: "blocks", label: "시스템 구성과 시험", n: data.blocks.length },
  ];
  const title: Record<ViewId, string> = { gaps: "보완 항목", tests: "전체 시험", compare: "내 계획과 비교", trace: "요구사항별 시험 확인", blocks: "시스템 구성과 시험 연결" };

  return (
    <DetailProvider value={setDetail}>
      <AppFrame
        target={{ k: "분석 대상", name: data.name, meta: <>내 계획 {data.plan.length}개 · 제안 시험 {s.total}개</> }}
        items={nav.map((n) => ({ ...n, on: view === n.id, onClick: () => go(n.id) }))}
        links={[{ label: "분석 전제 고치기", href: "/system" }, { label: "시험 계획 고치기", href: "/plan" }, { label: "결과 JSON 내려받기", onClick: downloadJson }]}
        crumb={[data.name, "분석 결과", title[view]]}
        title={view === "gaps" ? "" : title[view]}
      >
          {view === "gaps" && (
            <>
              <ResultHero data={data} s={s} onOpen={setDetail} />
              <Dashboard data={data} s={s} />
              <TestWorkspace data={data} s={s} list={s.missing} onNarrowOpen={setDetail} heading="우선 확인할 항목" note="누락되었거나 일부만 반영된 시험입니다. 우선순위 순으로 정렬했습니다." />
              {checks.length > 0 && (
                <section className="rs-card rs-checks">
                  <h2>이 사례의 검증 기준</h2>
                  <ul>
                    {checks.map((c) => (
                      <li key={c.label}><span className={c.pass ? "ok" : "fail"}>{c.pass ? "통과" : "실패"}</span>{c.label} <span className="muted">({c.detail})</span></li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
          {view === "tests" && <TestWorkspace data={data} s={s} list={data.tests} onNarrowOpen={setDetail} heading="에이전트가 제안한 시험" note="계획 상태와 관계없이 모든 제안 시험입니다." showStatusFilter />}
          {view === "compare" && <div className="rs-legacy"><GapCompare data={data} s={s} /></div>}
          {view === "trace" && (
            <div className="rs-legacy">
              <CoverageMatrix data={data} s={s} />
              <TraceTable data={data} s={s} />
              <SafetyTrace data={data} s={s} />
            </div>
          )}
          {view === "blocks" && <div className="rs-legacy"><BlockDiagram data={data} status={s.status} /></div>}
      </AppFrame>
      <DetailPanel data={data} s={s} id={detail} onClose={closeDetail} />
    </DetailProvider>
  );
}

/* ---------- 결과 첫 줄: 결론 문장 + 주요 발견 사항 ---------- */
function ResultHero({ data, s, onOpen }: { data: CaseData; s: S; onOpen: (id: string) => void }) {
  const top = s.missing.slice(0, 3);
  const n = s.missing.length;
  return (
    <section className="rh" aria-labelledby="rh-title">
      <div className="rh-head">
        <span className="rh-check" aria-hidden>{ICON.check}</span>
        <div>
          <h2 id="rh-title">{n > 0 ? <>시험 계획에서 보완할 조건을<br />총 <em>{n}개</em> 발견했어요</> : <>제안한 시험이 모두<br />계획에 들어 있어요</>}</h2>
          <p>{data.name} · 내 계획 {data.plan.length}개를 제안 시험 {s.total}개와 대조했어요. 빠진 시험 {s.missingCount}개, 일부만 반영된 시험 {s.partial}개입니다.</p>
        </div>
      </div>
      {n > 0 && (
        <div className="rh-grid">
          <div className="rh-card">
            <h3><span className="rh-warn" aria-hidden>{ICON.hazard}</span>먼저 확인할 시험</h3>
            <ul>
              {top.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => onOpen(t.id)}>
                    <span className="rh-t">{t.title}</span>
                    <span className="rh-sub">{s.status[t.id] === "missing" ? "계획에 없음" : "일부만 반영"} · {CATEGORIES.find((c) => c.id === t.cat)?.label}</span>
                    {s.prio[t.id] && <span className={`rh-prio p-${s.prio[t.id]}`}>{PRIORITY_LABEL[s.prio[t.id]!]}</span>}
                  </button>
                </li>
              ))}
            </ul>
            <a className="rh-more" href="#rs-list" onClick={(e) => { e.preventDefault(); document.getElementById("rs-list")?.scrollIntoView({ behavior: "smooth" }); }}>전체 {n}개 자세히 보기 <span aria-hidden>→</span></a>
          </div>
          <div className="rh-side">
            <h3>이렇게 활용하세요</h3>
            <ol>
              <li>위 시험을 눌러 <b>왜 빠졌는지</b>와 조건·판정 기준을 확인해요.</li>
              <li>필요한 시험을 내 계획에 넣고 <Link href="/plan">다시 대조</Link>해요.</li>
              <li>AI 가정에 기대는 시험은 <Link href="/system">분석 전제</Link>를 확인해요.</li>
            </ol>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- 대시보드 (TestRail식 요약) ---------- */
function Dashboard({ data, s }: { data: CaseData; s: S }) {
  const pct = Math.round(((s.full + s.partial * 0.5) / Math.max(1, s.total)) * 100);
  const premises = data.premises ?? [];
  const nAssume = premises.filter((p) => p.kind === "assume").length;
  const nUnknown = premises.filter((p) => p.kind === "unknown").length;
  const nFact = premises.filter((p) => p.kind === "fact").length;
  const dependent = data.tests.filter((t) => (t.assumes ?? []).some((id) => premises.find((p) => p.id === id && p.kind !== "fact"))).length;
  const cats = CATEGORIES.map((c) => {
    const ts = data.tests.filter((t) => t.cat === c.id);
    const n = (st: TestStatus) => ts.filter((t) => s.status[t.id] === st).length;
    return { ...c, total: ts.length, full: n("full"), partial: n("partial"), missing: n("missing") };
  });
  const maxPrio = Math.max(1, s.byPrio.high, s.byPrio.mid, s.byPrio.low);

  return (
    <>
      <section className="rs-card rs-kpi" aria-label="요약">
        <div className="rs-kpi-cells">
          <div><span>제안 시험</span><b>{s.total}</b></div>
          <div><span>계획에 있음</span><b className="c-ok">{s.full}</b></div>
          <div><span>부분 반영</span><b className="c-warn">{s.partial}</b></div>
          <div><span>누락</span><b className="c-gap">{s.missingCount}</b></div>
        </div>
        <div className="rs-cov">
          <div className="rs-cov-top"><span><Term k="coverage">시험 계획 커버리지</Term></span><b>{pct}%</b></div>
          <div className="rs-bar lg" aria-hidden>
            <i className="f" style={{ flex: s.full }} /><i className="p" style={{ flex: s.partial }} /><i className="m" style={{ flex: s.missingCount }} />
          </div>
          <div className="rs-legend"><span className="f">계획에 있음</span><span className="p">부분 반영</span><span className="m">누락</span></div>
        </div>
      </section>

      <div className="rs-grid3">
        <section className="rs-card">
          <h2>카테고리별 반영 상태</h2>
          <ul className="rs-cats">
            {cats.map((c) => (
              <li key={c.id}>
                <span className="rs-cl">{c.label}</span>
                <span className="rs-bar" aria-hidden><i className="f" style={{ flex: c.full }} /><i className="p" style={{ flex: c.partial }} /><i className="m" style={{ flex: c.missing }} /></span>
                <span className="rs-cn">{c.full}<small>/{c.total}</small></span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rs-card">
          <h2><Term k="priority" /></h2>
          <ul className="rs-prio">
            {(["high", "mid", "low"] as Priority[]).map((p) => (
              <li key={p}>
                <span className={`prio prio-${p}`}>{PRIORITY_LABEL[p]}</span>
                <span className="rs-pbar"><i className={`prio-${p}`} style={{ width: `${(s.byPrio[p] / maxPrio) * 100}%` }} /></span>
                <b>{s.byPrio[p]}</b>
              </li>
            ))}
          </ul>
          <p className="rs-fine">계획 상태와 <Term k="importance" />(ASIL, 참고)를 함께 보고 정했습니다.</p>
        </section>
        <section className="rs-card">
          <h2><Term k="premise" /></h2>
          <ul className="rs-prem">
            <li><Term k="fact"><span className="ptag fact">사용자 확인</span></Term><b>{nFact}</b></li>
            <li><Term k="assume"><span className="ptag assume">AI 가정</span></Term><b>{nAssume}</b></li>
            <li><Term k="unknown"><span className="ptag unknown">확인 필요</span></Term><b>{nUnknown}</b></li>
          </ul>
          <p className="rs-fine">
            {dependent > 0 ? <>AI 가정이나 확인 필요 전제에 기대는 시험이 <b>{dependent}개</b> 있습니다. 목록에서 표시를 확인하세요.</> : "모든 시험이 확인된 정보에만 기대고 있습니다."}
            {" "}<Link href="/system">전제 고치기</Link>
          </p>
        </section>
      </div>
    </>
  );
}

/* ---------- 시험 목록 + 오른쪽 상세 (Qase 목록 + Sentry 상세) ---------- */
function TestWorkspace({ data, s, list, onNarrowOpen, heading, note, showStatusFilter }: {
  data: CaseData; s: S; list: TestItem[]; onNarrowOpen: (id: string) => void; heading: string; note: string; showStatusFilter?: boolean;
}) {
  const [q, setQ] = useState("");
  const [prio, setPrio] = useState<Priority | "all">("all");
  const [cat, setCat] = useState<Category | "all">("all");
  const [st, setSt] = useState<TestStatus | "all">("all");
  const [sel, setSel] = useState<string | null>(list[0]?.id ?? null);

  const rows = list.filter((t) =>
    (prio === "all" || s.prio[t.id] === prio) &&
    (cat === "all" || t.cat === cat) &&
    (st === "all" || s.status[t.id] === st) &&
    (!q.trim() || `${t.id} ${t.title} ${t.condition}`.toLowerCase().includes(q.trim().toLowerCase())),
  );
  const cur = data.tests.find((t) => t.id === sel) ?? null;
  const assumeOf = (t: TestItem) => {
    const ps = (t.assumes ?? []).map((id) => data.premises?.find((p) => p.id === id)).filter((p) => p && p.kind !== "fact");
    if (!ps.length) return null;
    return ps.some((p) => p!.kind === "unknown") ? "unknown" : "assume";
  };
  const pick = (id: string) => {
    setSel(id);
    if (window.matchMedia("(max-width: 1179px)").matches) onNarrowOpen(id);
  };

  return (
    <section className="rs-work" id="rs-list">
      <div className="rs-card rs-listcard">
        <div className="rs-list-head">
          <div>
            <h2>{heading} <em>{rows.length}</em></h2>
            <p>{note}</p>
          </div>
        </div>
        <div className="rs-filters">
          <input type="search" placeholder="ID, 시험 이름, 조건으로 찾기" value={q} onChange={(e) => setQ(e.target.value)} aria-label="시험 찾기" />
          {showStatusFilter && (
            <select value={st} onChange={(e) => setSt(e.target.value as TestStatus | "all")} aria-label="계획 상태">
              <option value="all">모든 상태</option><option value="missing">누락</option><option value="partial">부분 반영</option><option value="full">계획에 있음</option>
            </select>
          )}
          <select value={prio} onChange={(e) => setPrio(e.target.value as Priority | "all")} aria-label="우선순위">
            <option value="all">모든 우선순위</option>
            {(["high", "mid", "low"] as Priority[]).map((p) => <option key={p} value={p}>우선순위 {PRIORITY_LABEL[p]}</option>)}
          </select>
          <select value={cat} onChange={(e) => setCat(e.target.value as Category | "all")} aria-label="카테고리">
            <option value="all">모든 카테고리</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div className="rs-table-wrap">
          <table className="rs-table">
            <thead>
              <tr><th scope="col">ID</th><th scope="col">시험 항목</th><th scope="col">카테고리</th><th scope="col">계획 상태</th><th scope="col">우선순위</th><th scope="col" title="연결된 안전 목표의 ASIL (참고)">안전 중요도</th></tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const a = assumeOf(t);
                return (
                  <tr key={t.id} className={`${sel === t.id ? "sel" : ""} st-${s.status[t.id]}`} onClick={() => pick(t.id)}>
                    <td className="mono">{t.id}</td>
                    <td>
                      <button type="button" className="rs-row-btn" onClick={(e) => { e.stopPropagation(); pick(t.id); }} aria-pressed={sel === t.id}>{t.title}</button>
                      {a && <span className={`ptag ${a}`}>{a === "unknown" ? "확인 필요 전제" : "AI 가정 기반"}</span>}
                    </td>
                    <td className="muted">{catLabel(t.cat)}</td>
                    <td><StatusPill st={s.status[t.id]} /></td>
                    <td>{s.prio[t.id] ? <span className={`prio prio-${s.prio[t.id]}`}>{PRIORITY_LABEL[s.prio[t.id]!]}</span> : <span className="muted">–</span>}</td>
                    <td><AsilText a={testAsil(t, s.sgA)} /></td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={6} className="muted rs-none">조건에 맞는 시험이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="rs-card rs-detail" aria-label="시험 상세">
        {cur ? (
          <>
            <div className="rs-detail-head">
              <div className="rs-crumb">{cur.id} · {catLabel(cur.cat)}</div>
              <h2>{cur.title}</h2>
            </div>
            <TestDetailBody data={data} s={s} t={cur} />
          </>
        ) : <p className="muted">왼쪽 목록에서 시험을 고르면 조건과 근거가 여기에 나옵니다.</p>}
      </aside>
    </section>
  );
}

function AsilText({ a }: { a: string }) {
  return <b className={`rs-asil asil-${a}`}>{a === "QM" ? "QM" : `ASIL ${a}`}</b>;
}
