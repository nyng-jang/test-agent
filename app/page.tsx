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
    <main className="auth">
      <section className="auth-product" aria-labelledby="product-name">
        <div className="auth-brand">
          <span className="auth-logo"><img src="/logo.png" alt="" width={22} height={22} /></span>
          <span>TEST AGENT</span>
        </div>
        <div className="auth-intro">
          <h1 id="product-name">Test Plan Analyzer</h1>
          <p>
            시스템 설명과 직접 짠 시험 계획을 넣으면, 시험 항목을 환경·기능·통신·고장·오작동으로 나눠 펼치고
            계획에서 빠졌거나 일부만 반영된 조건을 위험도 순으로 보여줍니다.
          </p>
        </div>
        <LoginPreview />
      </section>

      <section className="auth-panel" aria-labelledby="login-title">
        <div className="auth-box">
          <div className="auth-brand auth-brand-m" aria-hidden>
            <span className="auth-logo"><img src="/logo.png" alt="" width={22} height={22} /></span>
            <span>TEST AGENT · Test Plan Analyzer</span>
          </div>
          <h2 id="login-title">로그인</h2>
          <p className="auth-sub">사용할 AI의 API 키로 로그인합니다.</p>

          {ready && mode && (
            <div className="notice auth-resume">
              진행 중인 작업이 있습니다.
              <button type="button" className="btn" onClick={() => router.push("/system")}>이어서 하기</button>
            </div>
          )}

          <form onSubmit={check}>
            <label className="f" id="provider-label">AI 제공사</label>
            <div className="auth-seg" role="radiogroup" aria-labelledby="provider-label">
              {(["gemini", "claude"] as Provider[]).map((p) => (
                <button key={p} type="button" role="radio" aria-checked={provider === p} className={provider === p ? "on" : ""} onClick={() => changeProvider(p)}>
                  {PROVIDER_LABEL[p]}
                </button>
              ))}
            </div>
            <div className="auth-row">
              <label className="f" htmlFor="key">API 키</label>
              <a className="small" href={KEY_HELP[provider].url} target="_blank" rel="noreferrer">키 발급받기</a>
            </div>
            <input id="key" type="password" value={key} placeholder={KEY_HELP[provider].ph} autoComplete="off" spellCheck={false}
              onChange={(e) => { setKey(e.target.value); setModels([]); setModel(""); }} />
            {models.length === 0 ? (
              <button className="btn primary lg auth-submit" disabled={busy || key.trim().length < 10}>
                {busy ? "키 확인 중…" : "키 확인"}
              </button>
            ) : (
              <>
                <div className="auth-ok">키를 확인했습니다. 쓸 수 있는 모델 {models.length}개</div>
                <label className="f" htmlFor="model">모델</label>
                <select id="model" value={model} onChange={(e) => setModel(e.target.value)} style={{ width: "100%" }}>
                  {models.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <button type="button" className="btn primary lg auth-submit" disabled={!model} onClick={start}>로그인</button>
              </>
            )}
            {err && <div className="notice err" style={{ marginTop: 12 }}>{err}</div>}
          </form>

          <div className="auth-or"><span>또는</span></div>
          <button type="button" className="btn lg auth-alt" onClick={showcase}>키 없이 체험하기</button>
          <p className="auth-note">예시 사례 3개(자율주행 대회 차량, 무선 E-stop, 디지털 사이드미러)로 전체 과정을 따라갑니다.</p>

          <ul className="auth-fine">
            <li>키는 이 브라우저 탭에만 저장되고, 탭을 닫으면 지워집니다.</li>
            <li>키는 이 사이트 서버로 보내지 않고, 브라우저에서 {PROVIDER_LABEL[provider]} API로 바로 요청합니다.</li>
            <li>분석 한 번에 AI를 2번 호출하며, 비용은 키 주인에게 청구됩니다.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
