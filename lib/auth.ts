import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE = "tga_session";
const TTL_SEC = 60 * 60 * 12;

// 키·비밀번호는 서버 환경변수에서만 읽는다. NEXT_PUBLIC_ 접두사 금지.
export const liveEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY && process.env.LIVE_PASSWORD);

const secret = () => process.env.SESSION_SECRET || createHash("sha256").update(`tga:${process.env.LIVE_PASSWORD ?? ""}`).digest("hex");
const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("base64url");
const sha = (s: string) => createHash("sha256").update(s).digest();

export function passwordOk(input: string) {
  if (!process.env.LIVE_PASSWORD) return false;
  return timingSafeEqual(sha(input), sha(process.env.LIVE_PASSWORD));
}

export function makeToken() {
  const exp = String(Math.floor(Date.now() / 1000) + TTL_SEC);
  return { value: `${exp}.${sign(exp)}`, maxAge: TTL_SEC };
}

export function tokenOk(token: string | undefined) {
  if (!token || !liveEnabled()) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) * 1000 < Date.now()) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(exp));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export function readCookie(req: Request, name = COOKIE) {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}
