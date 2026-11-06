"use client";

import { useMemo } from "react";
import { PriorityBadge, StatusPill } from "@/components/sections";
import { summary } from "@/lib/analysis";
import { demoById } from "@/lib/demo";
import { STAGES } from "@/lib/types";

/**
 * 로그인 화면 오른쪽의 제품 미리보기.
 * 자율주행 대회 차량 사례를 실제 분석 함수(summary)로 계산해
 * 1단계(시스템 분석) 창과 3단계(분석 결과) 창을 겹쳐 보여준다. 조작은 할 수 없다(inert).
 */
export default function LoginPreview() {
  const c = demoById("av")!;
  const s = useMemo(() => summary(c), [c]);
  const pct = Math.round(((s.full + s.partial * 0.5) / Math.max(1, s.total)) * 100);

  return (
    <div className="lp2" aria-hidden inert>
      {/* 뒤: 1단계 시스템 분석 */}
      <div className="lp2-win lp2-back">
        <div className="lp2-side">
          <span className="lp2-logo"><img src="/logo.png" alt="" width={12} height={12} /></span>
          <span className="on">1 시스템 입력</span>
          <span>2 시험 계획</span>
          <span>3 분석 결과</span>
        </div>
        <div className="lp2-main">
          <div className="lp2-title">{c.name}</div>
          <div className="lp2-sub">구성 블록 {c.blocks.length} · 요구사항 {c.requirements.length} · 위험 {c.hazards.length}</div>
          <div className="lp2-flow">
            {STAGES.map((st) => (
              <div key={st.id} className="lp2-col">
                <i>{st.label}</i>
                {c.blocks.filter((b) => b.stage === st.id).slice(0, 3).map((b) => <b key={b.id}>{b.label}</b>)}
              </div>
            ))}
          </div>
          <div className="lp2-reqs">
            {c.requirements.slice(0, 3).map((r) => <div key={r.id}><em>{r.id}</em>{r.text}</div>)}
          </div>
        </div>
      </div>

      {/* 앞: 3단계 분석 결과 */}
      <div className="lp2-win lp2-front">
        <div className="lp2-bar"><span>×</span> 분석 결과</div>
        <div className="lp2-q">보완이 필요한 시험 {s.missing.length}개</div>
        <div className="lp2-kpis">
          <div><b>{s.total}</b>제안 시험</div>
          <div className="w"><b>{s.partial}</b>부분 반영</div>
          <div className="g"><b>{s.missingCount}</b>누락</div>
          <div><b>{pct}%</b>커버리지</div>
        </div>
        <ul className="lp2-list">
          {s.missing.slice(0, 3).map((t) => (
            <li key={t.id}>
              <div className="lp2-tags"><PriorityBadge p={s.prio[t.id]} /><StatusPill st={s.status[t.id]} /><span>{t.id}</span></div>
              <div className="lp2-t">{t.title}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
