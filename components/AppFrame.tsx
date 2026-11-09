"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type SideItem = { id: string; label: string; n?: number | string; href?: string; onClick?: () => void; on?: boolean; off?: boolean; icon?: React.ReactNode; sub?: string; done?: boolean };
export type SideLink = { label: string; href?: string; onClick?: () => void };

/**
 * 1·2·3단계 공통 화면 틀: 왼쪽 사이드바(분석 대상 · 메뉴 · 보조 링크) + 오른쪽 본문(경로 · 제목 · 내용).
 * 결과 화면의 Qase식 구성을 세 단계에 똑같이 쓴다.
 */
export function AppFrame({ target, items, links, crumb, title, desc, children }: {
  target: { k: string; name: string; meta?: React.ReactNode };
  items: SideItem[];
  links?: SideLink[];
  crumb: string[];
  title: string;
  desc?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rs">
      <aside className="rs-side" aria-label="화면 메뉴">
        <div className="rs-target">
          <div className="rs-k">{target.k}</div>
          <div className="rs-name">{target.name}</div>
          {target.meta && <div className="rs-meta">{target.meta}</div>}
        </div>
        <nav className="rs-nav">
          {items.map((n) => {
            const inner = n.icon ? (
              <><span className={`rs-ic ${n.done ? "done" : ""}`} aria-hidden>{n.icon}</span><span className="rs-lab">{n.label}{n.sub && <small>{n.sub}</small>}</span>{n.n !== undefined && <em>{n.n}</em>}</>
            ) : <><span>{n.label}</span>{n.n !== undefined && <em>{n.n}</em>}</>;
            const cls = `${n.on ? "on" : ""} ${n.off ? "off" : ""} ${n.icon ? "with-ic" : ""}`;
            return n.href ? (
              <a key={n.id} href={n.href} className={cls} aria-current={n.on ? "location" : undefined}
                onClick={(e) => { if (n.off) { e.preventDefault(); return; } n.onClick?.(); }} aria-disabled={n.off || undefined}>{inner}</a>
            ) : (
              <button key={n.id} type="button" className={cls} aria-current={n.on ? "page" : undefined} disabled={n.off} onClick={n.onClick}>{inner}</button>
            );
          })}
        </nav>
        {links && links.length > 0 && (
          <div className="rs-side-foot">
            {links.map((l) => l.href
              ? <Link key={l.label} href={l.href}>{l.label}</Link>
              : <button key={l.label} type="button" onClick={l.onClick}>{l.label}</button>)}
          </div>
        )}
      </aside>

      <div className="rs-main">
        <header className="rs-head">
          <div className="rs-crumb">{crumb.map((c, i) => <span key={i}>{i > 0 && <span className="sep">/</span>}{c}</span>)}</div>
          {title && <h1>{title}</h1>}
          {desc && <p className="rs-desc">{desc}</p>}
        </header>
        {children}
      </div>
    </div>
  );
}

/** 화면 안 섹션 중 지금 보이는 것 (사이드바 강조용) */
export function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  const key = ids.join(",");
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    const onScroll = () => {
      const y = window.scrollY + 140;
      let cur = els[0].id;
      for (const el of els) if (el.offsetTop <= y) cur = el.id;
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) cur = els[els.length - 1].id;
      setActive(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return active;
}
