"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { flowPremises, gapKeyOf, useFlow } from "@/lib/flow";
import { PROVIDER_LABEL } from "@/lib/llm";

export function useStepState() {
  const { flow } = useFlow();
  const analysisOk = !!flow.analysis && flow.analyzedInput === flow.systemInput;
  const gapOk = analysisOk && !!flow.gap && flow.gapKey === gapKeyOf(flow.analysis, flow.planLines, flowPremises(flow));
  return { analysisOk, gapOk };
}

export default function Shell({ step, children }: { step: 1 | 2 | 3; children: React.ReactNode }) {
  const { ready, mode, llm, logout } = useFlow();
  const { analysisOk, gapOk } = useStepState();
  const router = useRouter();

  useEffect(() => {
    if (ready && !mode) router.replace("/");
  }, [ready, mode, router]);

  if (!ready || !mode) return <div className="wrap" style={{ padding: 40 }}><span className="muted">불러오는 중…</span></div>;

  const steps = [
    { n: 1, label: "시스템 입력", href: "/system", on: true },
    { n: 2, label: "시험 계획", href: "/plan", on: analysisOk },
    { n: 3, label: "분석 결과", href: "/result", on: gapOk },
  ];

  return (
    <>
      <a href="#main" className="skip">본문으로 건너뛰기</a>
      <header className="topbar">
        <div className="wrap topbar-in">
          <Link href="/" className="brand"><span className="brand-mark" aria-hidden="true">✓</span><span>시험항목 누락 탐지 에이전트</span></Link>
          <nav className="steps" aria-label="단계">
            {steps.map((s) =>
              s.on ? (
                <Link key={s.n} href={s.href} className={`step ${step === s.n ? "cur" : ""}`} aria-current={step === s.n ? "step" : undefined}>
                  <span className="num">{s.n}</span><span className="lbl">{s.label}</span>
                </Link>
              ) : (
                <span key={s.n} className="step off" aria-disabled="true" title="이전 단계를 먼저 마쳐 주세요"><span className="num">{s.n}</span><span className="lbl">{s.label}</span></span>
              ),
            )}
          </nav>
          <div className="who">
            {mode === "live" && llm ? (
              <span className="small muted" title={llm.model}>{PROVIDER_LABEL[llm.provider]} · 내 키</span>
            ) : (
              <span className="pill none">키 없이 체험</span>
            )}
            <button className="btn" onClick={() => { logout(); router.replace("/"); }}>
              {mode === "live" ? "키 지우고 나가기" : "나가기"}
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="wrap"><div className="workflow-panel">{children}</div></main>
      <footer className="wrap">
        {mode === "showcase"
          ? <>키 없이 체험: 분석 결과는 미리 검증해 둔 3개 사례 데이터로 재현합니다. 다른 시스템을 분석하려면 첫 화면에서 내 API 키를 넣어 주세요. </>
          : <>API 키는 이 브라우저 탭에만 저장되고 이 사이트의 서버로 보내지 않습니다. 탭을 닫으면 지워집니다. </>}
        카테고리는 일반적인 시험 분류(환경 / 기능 / 통신 / 고장·Fail-safe / 오작동)로 구성했고 규격 원문은 인용하지 않았습니다. 기능안전 부분은 ISO 26262의 HARA·ASIL 개념을 자작 시스템에 적용해 본 것이며 규격 준수를 뜻하지 않습니다. 시험 수치는 예시 값입니다.
      </footer>
    </>
  );
}

export function StepHead({ n, title, desc }: { n: number; title: string; desc: React.ReactNode }) {
  return (
    <div className="step-head">
      <div className="step-eyebrow"><span>STEP 0{n}</span><span className="eyebrow-line" /><span>시험항목 누락 탐지</span></div>
      <h1>{title}</h1>
      <p className="muted">{desc}</p>
    </div>
  );
}
