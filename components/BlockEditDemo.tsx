/**
 * 구성 블록 편집 방법을 보여주는 짧은 반복 애니메이션(약 9초).
 * ① 블록을 끌어 다른 칸으로 옮기기 → ② "+ 추가"로 블록 넣기 → ③ 이름을 눌러 고치기.
 * 순수 SVG + CSS 애니메이션. 동작 줄이기 설정이면 멈춘 그림으로 보인다.
 */
export function BlockEditDemo() {
  const col = (x: number, title: string) => (
    <g>
      <rect x={x} y="6" width="164" height="150" rx="10" className="bd-col" />
      <text x={x + 12} y="24" className="bd-colt">{title}</text>
    </g>
  );
  const block = (x: number, y: number, label: string, cls = "") => (
    <g className={cls}>
      <rect x={x} y={y} width="140" height="28" rx="6" className="bd-block" />
      <text x={x + 10} y={y + 18.5} className="bd-grip">⠿</text>
      <text x={x + 24} y={y + 18.5} className="bd-label">{label}</text>
    </g>
  );
  return (
    <figure className="bd" aria-label="구성 블록 편집 방법 애니메이션: 블록을 끌어 다른 칸으로 옮기고, + 추가로 블록을 넣고, 이름을 눌러 고칩니다.">
      <svg viewBox="0 0 540 164" role="img" aria-hidden>
        <g className="bd-scene">
          {col(4, "센서·입력")}
          {col(188, "처리·통신")}
          {col(372, "액추에이터·출력")}
          <path d="M172 82h12M356 82h12" className="bd-arrow" />

          {/* 처리·통신: 기존 블록 + 놓일 자리 */}
          {block(200, 34, "제어 MCU")}
          {block(200, 68, "CAN 통신")}
          <rect x="200" y="102" width="140" height="28" rx="6" className="bd-drop" />

          {/* 액추에이터: 기존 블록 + 새 블록 + 추가 버튼 */}
          {block(384, 34, "모터 드라이버")}
          {block(384, 68, "경고 부저", "bd-new")}
          <g className="bd-add">
            <rect x="384" y="68" width="140" height="28" rx="6" className="bd-addbox" />
            <text x="396" y="86.5" className="bd-addt">+ 추가</text>
          </g>

          {/* 센서: 이름을 고칠 블록 */}
          <g>
            <rect x="16" y="68" width="140" height="28" rx="6" className="bd-block bd-edit" />
            <text x="26" y="86.5" className="bd-grip">⠿</text>
            <text x="40" y="86.5" className="bd-label bd-old">버튼</text>
            <text x="40" y="86.5" className="bd-label bd-newname">비상 버튼 (이중 접점)</text>
            <rect x="40" y="76" width="1.6" height="14" className="bd-caret" />
          </g>

          {/* 끌어서 옮기는 블록 (센서 → 처리) */}
          {block(16, 34, "카메라", "bd-drag")}

          {/* 커서 */}
          <g className="bd-cursor">
            <path d="M0 0l0 16 4.5-4 3 7 2.6-1.1-3-6.9 6-.4z" className="bd-arrowcur" />
            <circle r="9" className="bd-click" />
          </g>
        </g>
      </svg>
      <figcaption className="bd-cap">
        <span className="bd-s1">① ⠿를 끌어 다른 칸으로 옮기기</span>
        <span className="bd-s2">② “+ 추가”로 빠진 블록 넣기</span>
        <span className="bd-s3">③ 이름을 눌러 바로 고치기</span>
      </figcaption>
    </figure>
  );
}
