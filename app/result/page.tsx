"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Shell, { StepHead, useStepState } from "@/components/Shell";
import {
  BlockDiagram, CoverageMatrix, DetailPanel, DetailProvider, GapCompare, GapList, Overview, PremiseSummary,
  SafetyTrace, TestTable, TraceTable,
} from "@/components/sections";
import { TabPanel, Tabs } from "@/components/Tabs";
import { flowPremises, useFlow } from "@/lib/flow";
import { summary } from "@/lib/analysis";
import { runChecks } from "@/lib/checks";
import { DEMO_CASES } from "@/lib/demo";
import type { CaseData } from "@/lib/types";

export default function ResultPage() {
  return <Shell step={3}><ResultStep /></Shell>;
}

type TabId = "gaps" | "compare" | "trace" | "blocks" | "tests";
const TAB_IDS: TabId[] = ["gaps", "compare", "trace", "blocks", "tests"];

function ResultStep() {
  const { flow } = useFlow();
  const { gapOk } = useStepState();
  const [tab, setTab] = useState<TabId>("gaps");
  const [detail, setDetail] = useState<string | null>(null);
  const closeDetail = useCallback(() => setDetail(null), []);

  useEffect(() => {
    const h = window.location.hash.slice(1) as TabId;
    if (TAB_IDS.includes(h)) setTab(h);
  }, []);
  const select = (id: string) => { setTab(id as TabId); history.replaceState(null, "", `#${id}`); };

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

  const tabs = [
    { id: "gaps", label: "보완 항목", badge: s.missing.length },
    { id: "compare", label: "계획 비교" },
    { id: "trace", label: "요구사항 추적" },
    { id: "blocks", label: "시스템 블록도" },
    { id: "tests", label: "전체 시험 목록", badge: s.total },
  ];
  const high = s.byPrio.high;

  return (
    <DetailProvider value={setDetail}>
      <StepHead n={3} title="시험 계획 분석 결과"
        desc={<><b>{data.name}</b> · 내 계획 {data.plan.length}개를 에이전트 제안 {s.total}개와 대조했습니다.</>} />

      <section className="section result-summary" style={{ marginTop: 10 }}>
        <Overview s={s} />
        <p className={`headline decision-callout ${s.missing.length ? "has-gaps" : "all-covered"}`}>
          {s.missing.length === 0
            ? "계획에서 빠진 시험이 없습니다."
            : <>보완이 필요한 시험이 <b>{s.missing.length}개</b> 있고, 그중 <b className="gap-t">우선순위 높음 {high}개</b>부터 확인하세요.</>}
        </p>
        <PremiseSummary premises={data.premises ?? []} tests={data.tests} />
      </section>

      <Tabs tabs={tabs} value={tab} onChange={select} idPrefix="result" label="결과 보기 방식" />

      <TabPanel idPrefix="result" id={tab}>
        {tab === "gaps" && (
          <>
            <GapList data={data} s={s} />
            <section className="section">
              <div className="toolbar">
                <span className="small muted" style={{ flex: 1 }}>다른 관점: </span>
                <button className="btn" onClick={() => select("compare")}>내 계획과 나란히 보기</button>
                <button className="btn" onClick={() => select("trace")}>요구사항별로 보기</button>
                <button className="btn" onClick={downloadJson}>결과 JSON 내려받기</button>
              </div>
            </section>
            {checks.length > 0 && (
              <section className="section">
                <h2 style={{ fontSize: 16 }}>이 사례의 검증 기준</h2>
                <ul className="check-list card">
                  {checks.map((c) => (
                    <li key={c.label}><span className={c.pass ? "ok" : "fail"}>{c.pass ? "통과" : "실패"}</span> {c.label} <span className="muted small">({c.detail})</span></li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
        {tab === "compare" && <GapCompare data={data} s={s} />}
        {tab === "trace" && (
          <>
            <CoverageMatrix data={data} s={s} />
            <TraceTable data={data} s={s} />
            <SafetyTrace data={data} s={s} />
          </>
        )}
        {tab === "blocks" && <BlockDiagram data={data} status={s.status} />}
        {tab === "tests" && <TestTable data={data} s={s} />}
      </TabPanel>

      <div className="actions">
        <Link className="btn" href="/plan">← 시험 계획 고치기</Link>
        <Link className="btn" href="/system">← 분석 전제 고치기</Link>
      </div>

      <DetailPanel data={data} s={s} id={detail} onClose={closeDetail} />
    </DetailProvider>
  );
}
