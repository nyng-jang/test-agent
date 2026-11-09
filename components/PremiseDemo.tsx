/**
 * 분석 전제 동작 안내 애니메이션(약 10초).
 * ① AI 가정 사용을 고르면 → ② 결과의 시험에 "AI 가정 기반"이 붙고 → ③ 직접 답하면 "사용자 확인"으로 바뀐다.
 */
export function PremiseDemo() {
  return (
    <figure className="bd" aria-label="분석 전제 동작 안내 애니메이션: AI 가정을 쓰면 결과의 시험에 AI 가정 기반 표시가 붙고, 직접 답하면 사용자 확인으로 바뀝니다.">
      <svg viewBox="0 0 540 168" role="img" aria-hidden>
        <g className="bd-scene">
          {/* 왼쪽: 1단계 질문 카드 */}
          <rect x="4" y="6" width="300" height="156" rx="10" className="bd-col" />
          <text x="16" y="24" className="bd-colt">1단계 · 분석 전제</text>
          <text x="16" y="44" className="bd-label">비가 와도 대회가 진행되나요?</text>
          <g className="pd-b1"><rect x="16" y="54" width="80" height="24" rx="6" className="pd-btn" /><text x="27" y="70" className="pd-bt">직접 답하기</text></g>
          <g className="pd-b2"><rect x="102" y="54" width="88" height="24" rx="6" className="pd-btn" /><text x="112" y="70" className="pd-bt">AI 가정 사용</text></g>
          <g><rect x="196" y="54" width="72" height="24" rx="6" className="pd-btn" /><text x="209" y="70" className="pd-bt">확인 필요</text></g>
          <g className="pd-assume"><rect x="16" y="86" width="276" height="26" rx="6" className="pd-box" /><text x="26" y="103" className="pd-small">AI가 쓰는 가정: 우천 시 중단 → 우천 시험 제외</text></g>
          <g className="pd-answer">
            <rect x="16" y="86" width="276" height="26" rx="6" className="bd-block pd-input" />
            <text x="26" y="103" className="pd-small pd-typed">우천에도 진행 (방수 시험 필요)</text>
          </g>
          <g className="pd-tag-ai"><rect x="16" y="124" width="58" height="22" rx="5" className="pd-tag ai" /><text x="26" y="139" className="pd-tt ai">AI 가정</text></g>
          <g className="pd-tag-fact"><rect x="16" y="124" width="70" height="22" rx="5" className="pd-tag fact" /><text x="25" y="139" className="pd-tt fact">사용자 확인</text></g>

          {/* 연결 화살표 */}
          <path d="M92 135 C 200 135, 260 100, 336 96" className="pd-link" />

          {/* 오른쪽: 결과 화면의 시험 */}
          <rect x="324" y="6" width="212" height="156" rx="10" className="bd-col" />
          <text x="336" y="24" className="bd-colt">3단계 · 결과</text>
          <rect x="336" y="38" width="188" height="40" rx="6" className="bd-block" />
          <text x="346" y="62" className="bd-label">TC-ENV-01 직사광선 인식</text>
          <rect x="336" y="84" width="188" height="62" rx="6" className="bd-block" />
          <text x="346" y="104" className="bd-label">TC-ENV-04 우천·습기 동작</text>
          <g className="pd-rtag-ai"><rect x="346" y="114" width="74" height="20" rx="5" className="pd-tag ai" /><text x="353" y="128" className="pd-tt ai">AI 가정 기반</text></g>
          <g className="pd-rtag-fact"><rect x="346" y="114" width="96" height="20" rx="5" className="pd-tag fact" /><text x="353" y="128" className="pd-tt fact">확인된 정보 기반</text></g>

          <g className="bd-cursor pd-cursor">
            <path d="M0 0l0 16 4.5-4 3 7 2.6-1.1-3-6.9 6-.4z" className="bd-arrowcur" />
            <circle r="9" className="bd-click pd-click" />
          </g>
        </g>
      </svg>
      <figcaption className="bd-cap">
        <span className="pd-s1">① 질문마다 처리 방법 고르기</span>
        <span className="pd-s2">② AI 가정은 결과 시험에 표시돼요</span>
        <span className="pd-s3">③ 직접 답하면 확인된 정보가 돼요</span>
      </figcaption>
    </figure>
  );
}
