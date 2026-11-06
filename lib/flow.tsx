"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Analysis, GapResult, Premise } from "./types";
import { premisesOf, type QState } from "./premise";
import { demoAnalysis, demoById, demoGap, demoPlanLines } from "./demo";
import type { LlmConfig } from "./llm";

/** live: 내 API 키로 실제 분석 · showcase: 키 없이 체험(사례 데이터로 재현) */
export type Mode = "live" | "showcase" | null;

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
    r: a?.requirements, s: a?.safetyGoals, b: a?.blocks?.map((x) => [x.id, x.label, x.stage]),
    p: plan.map((x) => x.trim()).filter(Boolean), q: premises.map((x) => [x.id, x.kind, x.text]),
  });

interface Ctx {
  ready: boolean;
  mode: Mode;
  llm: LlmConfig | null;
  flow: FlowState;
  update: (patch: Partial<FlowState>) => void;
  loadDemo: (id: string) => void;
  fillDemo: (id: string) => void;
  reset: () => void;
  startLive: (cfg: LlmConfig) => void;
  startShowcase: () => void;
  logout: () => void;
}

const FlowCtx = createContext<Ctx | null>(null);
const KEY = "tga-flow-v1";
const MODE_KEY = "tga-mode";
const LLM_KEY = "tga-llm"; // API 키: 이 탭의 sessionStorage에만 저장, 탭을 닫으면 사라짐

const store = {
  get(k: string) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { sessionStorage.setItem(k, v); } catch { /* 저장 불가 환경 */ } },
  del(k: string) { try { sessionStorage.removeItem(k); } catch { /* noop */ } },
};

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const [flow, setFlow] = useState<FlowState>(EMPTY);
  const [mode, setMode] = useState<Mode>(null);
  const [llm, setLlm] = useState<LlmConfig | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = store.get(KEY);
    if (raw) try { setFlow({ ...EMPTY, ...JSON.parse(raw) }); } catch { /* 깨진 값 무시 */ }
    const m = store.get(MODE_KEY);
    const cfgRaw = store.get(LLM_KEY);
    let cfg: LlmConfig | null = null;
    if (cfgRaw) try { cfg = JSON.parse(cfgRaw); } catch { /* 무시 */ }
    if (m === "live" && cfg?.key) { setMode("live"); setLlm(cfg); }
    else if (m === "showcase") setMode("showcase");
    setReady(true);
  }, []);

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

  /** 예시 시스템 설명만 채운다 (분석은 사용자가 버튼을 눌러 진행) */
  const fillDemo = useCallback((id: string) => {
    const c = demoById(id);
    if (c) setFlow({ ...EMPTY, systemInput: c.systemInput, demoId: id });
  }, []);

  const reset = useCallback(() => setFlow(EMPTY), []);
  const startLive = useCallback((cfg: LlmConfig) => {
    store.set(MODE_KEY, "live"); store.set(LLM_KEY, JSON.stringify(cfg));
    setLlm(cfg); setMode("live");
  }, []);
  const startShowcase = useCallback(() => { store.set(MODE_KEY, "showcase"); store.del(LLM_KEY); setLlm(null); setMode("showcase"); }, []);
  const logout = useCallback(() => {
    store.del(MODE_KEY); store.del(KEY); store.del(LLM_KEY);
    setMode(null); setLlm(null); setFlow(EMPTY);
  }, []);

  const value = useMemo(
    () => ({ ready, mode, llm, flow, update, loadDemo, fillDemo, reset, startLive, startShowcase, logout }),
    [ready, mode, llm, flow, update, loadDemo, fillDemo, reset, startLive, startShowcase, logout],
  );
  return <FlowCtx.Provider value={value}>{children}</FlowCtx.Provider>;
}

export function useFlow() {
  const c = useContext(FlowCtx);
  if (!c) throw new Error("FlowProvider 밖에서 useFlow 사용");
  return c;
}
