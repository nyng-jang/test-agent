/**
 * 2단계 대조 동작 안내 애니메이션(약 10초).
 * 시스템 분석 결과(AI 제안 시험)와 내 시험 계획을 이어 보고, 계획에 있음 / 부분 반영 / 누락을 붙인다.
 */
export function CompareDemo() {
  const chip = (y: number, label: string, cls: string) => (
    <g className={cls}>
      <rect x="16" y={y} width="164" height="28" rx="6" className="bd-block cd-chip" />
      <text x="26" y={y + 18.5} className="bd-label">{label}</text>
    </g>
  );
  const plan = (y: number, label: string) => (
    <g>
      <rect x="360" y={y} width="164" height="28" rx="6" className="bd-block" />
      <text x="370" y={y + 18.5} className="bd-label">{label}</text>
    </g>
  );
  const tag = (y: number, w: number, text: string, kind: string) => (
    <g className={`cd-tag cd-tag-${kind}`}>
      <rect x={190} y={y + 4} width={w} height="20" rx="10" className={`cd-tagbox ${kind}`} />
      <text x={190 + w / 2} y={y + 18} textAnchor="middle" className={`cd-tagt ${kind}`}>{text}</text>
    </g>
  );
  return (
    <figure className="bd" aria-label="대조 동작 안내 애니메이션: AI가 제안한 시험과 내 시험 계획을 이어 보고, 계획에 있음, 부분 반영, 누락을 표시합니다.">
      <svg viewBox="0 0 540 160" role="img" aria-hidden>
        <g className="bd-scene">
          <rect x="4" y="6" width="188" height="148" rx="10" className="bd-col" />
          <text x="16" y="24" className="bd-colt">시스템 분석 → AI 제안 시험</text>
          {chip(36, "저온 시동 시험", "cd-c1")}
          {chip(74, "차선 유지 주행", "cd-c2")}
          {chip(112, "직사광선 차선 인식", "cd-c3")}

          <rect x="348" y="6" width="188" height="148" rx="10" className="bd-col" />
          <text x="360" y="24" className="bd-colt">내 시험 계획</text>
          {plan(36, "저온 시동 (-30℃, 2시간)")}
          {plan(74, "야간 차선 주행 5회")}

          <g className="cd-ai"><rect x="226" y="10" width="88" height="22" rx="11" className="cd-aibox" /><text x="270" y="25" textAnchor="middle" className="cd-ait">AI 대조</text></g>
          <path d="M180 50 L360 50" className="cd-line ok" />
          <path d="M180 88 L360 88" className="cd-line part" />

          {tag(36, 66, "계획에 있음", "ok")}
          {tag(74, 58, "부분 반영", "part")}
          {tag(112, 40, "누락", "gap")}
          <text x="236" y="127" className="cd-why">야간만 있고 주간 조건 없음</text>
        </g>
      </svg>
      <figcaption className="bd-cap">
        <span className="cd-s1">① AI 제안 시험과 내 계획을 이어 봐요</span>
        <span className="cd-s2">② 조건이 일부만 같으면 부분 반영</span>
        <span className="cd-s3">③ 대응 항목이 없으면 누락</span>
      </figcaption>
    </figure>
  );
}
