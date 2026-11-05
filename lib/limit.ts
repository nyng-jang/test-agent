// 하루 호출 횟수 제한. 서버리스 인스턴스 메모리에 두므로 인스턴스가 여러 개면 각각 따로 센다(최선 노력).
// 확실한 비용 상한은 Anthropic 콘솔의 사용 한도로 건다.
type Bucket = { day: string; total: number; perIp: Map<string, number> };
const g = globalThis as unknown as { __liveBucket?: Bucket };

const today = () => new Date().toISOString().slice(0, 10);

function bucket(): Bucket {
  const d = today();
  if (!g.__liveBucket || g.__liveBucket.day !== d) g.__liveBucket = { day: d, total: 0, perIp: new Map() };
  return g.__liveBucket;
}

export const dailyLimit = () => Math.max(0, Number(process.env.DAILY_LIMIT ?? 20) || 0);
export const ipLimit = () => Math.max(1, Number(process.env.PER_IP_DAILY_LIMIT ?? 5) || 5);

export function remaining() {
  return Math.max(0, dailyLimit() - bucket().total);
}

export function take(ip: string): { ok: true } | { ok: false; reason: string } {
  const b = bucket();
  if (b.total >= dailyLimit()) return { ok: false, reason: "오늘 실시간 생성 횟수를 모두 썼습니다. 내일 다시 시도해 주세요." };
  const n = b.perIp.get(ip) ?? 0;
  if (n >= ipLimit()) return { ok: false, reason: "이 접속에서 오늘 쓸 수 있는 횟수를 모두 썼습니다." };
  b.total++;
  b.perIp.set(ip, n + 1);
  return { ok: true };
}

export function refund(ip: string) {
  const b = bucket();
  b.total = Math.max(0, b.total - 1);
  b.perIp.set(ip, Math.max(0, (b.perIp.get(ip) ?? 1) - 1));
}
