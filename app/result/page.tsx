"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Shell, { StepHead, useStepState } from "@/components/Shell";
import { BlockDiagram, CoverageMatrix, GapCompare, Overview, Priority, SafetyTrace, TestTable, TraceTable } from "@/components/sections";
import { useFlow } from "@/lib/flow";
import { summary } from "@/lib/analysis";
import { runChecks } from "@/lib/checks";
import { DEMO_CASES } from "@/lib/demo";
import type { CaseData } from "@/lib/types";

export default function ResultPage() {
  return <Shell step={3}><ResultStep /></Shell>;
}

const TABS = [
  { id: "summary", label: "요약" },
  { id: "gaps", label: "보완 필요 항목" },
  { id: "compare", label: "계획 비교" },
  { id: "matrix", label: "커버리지 매트릭스" },
  { id: "blocks", label: "블록도" },
  { id: "safety", label: "기능안전 추적" },
  { id: "trace", label: "추적표" },
  { id: "tests", label: "전체 시험 항목" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function ResultStep() {
  const { flow } = useFlow();
  const { gapOk } = useStepState();
  const [tab, setTab] = useState<TabId>("summary");

  useEffect(() => {
    const h = window.location.hash.slice(1) as TabId;
    if (TABS.some((t) => t.id === h)) setTab(h);
  }, []);
  const select = (id: TabId) => { setTab(id); history.replaceState(null, "", `#${id}`); };

  const data: CaseData | null = useMemo(() => {
    if (!flow.analysis || !flow.gap) return null;
    const demo = DEMO_CASES.find((c) => c.id === flow.demoId);
    return {
      ...flow.analysis, ...flow.gap,
      id: flow.demoId ?? "my-system",
      tab: demo?.tab ?? flow.analysis.name,
      planNote: demo?.planNote,
    };
  }, [flow.analysis, flow.gap, flow.demoId]);
  const s = useMemo(() => (data ? summary(data) : null), [data]);

  if (!gapOk || !data || !s)
    return (
      <>
        <StepHead n={3} title="보완 항목 결과" desc="" />
        <div className="notice">먼저 <Link href="/plan">2단계 내 시험 계획</Link>에서 누락 탐지를 실행해 주세요.</div>
      </>
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

  return (
    <>
      <StepHead n={3} title="보완 항목 결과"
        desc={<><b>{data.name}</b>의 시스템 분석과 내 시험 계획 {data.plan.length}개를 대조한 결과입니다. 탭을 눌러 원하는 관점으로 보세요.</>} />

      <div className="subtabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" className="subtab" aria-selected={tab === t.id} onClick={() => select(t.id)}>
            {t.label}{t.id === "gaps" && <span className="cnt">{s.missing.length}</span>}
          </button>
        ))}
      </div>

      {tab === "summary" && (
        <>
          <section className="section"><Overview data={data} s={s} /></section>
          <Priority data={data} s={s} limit={3} title="가장 먼저 보완할 3가지" desc="누락·부분 반영 항목 중 위험도(ASIL)가 가장 높은 순서입니다. 전체 목록은 '보완 필요 항목' 탭에 있습니다." />
          <section className="section">
            <div className="toolbar">
              <button className="btn" onClick={() => select("gaps")}>보완 필요 항목 {s.missing.length}개 전체 보기 →</button>
              <button className="btn" onClick={() => select("matrix")}>커버리지 매트릭스 보기 →</button>
              <span style={{ flex: 1 }} />
              <button className="btn" onClick={downloadJson}>결과 JSON 내려받기</button>
            </div>
          </section>
          {checks.length > 0 && (
            <section className="section">
              <h2>검증 기준</h2>
              <ul className="check-list card">
                {checks.map((c) => (
                  <li key={c.label}><span className={c.pass ? "ok" : "fail"}>{c.pass ? "통과" : "실패"}</span> {c.label} <span className="muted small">({c.detail})</span></li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      {tab === "gaps" && <Priority data={data} s={s} limit={0} title="보완 필요 항목" desc="내 계획에 없거나 일부만 다룬 시험 항목입니다. 위험도(ASIL) 순으로 정렬했습니다." />}
      {tab === "compare" && <GapCompare data={data} s={s} />}
      {tab === "matrix" && <CoverageMatrix data={data} status={s.status} />}
      {tab === "blocks" && <BlockDiagram data={data} status={s.status} />}
      {tab === "safety" && <SafetyTrace data={data} s={s} />}
      {tab === "trace" && <TraceTable data={data} status={s.status} />}
      {tab === "tests" && <TestTable data={data} s={s} />}

      <div className="actions">
        <Link className="btn" href="/plan">← 시험 계획 고치기</Link>
      </div>
    </>
  );
}
