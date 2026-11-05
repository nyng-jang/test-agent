// Claude API 호출은 서버(API route)에서만 한다.
export async function callClaudeJson(system: string, user: string, maxTokens: number): Promise<any> {
  const res = await fetch(`${process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com"}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const err = new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`) as Error & { upstream?: boolean };
    err.upstream = true;
    throw err;
  }
  const data = await res.json();
  const text: string = (data?.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no json in response");
  return JSON.parse(text.slice(start, end + 1));
}
