"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFlow } from "@/lib/flow";
import { listModels, pickDefault, PROVIDER_LABEL, type Provider } from "@/lib/llm";
import LoginPreview from "@/components/LoginPreview";

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
    <div className="auth">
      <header className="auth-top">
        <span className="auth-brand">
          <img src="/logo.png" alt="" width={26} height={26} />
          <span><b>TEST AGENT</b><small>Test Plan Analyzer</small></span>
        </span>
      </header>

      <main className="auth-grid">
        <section className="auth-panel" aria-labelledby="login-title">
          <h1 id="login-title">로그인</h1>
          <p className="auth-sub">
            API 키가 없나요? <a href={KEY_HELP[provider].url} target="_blank" rel="noreferrer">{KEY_HELP[provider].label}에서 발급</a>
          </p>

          {ready && mode && (
            <div className="notice auth-resume">
              진행 중인 작업이 있습니다.
              <button type="button" className="btn" onClick={() => router.push("/system")}>이어서 하기</button>
            </div>
          )}

          <div className="auth-seg" role="radiogroup" aria-label="AI 제공사">
            {(["gemini", "claude"] as Provider[]).map((p) => (
              <button key={p} type="button" role="radio" aria-checked={provider === p} className={provider === p ? "on" : ""} onClick={() => { changeProvider(p); document.getElementById("key")?.focus(); }}>
                {PROVIDER_LABEL[p]}로 로그인
              </button>
            ))}
          </div>

          <div className="auth-or"><span>또는, 키 없이 둘러보기</span></div>
          <button type="button" className="auth-alt" onClick={showcase}>키 없이 체험하기</button>

          <form onSubmit={check} className="auth-form">
            <div className="auth-divider" />
            <label className="f" htmlFor="key">{PROVIDER_LABEL[provider]} API 키</label>
            <input id="key" type="password" value={key} placeholder={KEY_HELP[provider].ph} autoComplete="off" spellCheck={false}
              onChange={(e) => { setKey(e.target.value); setModels([]); setModel(""); }} />
            {models.length > 0 && (
              <>
                <label className="f" htmlFor="model">모델</label>
                <select id="model" value={model} onChange={(e) => setModel(e.target.value)}>
                  {models.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <div className="auth-ok">키를 확인했습니다. 쓸 수 있는 모델 {models.length}개</div>
              </>
            )}
            <p className="auth-hint">키는 이 탭에만 저장되고 서버로 보내지 않습니다. 분석 한 번에 AI를 2번 호출하며 비용은 키 주인에게 청구됩니다.</p>
            {err && <div className="notice err" style={{ marginTop: 12 }}>{err}</div>}
            {models.length === 0 ? (
              <button className="auth-submit" disabled={busy || key.trim().length < 10}>{busy ? "키 확인 중…" : "키 확인"}</button>
            ) : (
              <button type="button" className="auth-submit" disabled={!model} onClick={start}>로그인</button>
            )}
          </form>
        </section>

        <section className="auth-showcase" aria-labelledby="showcase-title">
          <LoginPreview />
          <h2 id="showcase-title">야간 시험만 한 계획에서, 빠진 직사광선 시험을 찾습니다</h2>
          <p>
            시스템 설명을 넣으면 구성 블록·요구사항·위험을 정리하고, 내가 짠 시험 계획과 대조해
            환경·기능·통신·고장·오작동 중 빠졌거나 일부만 반영된 시험을 위험도 순으로 보여줍니다.
          </p>
        </section>
      </main>
    </div>
  );
}
