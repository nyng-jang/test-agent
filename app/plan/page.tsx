"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Shell, { StepHead, useStepState } from "@/components/Shell";
import { flowPremises, gapKeyOf, useFlow } from "@/lib/flow";
import { guessColumns, normalizePlanLine, readPlanFile, toLines, type Table } from "@/lib/planImport";
import { AiProgress } from "@/components/AiProgress";
import { simulateGap } from "@/lib/showcase";
import { gapLive } from "@/lib/ai";
import { demoById, demoPlanLines } from "@/lib/demo";
import { TabPanel, Tabs } from "@/components/Tabs";

/** 조건이나 기준 없이 이름만 있는 줄: 괄호·숫자·화살표가 없는 짧은 줄 */
const bare = (l: string) => !/[(\[:→]|->|\d/.test(l);

export default function PlanPage() {
  return <Shell step={2}><PlanStep /></Shell>;
}

function PlanStep() {
  const { mode, llm, flow, update } = useFlow();
  const { analysisOk, gapOk } = useStepState();
  const router = useRouter();
  const [tab, setTab] = useState<"text" | "file" | "fields">("text");
  const [fieldTitle, setFieldTitle] = useState("");
  const [fieldCondition, setFieldCondition] = useState("");
  const [fieldCriteria, setFieldCriteria] = useState("");
  const [text, setText] = useState(flow.planLines.join("\n"));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const showcase = mode === "showcase";
  const live = mode === "live" || showcase;
  const demoCase = flow.demoId ? demoById(flow.demoId) : undefined;

  if (!analysisOk)
    return (
      <>
        <StepHead n={2} title="내 시험 계획" desc="" />
        <div className="notice">먼저 <Link href="/system">1단계 시스템 입력</Link>에서 분석을 마쳐 주세요.</div>
      </>
    );

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const premises = flowPremises(flow);
  const key = gapKeyOf(flow.analysis, lines, premises);
  const bareCount = lines.filter(bare).length;
  const reviewCount = lines.filter((line) => normalizePlanLine(line).review.length > 0).length;
  const setLines = (ls: string[]) => { setText(ls.join("\n")); update({ planLines: ls }); };

  const detect = async () => {
    update({ planLines: lines });
    if (flow.gap && flow.gapKey === key) { router.push("/result"); return; }
    setBusy(true); setErr("");
    try {
      if (showcase) {
        const sim = await simulateGap(flow.demoId, flow.analysis, lines);
        if (!sim.ok) throw new Error(sim.error);
        update({ gap: sim.gap, gapKey: key, planLines: lines });
        router.push("/result");
        return;
      }
      if (!llm || !flow.analysis) throw new Error("API 키가 없습니다. 첫 화면에서 키를 다시 넣어 주세요.");
      const gap = await gapLive(llm, flow.analysis, lines, premises);
      update({ gap, gapKey: key, planLines: lines });
      router.push("/result");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const unchanged = !!flow.gap && flow.gapKey === key;

  return (
    <>
      <StepHead n={2} title="내 시험 계획"
        desc={<>지금까지 짠 시험 계획을 넣어 주세요. AI가 1단계 분석과 대조해 빠진 조건을 찾습니다. 시스템: <b>{flow.analysis?.name}</b></>} />

      <details className="card guide plan-guide" open={live && lines.length === 0} style={{ marginTop: 12 }}>
        <summary>작성 예시: 시험 항목 · 조건 · 판정 기준을 나눠 쓰면 비교가 정확해집니다</summary>
        <div className="tbl-wrap" style={{ marginTop: 10 }}>
          <table className="tbl" style={{ minWidth: 0 }}>
            <thead><tr><th scope="col">시험 항목</th><th scope="col">시험 조건</th><th scope="col">판정 기준</th></tr></thead>
            <tbody>
              <tr><td>저온 시동 시험</td><td>-30℃에서 2시간 방치 후 작동</td><td>1초 이내 정상 작동</td></tr>
              <tr><td>E-stop 정지 시간</td><td>최고 속도 주행 중 20회</td><td>0.5초 이내 정지, 20회 중 20회</td></tr>
            </tbody>
          </table>
        </div>
        <p className="small" style={{ margin: "10px 0 0" }}>
          한 줄로 쓸 때: <code>시험 항목 (조건) → 판정 기준</code> <span className="muted">예: 저온 시동 시험 (-30℃ 2시간 방치) → 1초 이내 작동</span><br />
          <span className="muted">이름만 써도 되지만, 조건이 없으면 AI가 &lsquo;부분 반영&rsquo;으로 판단할 수 있습니다.</span>
        </p>
      </details>

      <div style={{ marginTop: 14 }}>
        <Tabs idPrefix="plan" label="계획 입력 방식" value={tab} onChange={(v) => setTab(v as "text" | "file" | "fields")}
          tabs={[{ id: "text", label: "자유 형식 (권장)" }, { id: "file", label: "파일 가져오기" }, { id: "fields", label: "항목별 직접 작성" }]} />
      </div>

      <TabPanel idPrefix="plan" id={tab}>
        <section className="section">
          {tab === "text" ? (
            <div className="card plan-input-card">
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <label className="f" htmlFor="plan" style={{ marginTop: 0, flex: 1 }}>시험 계획을 자유롭게 입력해 주세요</label>
                {live && demoCase && <button type="button" className="btn" onClick={() => setLines(demoPlanLines(demoCase))}>예시 계획 불러오기</button>}
              </div>
              <p className="small muted">시험 ID나 정해진 항목명이 없어도 됩니다. 내용을 항목·조건·판정 기준으로 정리하고 빠진 정보는 확인 필요로 표시합니다.</p>
              <textarea id="plan" value={text} readOnly={!live} style={{ minHeight: 220 }}
                onChange={(e) => setText(e.target.value)}
                onBlur={() => update({ planLines: lines })}
                placeholder={"저온 시동 시험 (-30℃ 2시간 방치) → 1초 이내 작동\n차선 유지 주행 (야간, 직선·곡선 각 5회) → 중앙 ±10cm\nE-stop 정지 확인 (근거리)"} />
              <div className="small muted" style={{ marginTop: 4 }}>
                {lines.length}개 항목
                {bareCount > 0 && <> · <span className="warn-t">조건·기준 없이 이름만 있는 항목 {bareCount}개</span></>}
                {reviewCount > 0 && <> · <span className="warn-t">확인 필요 정보가 있는 항목 {reviewCount}개</span></>}
              </div>
            </div>
          ) : tab === "file" ? (
            <FileImport disabled={!live} onApply={(ls, replace) => { setLines(replace ? ls : [...lines, ...ls]); setTab("text"); }} />
          ) : (
            <div className="card">
              <label className="f" htmlFor="field-title">시험 항목</label><input id="field-title" value={fieldTitle} onChange={e => setFieldTitle(e.target.value)} placeholder="예: 통신 단절 시 모터 정지" />
              <label className="f" htmlFor="field-condition">시험 조건</label><input id="field-condition" value={fieldCondition} onChange={e => setFieldCondition(e.target.value)} placeholder="예: 정지 명령 전송 후" />
              <label className="f" htmlFor="field-criteria">판정 기준</label><input id="field-criteria" value={fieldCriteria} onChange={e => setFieldCriteria(e.target.value)} placeholder="예: 1초 이내 모터 전원 차단" />
              <button className="btn" disabled={!live || !fieldTitle.trim()} onClick={() => { const line = `${fieldTitle.trim()}${fieldCondition.trim() ? ` (${fieldCondition.trim()})` : ""}${fieldCriteria.trim() ? ` → ${fieldCriteria.trim()}` : ""}`; setLines([...lines, line]); setFieldTitle(""); setFieldCondition(""); setFieldCriteria(""); }}>계획에 항목 추가</button>
              <p className="small muted">ID 입력은 선택 사항이며 필요하지 않습니다. 조건이나 판정 기준이 비어 있으면 확인 필요로 표시합니다.</p>
            </div>
          )}
          {!live && <div className="notice" style={{ marginTop: 10 }}>데모에서는 예시 계획으로 진행합니다. 내 계획을 넣으려면 로그인하세요.</div>}
        </section>
      </TabPanel>

      {busy && <AiProgress typical={showcase ? 10 : 60} steps={["분석 결과와 계획 읽는 중", "카테고리별 시험 항목 만드는 중", "조건·판정 기준 정리 중", "내 계획과 하나씩 대조 중", "우선순위 정리 중"]} />}
      {err && <div className="notice err">{err}</div>}
      <div className="actions">
        <Link className="btn" href="/system">← 시스템 입력</Link>
        <span className="spacer" />
        {gapOk && unchanged ? (
          <button className="btn primary lg" onClick={() => router.push("/result")}>결과 보기 →</button>
        ) : (
          <button className="btn primary lg" disabled={busy || !live || lines.length === 0} onClick={detect}>
            {busy ? "누락 탐지 중…" : "AI로 누락 탐지 →"}
          </button>
        )}
      </div>
    </>
  );
}

function FileImport({ disabled, onApply }: { disabled: boolean; onApply: (lines: string[], replace: boolean) => void }) {
  const [table, setTable] = useState<Table | null>(null);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [hasHeader, setHasHeader] = useState(true);
  const [title, setTitle] = useState(0);
  const [cond, setCond] = useState(-1);
  const [crit, setCrit] = useState(-1);
  const [over, setOver] = useState(false);

  const load = async (f: File | undefined) => {
    if (!f) return;
    setErr(""); setName(f.name);
    try {
      const t = await readPlanFile(f);
      if (!t.length) throw new Error("파일에서 내용을 찾지 못했습니다.");
      const g = guessColumns(t);
      setTable(t); setHasHeader(g.hasHeader); setTitle(g.title); setCond(g.cond); setCrit(g.crit);
    } catch (e: any) {
      setTable(null); setErr(e.message || "파일을 읽지 못했습니다.");
    }
  };

  const width = table ? Math.max(...table.map((r) => r.length)) : 0;
  const colName = (i: number) => (hasHeader && table?.[0][i]) || `${i + 1}열`;
  const preview = table ? toLines(table, hasHeader, title, cond, crit) : [];

  return (
    <div className="card">
      <div
        className={`drop ${over ? "on" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled) load(e.dataTransfer.files[0]); }}
      >
        <div style={{ fontWeight: 600 }}>파일을 끌어다 놓거나 선택하세요</div>
        <div className="small muted" style={{ margin: "4px 0 10px" }}>.csv · .json · .xlsx · .txt, 2MB 이하. 파일은 브라우저 안에서만 읽습니다.</div>
        <input type="file" accept=".csv,.tsv,.json,.xlsx,.txt" disabled={disabled} onChange={(e) => load(e.target.files?.[0])} />
        <div className="small" style={{ marginTop: 10 }}>
          예시 파일: <a href="/samples/plan-sample.csv" download>CSV</a> · <a href="/samples/plan-sample.json" download>JSON</a>
          <span className="muted"> (시험 항목 · 시험 조건 · 판정 기준 세 열. Excel에서 열어 고친 뒤 .xlsx로 저장해도 됩니다)</span>
        </div>
      </div>
      {err && <div className="notice err" style={{ marginTop: 10 }}>{err}</div>}
      {table && (
        <div style={{ marginTop: 14 }}>
          <div className="small muted" style={{ marginBottom: 8 }}>{name} · {table.length}줄</div>
          <div className="toolbar">
            <label className="small"><input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} /> 첫 줄은 제목</label>
            <label className="small">시험 항목 열{" "}
              <select value={title} onChange={(e) => setTitle(Number(e.target.value))}>
                {Array.from({ length: width }, (_, i) => <option key={i} value={i}>{colName(i)}</option>)}
              </select>
            </label>
            <label className="small">조건 열 (선택){" "}
              <select value={cond} onChange={(e) => setCond(Number(e.target.value))}>
                <option value={-1}>없음</option>
                {Array.from({ length: width }, (_, i) => i !== title && <option key={i} value={i}>{colName(i)}</option>)}
              </select>
            </label>
            <label className="small">판정 기준 열 (선택){" "}
              <select value={crit} onChange={(e) => setCrit(Number(e.target.value))}>
                <option value={-1}>없음</option>
                {Array.from({ length: width }, (_, i) => i !== title && i !== cond && <option key={i} value={i}>{colName(i)}</option>)}
              </select>
            </label>
          </div>
          <div className="small muted">미리보기 ({preview.length}개)</div>
          <ol className="small" style={{ margin: "6px 0 0", paddingLeft: 20 }}>
            {preview.slice(0, 8).map((l, i) => <li key={i}>{l}</li>)}
            {preview.length > 8 && <li className="muted">… 외 {preview.length - 8}개</li>}
          </ol>
          <div className="actions" style={{ marginBottom: 0 }}>
            <button className="btn primary" disabled={!preview.length} onClick={() => onApply(preview, true)}>이 내용으로 계획 바꾸기</button>
            <button className="btn" disabled={!preview.length} onClick={() => onApply(preview, false)}>기존 계획에 추가</button>
          </div>
        </div>
      )}
    </div>
  );
}
