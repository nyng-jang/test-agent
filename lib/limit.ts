// 하루 횟수 제한. 서버리스 인스턴스 메모리에 두므로 인스턴스가 여러 개면 각각 따로 센다(최선 노력).
// 확실한 비용 상한은 Anthropic 콘솔의 사용 한도로 건다.
type Bucket = { day: string; total: number; perIp: Map<string, number> };
const g = globalThis as unknown as { __tgaBuckets?: Map<string, Bucket> };
const today = () => new Date().toISOString().slice(0, 10);

function bucket(name: string): Bucket {
  g.__tgaBuckets ??= new Map();
  let b = g.__tgaBuckets.get(name);
  if (!b || b.day !== today()) {
    b = { day: today(), total: 0, perIp: new Map() };
    g.__tgaBuckets.set(name, b);
  }
  return b;
}

const num = (v: string | undefined, d: number) => Math.max(0, Number(v ?? d) || 0);
export const LIMITS = {
  ai: () => ({ total: num(process.env.DAILY_LIMIT, 30), perIp: num(process.env.PER_IP_DAILY_LIMIT, 10) }),
  login: () => ({ total: 500, perIp: 10 }),
};
type Kind = keyof typeof LIMITS;

export function remaining(kind: Kind = "ai") {
  return Math.max(0, LIMITS[kind]().total - bucket(kind).total);
}

export function take(kind: Kind, ip: string): { ok: true } | { ok: false; reason: string } {
  const b = bucket(kind);
  const lim = LIMITS[kind]();
  const n = b.perIp.get(ip) ?? 0;
  if (b.total >= lim.total) return { ok: false, reason: "오늘 쓸 수 있는 AI 호출 횟수를 모두 썼습니다. 내일 다시 시도해 주세요." };
  if (n >= lim.perIp) return { ok: false, reason: kind === "login" ? "로그인 시도가 너무 많습니다. 내일 다시 시도해 주세요." : "이 접속에서 오늘 쓸 수 있는 횟수를 모두 썼습니다." };
  b.total++;
  b.perIp.set(ip, n + 1);
  return { ok: true };
}

export function refund(kind: Kind, ip: string) {
  const b = bucket(kind);
  b.total = Math.max(0, b.total - 1);
  b.perIp.set(ip, Math.max(0, (b.perIp.get(ip) ?? 1) - 1));
}
