"use client";

import { useEffect, useState } from "react";

/** AI 응답을 기다리는 동안 경과 시간과 예상 단계를 보여준다. 단계는 시간 기준 예상치다. */
export function AiProgress({ steps, typical }: { steps: string[]; typical: number }) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const per = typical / steps.length;
  const cur = Math.min(steps.length - 1, Math.floor(sec / per));
  return (
    <div className="progress" role="status" aria-live="polite">
      <div className="progress-head">
        <span className="loading">{steps[cur]}</span>
        <span className="small muted">{sec}초 경과 · 보통 {typical}초 안팎</span>
      </div>
      <div className="bar"><div style={{ width: `${Math.min(95, (sec / typical) * 100)}%` }} /></div>
      <ol className="progress-steps small">
        {steps.map((s, i) => (
          <li key={s} className={i < cur ? "done" : i === cur ? "cur" : ""}>{s}</li>
        ))}
      </ol>
      {sec > typical * 1.5 && <div className="small muted">예상보다 오래 걸리고 있습니다. 창을 닫지 말고 조금 더 기다려 주세요.</div>}
    </div>
  );
}
