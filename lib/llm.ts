// 사용자가 넣은 API 키로 브라우저에서 Claude·Gemini를 직접 호출한다.
// 키는 이 사이트의 서버를 거치지 않는다 (next.config.ts의 CSP로 전송 가능한 곳도 두 API로 제한).
export type Provider = "claude" | "gemini";
export interface LlmConfig { provider: Provider; key: string; model: string }

export const PROVIDER_LABEL: Record<Provider, string> = { claude: "Claude", gemini: "Gemini" };

const CLAUDE = "https://api.anthropic.com/v1";
const GEMINI = "https://generativelanguage.googleapis.com/v1beta";

const claudeHeaders = (key: string) => ({
  "content-type": "application/json",
  "x-api-key": key,
  "anthropic-version": "2023-06-01",
  // 사용자가 자기 키를 직접 넣는 구조라 브라우저 직접 호출을 허용한다
  "anthropic-dangerous-direct-browser-access": "true",
});

async function errorText(res: Response) {
  try {
    const j = await res.json();
    return j?.error?.message || j?.error?.status || `${res.status}`;
  } catch {
    return `${res.status}`;
  }
}

function friendly(provider: Provider, status: number, msg: string) {
  if (status === 401 || status === 403 || /api key|invalid|permission/i.test(msg)) return `${PROVIDER_LABEL[provider]} API 키가 올바르지 않거나 권한이 없습니다.`;
  if (status === 429) return `${PROVIDER_LABEL[provider]} 호출 한도를 넘었습니다. 잠시 후 다시 시도해 주세요.`;
  if (status === 404) return `선택한 모델을 쓸 수 없습니다. 첫 화면에서 다른 모델을 골라 주세요.`;
  return `${PROVIDER_LABEL[provider]} 호출 중 오류가 났습니다 (${msg}).`;
}

/** 키 확인 + 쓸 수 있는 모델 목록. 모델 목록 조회는 토큰을 쓰지 않는다. */
export async function listModels(provider: Provider, key: string): Promise<string[]> {
  const res = provider === "claude"
    ? await fetch(`${CLAUDE}/models?limit=100`, { headers: claudeHeaders(key) })
    : await fetch(`${GEMINI}/models?pageSize=200`, { headers: { "x-goog-api-key": key } });
  if (!res.ok) throw new Error(friendly(provider, res.status, await errorText(res)));
  const j = await res.json();
  if (provider === "claude") return (j?.data ?? []).map((m: any) => String(m.id));
  return (j?.models ?? [])
    .filter((m: any) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
    .map((m: any) => String(m.name).replace(/^models\//, ""))
    .filter((n: string) => n.startsWith("gemini") && !/embed|image|tts|audio|live|vision/i.test(n));
}

/** 목록에서 기본 모델 고르기: Claude는 Sonnet, Gemini는 Flash(미리보기·실험 제외) 중 첫 번째 */
export function pickDefault(provider: Provider, models: string[]) {
  const stable = models.filter((m) => !/preview|exp|experimental/i.test(m));
  const want = provider === "claude" ? /sonnet/i : /flash(?!-lite)/i;
  const sorted = (xs: string[]) => [...xs].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  return (provider === "claude" ? stable.find((m) => want.test(m)) : sorted(stable.filter((m) => want.test(m)))[0])
    ?? stable[0] ?? models[0] ?? "";
}

function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI 응답에서 결과를 찾지 못했습니다. 다시 시도해 주세요.");
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error("AI 응답 형식이 올바르지 않습니다. 다시 시도해 주세요.");
  }
}

export async function callJson(cfg: LlmConfig, system: string, user: string, maxTokens: number): Promise<any> {
  if (cfg.provider === "claude") {
    const res = await fetch(`${CLAUDE}/messages`, {
      method: "POST",
      headers: claudeHeaders(cfg.key),
      body: JSON.stringify({ model: cfg.model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    });
    if (!res.ok) throw new Error(friendly("claude", res.status, await errorText(res)));
    const j = await res.json();
    return extractJson((j?.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join(""));
  }
  const res = await fetch(`${GEMINI}/models/${encodeURIComponent(cfg.model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": cfg.key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: maxTokens },
    }),
  });
  if (!res.ok) throw new Error(friendly("gemini", res.status, await errorText(res)));
  const j = await res.json();
  const text = (j?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
  if (!text) throw new Error("Gemini가 빈 응답을 돌려줬습니다. 다시 시도해 주세요.");
  return extractJson(text);
}
