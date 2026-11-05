"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFlow } from "@/lib/flow";

export default function LoginPage() {
  const { ready, session, mode, flow, refreshSession, enterGuest, loadDemo } = useFlow();
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "로그인하지 못했습니다.");
      await refreshSession();
      router.push("/system");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const guest = () => {
    enterGuest();
    if (!flow.demoId) loadDemo("av");
    router.push("/system");
  };

  const liveOn = session?.liveEnabled;

  return (
    <main className="wrap login">
      <div className="hero">
        <h1>시험항목 누락 탐지 에이전트</h1>
        <p className="lead">
          시스템 설명과 내가 짠 시험 계획을 넣으면, 시험 항목을 환경·기능·통신·고장·오작동 다섯 갈래로 펼쳐 놓고 <b>계획에서 빠진 조건</b>을 알려줍니다. 시험을 대신 설계하는 도구가 아니라, 사람이 짠 계획의 빈틈을 잡는 보조 도구입니다.
        </p>
        <div className="story">
          <b>만든 이유.</b> 자율주행 대회를 준비하며 시험을 주로 야간에 했고, 주간 직사광선 조건은 검증하지 못했습니다. 대회 당일 낮에 차선 인식 오류가 났습니다. 시험 조건 하나가 빠지면 그대로 실패로 이어진다는 걸 겪고 만들었습니다.
        </div>
        <ol className="how small muted">
          <li><b>시스템 입력</b> AI가 구성 블록·요구사항·위험을 분석하고, 빠진 정보는 질문합니다.</li>
          <li><b>내 시험 계획</b> 한 줄씩 쓰거나 CSV·JSON·Excel 파일로 불러옵니다.</li>
          <li><b>결과</b> 보완이 필요한 시험 항목을 위험도 순으로 보여줍니다.</li>
        </ol>
      </div>

      <div className="grid2" style={{ marginBottom: 40 }}>
        <form className="card" onSubmit={login}>
          <h2 style={{ fontSize: 17 }}>로그인</h2>
          <p className="small muted" style={{ margin: "4px 0 0" }}>AI로 내 시스템을 직접 분석하려면 로그인하세요. 비용 때문에 비밀번호와 하루 호출 횟수 제한이 있습니다.</p>
          {mode === "live" ? (
            <div style={{ marginTop: 14 }}>
              <div className="notice">이미 로그인되어 있습니다.</div>
              <button type="button" className="btn primary" style={{ marginTop: 10 }} onClick={() => router.push("/system")}>이어서 하기</button>
            </div>
          ) : (
            <>
              <label className="f" htmlFor="pw">비밀번호</label>
              <input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" disabled={ready && !liveOn} />
              <button className="btn primary" style={{ marginTop: 12 }} disabled={busy || !pw || (ready && !liveOn)}>{busy ? "확인 중…" : "로그인"}</button>
              {ready && !liveOn && <div className="notice" style={{ marginTop: 12 }}>지금은 AI 기능이 꺼져 있습니다. 데모로 둘러보세요.</div>}
              {err && <div className="notice err" style={{ marginTop: 12 }}>{err}</div>}
            </>
          )}
        </form>
        <div className="card">
          <h2 style={{ fontSize: 17 }}>로그인 없이 데모 둘러보기</h2>
          <p className="small muted" style={{ margin: "4px 0 12px" }}>
            자율주행 대회 차량, 무선 E-stop, 디지털 사이드미러 3개 사례를 미리 분석해 둔 결과로 같은 흐름을 따라가 볼 수 있습니다. AI를 호출하지 않습니다.
          </p>
          <button className="btn" onClick={guest}>데모 시작</button>
        </div>
      </div>
    </main>
  );
}
