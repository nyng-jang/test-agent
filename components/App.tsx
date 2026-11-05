"use client";

import { useEffect, useState } from "react";
import type { CaseData } from "@/lib/types";
import { summary } from "@/lib/analysis";
import { runChecks } from "@/lib/checks";
import CaseView from "./CaseView";
import LiveView from "./LiveView";

export default function App({ cases }: { cases: CaseData[] }) {
  const [tab, setTab] = useState(cases[0].id);

  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (h && (h === "live" || cases.some((c) => c.id === h))) setTab(h);
  }, [cases]);

  const select = (id: string) => {
    setTab(id);
    history.replaceState(null, "", `#${id}`);
  };

  const checks = runChecks(cases);
  const current = cases.find((c) => c.id === tab);

  return (
    <>
      <header className="wrap hero">
        <h1>시험항목 누락 탐지 에이전트</h1>
        <p className="lead">
          엔지니어가 짠 시험 계획을 넣으면, 시스템 설명을 바탕으로 시험 항목을 환경·기능·통신·고장·오작동 다섯 갈래로 펼쳐 놓고 <b>계획에서 빠진 조건</b>을 표시합니다. 시험을 대신 설계하는 도구가 아니라, 사람이 짠 계획의 빈틈을 잡는 보조 도구입니다.
        </p>
        <div className="story">
          <b>만든 이유.</b> 자율주행 대회를 준비하며 시험을 주로 야간에 했고, 주간 직사광선 조건은 검증하지 못했습니다. 대회 당일 낮에 차선 인식 오류가 났습니다. 시험 조건 하나가 빠지면 그대로 실패로 이어진다는 걸 겪고 이 도구를 만들었습니다.
        </div>
        <details className="small" style={{ marginTop: 12, maxWidth: 760 }}>
          <summary>검증 기준 통과 여부 ({checks.filter((c) => c.pass).length}/{checks.length})</summary>
          <ul className="check-list" style={{ marginTop: 6 }}>
            {checks.map((c) => (
              <li key={c.label}>
                <span className={c.pass ? "ok" : "fail"}>{c.pass ? "통과" : "실패"}</span> {c.label} <span className="muted">({c.detail})</span>
              </li>
            ))}
          </ul>
        </details>
      </header>

      <main className="wrap">
        <nav className="tabs" role="tablist">
          {cases.map((c) => {
            const s = summary(c);
            return (
              <button key={c.id} role="tab" className="tab" aria-selected={tab === c.id} onClick={() => select(c.id)}>
                {c.tab}
                <span className="badge" style={{ color: "var(--gap)" }}>누락 {s.missingCount}</span>
              </button>
            );
          })}
          <button role="tab" className="tab" aria-selected={tab === "live"} onClick={() => select("live")}>직접 해보기</button>
        </nav>

        {current && (
          <>
            <div className="section" style={{ marginBottom: 0 }}>
              <h2 style={{ fontSize: 22 }}>{current.name}</h2>
              <p className="muted" style={{ margin: "4px 0 0" }}>{current.summary} <span className="small">· 데모 모드: 미리 생성해 둔 결과</span></p>
            </div>
            <CaseView key={current.id} data={current} />
          </>
        )}
        {tab === "live" && <LiveView />}
      </main>

      <footer className="wrap">
        카테고리는 일반적인 시험 분류(환경 / 기능 / 통신 / 고장·Fail-safe / 오작동)로 구성했고, 규격 원문은 인용하지 않았습니다. 기능안전 부분은 ISO 26262의 HARA·ASIL 개념을 자작 시스템에 적용해 본 것이며, 규격을 준수했다는 의미가 아닙니다. 시험 수치는 예시 값입니다.
      </footer>
    </>
  );
}
