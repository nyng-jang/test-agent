"use client";

import { useMemo } from "react";
import { Importance, PriorityBadge, StatusPill } from "@/components/sections";
import { summary, testAsil } from "@/lib/analysis";
import { demoById } from "@/lib/demo";
import { CATEGORIES } from "@/lib/types";

/**
 * 로그인 화면 왼쪽의 제품 미리보기.
 * 자율주행 대회 차량 사례 데이터를 실제 분석 함수(summary)로 계산하고,
 * 결과 화면의 배지 컴포넌트를 그대로 써서 보여준다. 조작은 할 수 없다(inert).
 */
export default function LoginPreview() {
  const c = demoById("av")!;
  const s = useMemo(() => summary(c), [c]);
  const top = s.missing.slice(0, 2);
  const pct = Math.round(((s.full + s.partial * 0.5) / Math.max(1, s.total)) * 100);
  const byCat = CATEGORIES.map((cat) => {
    const ts = c.tests.filter((t) => t.cat === cat.id);
    const n = (st: string) => ts.filter((t) => s.status[t.id] === st).length;
    return { ...cat, total: ts.length, full: n("full"), partial: n("partial"), missing: n("missing") };
  });

  return (
    <figure className="lp" aria-label={`분석 결과 화면 미리보기: ${c.name}`}>
      <div className="lp-win" inert>
        <div className="lp-bar">
          <span className="lp-dots" aria-hidden><i /><i /><i /></span>
          <span className="lp-path">{c.name} <span className="lp-sep">/</span> 3 분석 결과</span>
        </div>
        <div className="lp-body">
          <div className="lp-steps" aria-hidden>
            <span className="done">1 시스템 입력</span><span className="done">2 시험 계획</span><span className="cur">3 분석 결과</span>
          </div>

          <div className="lp-kpis">
            <div><b>{s.total}</b><span>제안 시험</span></div>
            <div className="w"><b>{s.partial}</b><span>부분 반영</span></div>
            <div className="g"><b>{s.missingCount}</b><span>누락</span></div>
            <div><b>{pct}%</b><span>계획 커버리지</span></div>
          </div>

          <div className="lp-h">카테고리별 반영 상태</div>
          <div className="lp-cats">
            {byCat.map((k) => (
              <div key={k.id} className="lp-cat">
                <span className="lp-cl">{k.short}</span>
                <span className="lp-track" aria-hidden>
                  <i className="f" style={{ flex: k.full }} /><i className="p" style={{ flex: k.partial }} /><i className="m" style={{ flex: k.missing }} />
                </span>
                <span className="lp-cn">{k.full}/{k.total}</span>
              </div>
            ))}
          </div>

          <div className="lp-h">우선 확인할 항목</div>
          <ul className="lp-list">
            {top.map((t) => (
              <li key={t.id}>
                <div className="lp-tags">
                  <PriorityBadge p={s.prio[t.id]} />
                  <StatusPill st={s.status[t.id]} />
                  <Importance a={testAsil(t, s.sgA)} />
                  <span className="lp-id">{t.id}</span>
                </div>
                <div className="lp-title">{t.title}</div>
                <div className="lp-cond">{t.condition}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <figcaption>
        예시 사례 <b>{c.name}</b>. 야간 위주로 짠 계획에서 주간 직사광선 시험이 빠진 것을 찾아낸 결과입니다.
      </figcaption>
    </figure>
  );
}
