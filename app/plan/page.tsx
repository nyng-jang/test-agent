"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Shell, { StepHead, useStepState } from "@/components/Shell";
import { gapKeyOf, useFlow } from "@/lib/flow";
import { guessColumns, readPlanFile, toLines, type Table } from "@/lib/planImport";

export default function PlanPage() {
  return <Shell step={2}><PlanStep /></Shell>;
}

function PlanStep() {
  const { mode, flow, update, setRemaining } = useFlow();
  const { analysisOk, gapOk } = useStepState();
  const router = useRouter();
  const [tab, setTab] = useState<"text" | "file">("text");
  const [text, setText] = useState(flow.planLines.join("\n"));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const live = mode === "live";

  if (!analysisOk)
    return (
      <>
        <StepHead n={2} title="내 시험 계획" desc="" />
        <div className="notice">먼저 <Link href="/system">1단계 시스템 입력</Link>에서 분석을 마쳐 주세요.</div>
      </>
    );

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const setLines = (ls: string[]) => { setText(ls.join("\n")); update({ planLines: ls }); };

  const detect = async () => {
    update({ planLines: lines });
    if (flow.gap && flow.gapKey === gapKeyOf(flow.analysis, lines)) { router.push("/result"); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/gap", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ analysis: flow.analysis, plan: lines }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "누락 탐지에 실패했습니다.");
      if (typeof j.remaining === "number") setRemaining(j.remaining);
      update({ gap: j.gap, gapKey: gapKeyOf(flow.analysis, lines), planLines: lines });
      router.push("/result");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const unchanged = !!flow.gap && flow.gapKey === gapKeyOf(flow.analysis, lines);

  return (
    <>
      <StepHead n={2} title="내 시험 계획"
        desc={<>지금까지 짠 시험 계획을 넣어 주세요. AI가 1단계 분석과 대조해 빠진 조건을 찾습니다. 시스템: <b>{flow.analysis?.name}</b></>} />

      <div className="subtabs" role="tablist" style={{ marginTop: 10 }}>
        <button role="tab" className="subtab" aria-selected={tab === "text"} onClick={() => setTab("text")}>한 줄씩 입력</button>
        <button role="tab" className="subtab" aria-selected={tab === "file"} onClick={() => setTab("file")}>파일 불러오기 (CSV · JSON · Excel)</button>
      </div>

      <section className="section">
        {tab === "text" ? (
          <div className="card">
            <label className="f" htmlFor="plan" style={{ marginTop: 0 }}>시험 항목 (한 줄에 하나)</label>
            <textarea id="plan" value={text} readOnly={!live} style={{ minHeight: 220 }}
              onChange={(e) => setText(e.target.value)}
              onBlur={() => update({ planLines: lines })}
              placeholder={"야간 트랙 차선 유지 주행\n정지 신호 인식 후 정지\nE-stop 눌러서 정지 확인"} />
            <div className="small muted" style={{ marginTop: 4 }}>{lines.length}개 항목 · 조건을 괄호로 함께 적으면 더 정확합니다. 예: 차선 유지 주행 (야간, 직선·곡선 5회)</div>
          </div>
        ) : (
          <FileImport disabled={!live} onApply={(ls, replace) => { setLines(replace ? ls : [...lines, ...ls]); setTab("text"); }} />
        )}
        {!live && <div className="notice" style={{ marginTop: 10 }}>데모에서는 예시 계획으로 진행합니다. 내 계획을 넣으려면 로그인하세요.</div>}
      </section>

      {err && <div className="notice err">{err}</div>}
      <div className="actions">
        <Link className="btn" href="/system">← 시스템 입력</Link>
        <span className="spacer" />
        {gapOk && unchanged ? (
          <button className="btn primary lg" onClick={() => router.push("/result")}>결과 보기 →</button>
        ) : (
          <button className="btn primary lg" disabled={busy || !live} onClick={detect}>
            {busy ? <span className="loading">누락 탐지 중… (1~2분)</span> : "AI로 누락 탐지 →"}
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
  const [over, setOver] = useState(false);

  const load = async (f: File | undefined) => {
    if (!f) return;
    setErr(""); setName(f.name);
    try {
      const t = await readPlanFile(f);
      if (!t.length) throw new Error("파일에서 내용을 찾지 못했습니다.");
      const g = guessColumns(t);
      setTable(t); setHasHeader(g.hasHeader); setTitle(g.title); setCond(g.cond);
    } catch (e: any) {
      setTable(null); setErr(e.message || "파일을 읽지 못했습니다.");
    }
  };

  const width = table ? Math.max(...table.map((r) => r.length)) : 0;
  const colName = (i: number) => (hasHeader && table?.[0][i]) || `${i + 1}열`;
  const preview = table ? toLines(table, hasHeader, title, cond) : [];

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
          <span className="muted"> (CSV는 Excel에서 열어 고친 뒤 .xlsx로 저장해도 됩니다)</span>
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
