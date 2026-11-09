"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GLOSSARY, type GlossaryKey } from "@/lib/glossary";

/**
 * 전문 용어 + ⓘ 도움말. 마우스를 올리거나 ⓘ를 누르면(터치 포함) 한두 문장 설명이 뜬다.
 * 용어 자체는 바꾸지 않고, 처음 나오는 자리에만 쓴다.
 */
export function Term({ k, children }: { k: GlossaryKey; children?: React.ReactNode }) {
  const g = GLOSSARY[k];
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
  const shown = open || hover;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <span className="term" ref={ref} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {children ?? g.term}
      <button type="button" className="term-i" aria-label={`${g.term} 설명`} aria-expanded={open} aria-describedby={shown ? id : undefined}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}>i</button>
      {shown && (
        <span role="tooltip" id={id} className="term-pop">
          <b>{g.term}</b>
          <span>{g.text}</span>
        </span>
      )}
    </span>
  );
}
