export type Category = "env" | "func" | "comm" | "fault" | "misuse";
export type Stage = "sensor" | "process" | "actuator" | "support";
export type Asil = "QM" | "A" | "B" | "C" | "D";
export type CoverLevel = "full" | "partial";

export interface Block { id: string; label: string; stage: Stage }
export interface Requirement { id: string; text: string }
export interface Hazard { id: string; text: string; situation: string; S: number; E: number; C: number; sg: string }
export interface SafetyGoal { id: string; text: string; safeState: string }
export interface TestItem {
  id: string; cat: Category; title: string; condition: string; criteria: string;
  reqs: string[]; sgs: string[]; blocks: string[]; why?: string;
}
export interface PlanItem { id: string; text: string; covers: Record<string, CoverLevel> }
export interface Question { id: string; q: string; why: string; assumption: string }

/** 1단계 결과: 시스템 분석 */
export interface Analysis {
  name: string; summary: string; systemInput: string;
  blocks: Block[]; requirements: Requirement[]; hazards: Hazard[]; safetyGoals: SafetyGoal[];
  questions: Question[];
}
/** 3단계 결과: 시험 항목 + 내 계획 대조 */
export interface GapResult { tests: TestItem[]; plan: PlanItem[] }

export interface CaseData {
  id: string; name: string; tab: string; summary: string; systemInput: string; planNote?: string;
  blocks: Block[]; requirements: Requirement[]; hazards: Hazard[]; safetyGoals: SafetyGoal[];
  questions?: Question[];
  tests: TestItem[]; plan: PlanItem[];
  live?: boolean;
}

export const CATEGORIES: { id: Category; label: string; short: string }[] = [
  { id: "env", label: "환경", short: "환경" },
  { id: "func", label: "기능", short: "기능" },
  { id: "comm", label: "통신", short: "통신" },
  { id: "fault", label: "고장·Fail-safe", short: "고장" },
  { id: "misuse", label: "오작동", short: "오작동" },
];

export const STAGES: { id: Stage; label: string }[] = [
  { id: "sensor", label: "센서·입력" },
  { id: "process", label: "처리·통신" },
  { id: "actuator", label: "액추에이터·출력" },
];
