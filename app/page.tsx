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
  const [keyOpen, setKeyOpen] = useState(false);

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

  const openKey = () => {
    setKeyOpen(true);
    setTimeout(() => document.getElementById("start")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  return (
    <div className="home">
      <header className="home-top">
        <span className="home-brand"><img src="/logo.png" alt="" width={26} height={26} /><b>Test Agent</b></span>
        <nav className="home-nav" aria-label="첫 화면 메뉴">
          <a href="#intro">서비스 소개</a>
          <a href="#guide">사용 가이드</a>
          <button type="button" className="home-btn sm" onClick={showcase}>시작하기 <span aria-hidden>→</span></button>
        </nav>
      </header>

      <main>
        <section className="home-hero" aria-labelledby="hero-title">
          <div className="home-hero-in">
            <div className="home-copy">
              <span className="home-pill">엔지니어가 짠 시험 계획에서 빠진 조건을 찾아주는 도구</span>
              <h1 id="hero-title">시험 계획,<br />이제는 <em>더 꼼꼼하게!</em></h1>
              <p className="home-lead">AI가 시스템 설명과 내 시험 계획을 대조해,<br />놓치기 쉬운 시험 조건과 위험을 찾아 줍니다.</p>
            </div>
            <HeroArt />
          </div>

          <ol className="home-steps" id="guide" aria-label="사용 흐름">
            {[
              { t: "시스템 설명 넣기", d: "시험할 시스템을 간단히 소개해요" },
              { t: "내 시험 계획 넣기", d: "이미 짠 시험 항목·조건을 붙여 넣어요" },
              { t: "빠진 시험 확인", d: "놓친 조건과 위험을 우선순위로 확인해요" },
            ].map((x, i) => (
              <li key={x.t}><span className="n">{i + 1}</span><b>{x.t}</b><span>{x.d}</span></li>
            ))}
          </ol>

          <div className="home-story">
            <span className="home-story-ic" aria-hidden>💡</span>
            <div>
              <b>이런 경험, 있으셨나요?</b>
              <p>자율주행 대회를 준비하며 야간 위주로 시험했다가, 주간 직사광선 조건을 놓쳐 대회 당일 차선 인식 오류가 났던 경험에서 시작했어요.</p>
            </div>
          </div>

          <div className="home-cta">
            {ready && mode && (
              <button type="button" className="home-btn ghost" onClick={() => router.push("/system")}>진행 중인 작업 이어서 하기</button>
            )}
            <button type="button" className="home-btn lg" onClick={showcase}>키 없이 체험하기 <span aria-hidden>→</span></button>
            <button type="button" className="home-btn ghost lg" onClick={openKey}>내 API 키로 시작</button>
          </div>
          <p className="home-cta-note">키 없이 체험은 미리 분석해 둔 사례 3개(자율주행 대회 차량, 무선 E-stop, 디지털 사이드미러)로 전 과정을 보여 줍니다.</p>
        </section>

        {keyOpen && (
          <section className="home-key" id="start" aria-labelledby="key-title">
            <h2 id="key-title">내 API 키로 시작</h2>
            <p className="auth-hint" style={{ marginTop: 6 }}>
              본인 AI API 키로 내 시스템을 직접 분석합니다. 키가 없나요? <a href={KEY_HELP[provider].url} target="_blank" rel="noreferrer">{KEY_HELP[provider].label}에서 발급</a>
            </p>
            <div className="auth-seg row" role="radiogroup" aria-label="AI 제공사">
              {(["gemini", "claude"] as Provider[]).map((p) => (
                <button key={p} type="button" role="radio" aria-checked={provider === p} className={provider === p ? "on" : ""} onClick={() => { changeProvider(p); document.getElementById("key")?.focus(); }}>
                  {PROVIDER_LABEL[p]}
                </button>
              ))}
            </div>
            <form onSubmit={check} className="auth-form">
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
                <button className="home-btn lg full" disabled={busy || key.trim().length < 10}>{busy ? "키 확인 중…" : "키 확인"}</button>
              ) : (
                <button type="button" className="home-btn lg full" disabled={!model} onClick={start}>분석 시작 <span aria-hidden>→</span></button>
              )}
            </form>
          </section>
        )}

        <section className="home-preview" id="intro" aria-labelledby="intro-title">
          <h2 id="intro-title">시스템 분석부터 시험 계획 대조까지</h2>
          <p>
            시스템 설명을 넣으면 구성 블록·요구사항·위험과 안전 목표를 정리하고, 필요한 시험을 환경·기능·통신·고장·오작동으로 나눠 제안합니다.
            내 시험 계획과 대조해 빠졌거나 일부만 반영된 시험을 우선순위 순으로 보여 줍니다. 아래는 자율주행 대회 차량 사례의 실제 결과 화면입니다.
          </p>
          <LoginPreview />
        </section>
      </main>
    </div>
  );
}

/** 히어로 그림: 체크리스트 + 돋보기 + 경고 표시 (인라인 SVG, 외부 이미지 없음) */
function HeroArt() {
  return (
    <svg className="home-art" viewBox="0 0 360 300" role="img" aria-label="체크리스트를 돋보기로 살펴보며 빠진 항목을 찾는 그림">
      <defs>
        <linearGradient id="ha-card" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#e8efff" /></linearGradient>
        <linearGradient id="ha-lens" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#dbe7ff" stopOpacity=".9" /><stop offset="1" stopColor="#a9c3ff" stopOpacity=".55" /></linearGradient>
      </defs>
      <rect x="40" y="26" width="200" height="248" rx="18" fill="url(#ha-card)" stroke="#c9d7f5" strokeWidth="2" transform="rotate(-6 140 150)" />
      <g transform="rotate(-6 140 150)">
        {[0, 1, 2, 3].map((i) => (
          <g key={i} transform={`translate(66 ${70 + i * 46})`}>
            <rect width="24" height="24" rx="6" fill={i === 2 ? "#fff" : "#2f6bed"} stroke={i === 2 ? "#f2a33a" : "none"} strokeWidth="2.5" strokeDasharray={i === 2 ? "4 3" : undefined} />
            {i !== 2 && <path d="M6 12.5l4 4 8-9" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
            <rect x="36" y="4" width={i === 2 ? 80 : 110} height="7" rx="3.5" fill={i === 2 ? "#f6d3a0" : "#c6d5f3"} />
            <rect x="36" y="15" width="70" height="5" rx="2.5" fill="#dde6f7" />
          </g>
        ))}
      </g>
      <g transform="translate(200 140)">
        <circle cx="50" cy="50" r="52" fill="url(#ha-lens)" stroke="#2f6bed" strokeWidth="12" />
        <rect x="88" y="92" width="22" height="70" rx="11" fill="#1f3a63" transform="rotate(-45 99 127)" />
      </g>
      <g transform="translate(262 30)">
        <path d="M30 4l28 50H2z" fill="#f6b23e" stroke="#e08a12" strokeWidth="3" strokeLinejoin="round" />
        <rect x="27" y="20" width="6" height="18" rx="3" fill="#fff" />
        <circle cx="30" cy="45" r="3.5" fill="#fff" />
      </g>
    </svg>
  );
}
