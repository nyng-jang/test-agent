"use client";

import { useEffect, useState } from "react";
import type { CaseData } from "@/lib/types";
import CaseView from "./CaseView";

export default function LiveView() {
  const [status, setStatus] = useState<{ enabled: boolean; remaining: number } | null>(null);
  const [systemInput, setSystemInput] = useState("");
  const [plan, setPlan] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CaseData | null>(null);

  useEffect(() => {
    fetch("/api/generate").then((r) => r.json()).then(setStatus).catch(() => setStatus({ enabled: false, remaining: 0 }));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ systemInput, plan: plan.split("\n"), password }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "오류가 났습니다.");
      setResult(j.case);
      setStatus((s) => (s ? { ...s, remaining: j.remaining } : s));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const off = status && !status.enabled;

  return (
    <div>
      <section className="section">
        <h2>직접 해보기 (실시간 생성)</h2>
        <p className="desc">
          공개 사이트라 비용을 막기 위해 실시간 생성은 비밀번호와 하루 호출 횟수 제한을 걸어 두었습니다. 위 3개 탭은 미리 생성해 둔 결과라 누구나 볼 수 있습니다.
        </p>
        <form className="card" onSubmit={submit}>
          {off && <div className="notice">현재 실시간 생성은 꺼져 있습니다. 데모 사례 탭을 확인해 주세요.</div>}
          {status?.enabled && <div className="notice">오늘 남은 실시간 생성 횟수: {status.remaining}회</div>}
          <label className="f" htmlFor="sys">시스템 설명</label>
          <textarea id="sys" value={systemInput} onChange={(e) => setSystemInput(e.target.value)} maxLength={3000}
            placeholder="예: 전동식 조향장치(EPS). 토크 센서와 조향각 센서 신호로 ECU가 BLDC 모터 보조 토크를 만든다. CAN으로 차속을 받는다…" />
          <label className="f" htmlFor="plan">내 시험 계획 (한 줄에 하나, 선택)</label>
          <textarea id="plan" value={plan} onChange={(e) => setPlan(e.target.value)}
            placeholder={"차속별 보조력 확인\n상온에서 응답 지연 측정\n토크 센서 1채널 단선"} />
          <label className="f" htmlFor="pw">비밀번호</label>
          <input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
          <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
            <button className="btn primary" disabled={loading || !!off}>{loading ? "생성 중… (최대 1~2분)" : "시험 항목 생성 + 누락 탐지"}</button>
          </div>
          {error && <div className="notice err" style={{ marginTop: 12 }}>{error}</div>}
        </form>
      </section>
      {result && <CaseView data={result} />}
    </div>
  );
}
