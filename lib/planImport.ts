// 시험 계획 파일(CSV / JSON / Excel / TXT)을 표 형태(행 × 열 문자열)로 읽는다. 모두 브라우저 안에서 처리한다.
export type Table = string[][];

export function parseCsv(text: string): Table {
  const rows: Table = [];
  let row: string[] = [], cell = "", q = false;
  const delim = text.split("\n")[0].includes("\t") && !text.split("\n")[0].includes(",") ? "\t" : ",";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return clean(rows);
}

export function parseJson(text: string): Table {
  let v: any = JSON.parse(text);
  if (!Array.isArray(v) && v && typeof v === "object") {
    const k = Object.keys(v).find((k) => Array.isArray(v[k]));
    v = k ? v[k] : [];
  }
  if (!Array.isArray(v)) return [];
  if (v.every((x) => typeof x === "string" || typeof x === "number")) return clean([["시험 항목"], ...v.map((x) => [String(x)])]);
  const keys: string[] = [];
  for (const o of v) if (o && typeof o === "object") for (const k of Object.keys(o)) if (!keys.includes(k)) keys.push(k);
  return clean([keys, ...v.map((o: any) => keys.map((k) => (o?.[k] == null ? "" : typeof o[k] === "object" ? JSON.stringify(o[k]) : String(o[k]))))]);
}

export async function parseXlsx(file: File): Promise<Table> {
  const { readSheet } = await import("read-excel-file/browser");
  const rows = await readSheet(file);
  return clean(rows.map((r) => r.map((c) => (c == null ? "" : c instanceof Date ? c.toISOString().slice(0, 10) : String(c)))));
}

export async function readPlanFile(file: File): Promise<Table> {
  const name = file.name.toLowerCase();
  if (file.size > 2_000_000) throw new Error("파일이 너무 큽니다 (2MB 이하).");
  if (name.endsWith(".xlsx")) return parseXlsx(file);
  if (name.endsWith(".xls")) throw new Error("예전 .xls 형식은 지원하지 않습니다. .xlsx나 .csv로 저장해 주세요.");
  const text = (await file.text()).replace(/^﻿/, "");
  if (name.endsWith(".json")) return parseJson(text);
  if (name.endsWith(".csv") || name.endsWith(".tsv")) return parseCsv(text);
  return clean(text.split(/\r?\n/).map((l) => [l]));
}

function clean(t: Table): Table {
  return t.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c));
}

const TITLE_RE = /항목|시험|테스트|title|name|test|item|case/i;
const COND_RE = /조건|condition|내용|설명|desc|detail|방법|procedure/i;

/** 제목 줄 여부와 항목·조건 열을 추측한다. */
export function guessColumns(t: Table) {
  const head = t[0] ?? [];
  const hasHeader = head.some((h) => TITLE_RE.test(h) || COND_RE.test(h));
  let title = hasHeader ? head.findIndex((h) => TITLE_RE.test(h)) : -1;
  if (title < 0) {
    // 가장 긴 글이 많은 열
    const width = Math.max(...t.map((r) => r.length), 1);
    const avg = Array.from({ length: width }, (_, i) => t.reduce((s, r) => s + (r[i]?.length ?? 0), 0));
    title = avg.indexOf(Math.max(...avg));
  }
  const cond = hasHeader ? head.findIndex((h, i) => i !== title && COND_RE.test(h)) : -1;
  return { hasHeader, title, cond };
}

export function toLines(t: Table, hasHeader: boolean, title: number, cond: number): string[] {
  return (hasHeader ? t.slice(1) : t)
    .map((r) => {
      const a = r[title] ?? "";
      const b = cond >= 0 ? r[cond] ?? "" : "";
      return (a && b ? `${a} (${b})` : a || b).replace(/\s+/g, " ").trim();
    })
    .filter(Boolean)
    .slice(0, 60);
}
