"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Analysis, GapResult, Premise } from "./types";
import { premisesOf, type QState } from "./premise";
import { demoAnalysis, demoById, demoGap, demoPlanLines } from "./demo";

export type Mode = "live" | "guest" | null;

export interface FlowState {
  demoId: string | null;          // 불러온 예시 사례 (직접 입력이면 null)
  systemInput: string;
  answers: Record<string, string>; // 보완 질문 id → 답
  qState: Record<string, QState>;  // 보완 질문 id → 직접 답변 / AI 가정 사용 / 확인 필요
  analysis: Analysis | null;
  analyzedInput: string | null;    // 분석 당시 시스템 설명 (바뀌면 다시 분석 필요)
  planLines: string[];
  gap: GapResult | null;
  gapKey: string | null;           // 결과를 만든 분석+계획 (바뀌면 다시 탐지 필요)
}

const EMPTY: FlowState = {
  demoId: null, systemInput: "", answers: {}, qState: {}, analysis: null, analyzedInput: null, planLines: [], gap: null, gapKey: null,
};

export const flowPremises = (f: FlowState): Premise[] => premisesOf(f.analysis, f.answers, f.qState);

export const gapKeyOf = (a: Analysis | null, plan: string[], premises: Premise[]) =>
  JSON.stringify({
    r: a?.requirements, s: a?.safetyGoals, b: a?.blocks?.map((x) => x.id),
    p: plan.map((x) => x.trim()).filter(Boolean), q: premises.map((x) => [x.id, x.kind, x.text]),
  });

interface Session { liveEnabled: boolean; loggedIn: boolean; remaining: number }

interface Ctx {
  ready: boolean;
  mode: Mode;
  session: Session | null;
  flow: FlowState;
  update: (patch: Partial<FlowState>) => void;
  loadDemo: (id: string) => void;
  reset: () => void;
  enterGuest: () => void;
  refreshSession: () => Promise<Session | null>;
  setRemaining: (n: number) => void;
  logout: () => Promise<void>;
}

const FlowCtx = createContext<Ctx | null>(null);
const KEY = "tga-flow-v1";
const MODE_KEY = "tga-guest";

const store = {
  get(k: string) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { sessionStorage.setItem(k, v); } catch { /* 저장 불가 환경 */ } },
  del(k: string) { try { sessionStorage.removeItem(k); } catch { /* noop */ } },
};

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const [flow, setFlow] = useState<FlowState>(EMPTY);
  const [session, setSession] = useState<Session | null>(null);
  const [guest, setGuest] = useState(false);
  const [ready, setReady] = useState(false);

  const refreshSession = useCallback(async () => {
    try {
      const s: Session = await fetch("/api/session", { cache: "no-store" }).then((r) => r.json());
      setSession(s);
      return s;
    } catch {
      const s = { liveEnabled: false, loggedIn: false, remaining: 0 };
      setSession(s);
      return s;
    }
  }, []);

  useEffect(() => {
    const raw = store.get(KEY);
    if (raw) try { setFlow({ ...EMPTY, ...JSON.parse(raw) }); } catch { /* 깨진 값 무시 */ }
    setGuest(store.get(MODE_KEY) === "1");
    refreshSession().finally(() => setReady(true));
  }, [refreshSession]);

  useEffect(() => { if (ready) store.set(KEY, JSON.stringify(flow)); }, [flow, ready]);

  const update = useCallback((patch: Partial<FlowState>) => setFlow((f) => ({ ...f, ...patch })), []);

  const loadDemo = useCallback((id: string) => {
    const c = demoById(id);
    if (!c) return;
    const analysis = demoAnalysis(c);
    const planLines = demoPlanLines(c);
    setFlow({
      demoId: id, systemInput: c.systemInput, answers: {}, qState: {}, analysis, analyzedInput: c.systemInput,
      planLines, gap: demoGap(c), gapKey: gapKeyOf(analysis, planLines, premisesOf(analysis, {}, {})),
    });
  }, []);

  const reset = useCallback(() => setFlow(EMPTY), []);
  const enterGuest = useCallback(() => { store.set(MODE_KEY, "1"); setGuest(true); }, []);
  const setRemaining = useCallback((n: number) => setSession((s) => (s ? { ...s, remaining: n } : s)), []);
  const logout = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    store.del(MODE_KEY); store.del(KEY);
    setGuest(false); setFlow(EMPTY);
    await refreshSession();
  }, [refreshSession]);

  const mode: Mode = session?.loggedIn ? "live" : guest ? "guest" : null;

  const value = useMemo(
    () => ({ ready, mode, session, flow, update, loadDemo, reset, enterGuest, refreshSession, setRemaining, logout }),
    [ready, mode, session, flow, update, loadDemo, reset, enterGuest, refreshSession, setRemaining, logout],
  );
  return <FlowCtx.Provider value={value}>{children}</FlowCtx.Provider>;
}

export function useFlow() {
  const c = useContext(FlowCtx);
  if (!c) throw new Error("FlowProvider 밖에서 useFlow 사용");
  return c;
}
