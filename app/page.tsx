"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFlow } from "@/lib/flow";
import { listModels, pickDefault, PROVIDER_LABEL, type Provider } from "@/lib/llm";

const KEY_HELP: Record<Provider, { url: string; label: string; ph: string }> = {
  claude: { url: "https://console.anthropic.com/settings/keys", label: "Anthropic Console", ph: "sk-ant-…" },
  gemini: { url: "https://aistudio.google.com/apikey", label: "Google AI Studio", ph: "AIza…" },
};

export default function StartPage() {
  const { ready, mode, startLive, startShowcase } = useFlow();
  const router = useRouter();
  const [provider, setProvider] = useState<Provider>("gemini");
  const [key, setKey] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const changeProvider = (p: Provider) => { setProvider(p); setModels([]); setModel(""); setErr(""); };

  // 1) 키 확인: 모델 목록 조회(토큰을 쓰지 않음) → 2) 모델 고르고 시작
  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const list = await listModels(provider, key.trim());
      if (!list.length) throw new Error("이 키로 쓸 수 있는 모델이 없습니다.");
      setModels(list);
      setModel(pickDefault(provider, list));
    } catch (e: any) {
      setErr(e?.message?.includes("Failed to fetch") ? "API에 연결하지 못했습니다. 네트워크나 키를 확인해 주세요." : e.message);
    } finally {
      setBusy(false);
    }
  };

  const start = () => {
    startLive({ provider, key: key.trim(), model });
    router.push("/system");
  };

  const showcase = () => {
    startShowcase();
    router.push("/system");
  };

  return (
    <main className="wrap login">
      <div className="hero">
        <img src="/logo.png" alt="" className="hero-logo" width={64} height={64} />
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

      {ready && mode && (
        <div className="notice" style={{ marginBottom: 14, maxWidth: 760 }}>
          진행 중인 작업이 있습니다. <button className="btn" style={{ marginLeft: 8 }} onClick={() => router.push("/system")}>이어서 하기</button>
        </div>
      )}
      <div className="grid2" style={{ marginBottom: 40 }}>
        <form className="card" onSubmit={check}>
          <h2 style={{ fontSize: 17 }}>내 API 키로 분석</h2>
          <p className="small muted" style={{ margin: "4px 0 0" }}>
            아무 시스템이나 AI로 실제 분석합니다. 호출 비용은 키 주인에게 청구됩니다.
          </p>
          <div className="seg" role="radiogroup" aria-label="AI 제공사" style={{ marginTop: 12 }}>
            {(["gemini", "claude"] as Provider[]).map((p) => (
              <button key={p} type="button" role="radio" aria-checked={provider === p} aria-pressed={provider === p} className="btn" onClick={() => changeProvider(p)}>
                {PROVIDER_LABEL[p]}
              </button>
            ))}
          </div>
          <label className="f" htmlFor="key">{PROVIDER_LABEL[provider]} API 키</label>
          <input id="key" type="password" value={key} placeholder={KEY_HELP[provider].ph} autoComplete="off" spellCheck={false}
            onChange={(e) => { setKey(e.target.value); setModels([]); setModel(""); }} />
          <div className="small muted" style={{ marginTop: 4 }}>
            키 발급: <a href={KEY_HELP[provider].url} target="_blank" rel="noreferrer">{KEY_HELP[provider].label}</a>
          </div>
          {models.length === 0 ? (
            <button className="btn primary lg" style={{ marginTop: 14, width: "100%" }} disabled={busy || key.trim().length < 10}>
              {busy ? "키 확인 중…" : "키 확인"}
            </button>
          ) : (
            <>
              <div className="notice" style={{ marginTop: 12 }}>키를 확인했습니다. 쓸 수 있는 모델 {models.length}개.</div>
              <label className="f" htmlFor="model">모델</label>
              <select id="model" value={model} onChange={(e) => setModel(e.target.value)} style={{ width: "100%" }}>
                {models.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <button type="button" className="btn primary lg" style={{ marginTop: 14, width: "100%" }} disabled={!model} onClick={start}>
                이 키로 시작
              </button>
            </>
          )}
          {err && <div className="notice err" style={{ marginTop: 12 }}>{err}</div>}
          <ul className="small muted keynote">
            <li>키는 이 브라우저 탭에만 저장되고, 탭을 닫으면 지워집니다.</li>
            <li>키는 이 사이트의 서버로 보내지 않습니다. 브라우저에서 {PROVIDER_LABEL[provider]} API로 바로 요청합니다.</li>
            <li>한 번 끝까지 분석하면 AI를 2번 호출합니다 (시스템 분석 1번 + 누락 탐지 1번).</li>
          </ul>
        </form>
        <div className="card">
          <h2 style={{ fontSize: 17 }}>키 없이 체험</h2>
          <p className="small muted" style={{ margin: "4px 0 12px" }}>
            자율주행 대회 차량, 무선 E-stop, 디지털 사이드미러 3개 사례로 1~3단계 전체를 그대로 따라가 볼 수 있습니다. 분석 결과는 미리 검증해 둔 사례 데이터로 재현합니다.
          </p>
          <button className="btn lg" onClick={showcase}>키 없이 체험하기</button>
        </div>
      </div>
    </main>
  );
}
