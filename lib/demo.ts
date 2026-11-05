import type { Analysis, CaseData, GapResult } from "./types";
import av from "@/data/cases/av.json";
import estop from "@/data/cases/estop.json";
import dsm from "@/data/cases/dsm.json";

export const DEMO_CASES = [av, estop, dsm] as CaseData[];

export const demoById = (id: string) => DEMO_CASES.find((c) => c.id === id);

export function demoAnalysis(c: CaseData): Analysis {
  return {
    name: c.name, summary: c.summary, systemInput: c.systemInput,
    blocks: c.blocks, requirements: c.requirements, hazards: c.hazards, safetyGoals: c.safetyGoals,
    questions: c.questions ?? [],
  };
}
export const demoGap = (c: CaseData): GapResult => ({ tests: c.tests, plan: c.plan });
export const demoPlanLines = (c: CaseData) => c.plan.map((p) => p.text);
