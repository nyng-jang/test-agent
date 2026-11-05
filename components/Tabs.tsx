"use client";

import { useRef } from "react";

export interface TabDef { id: string; label: string; badge?: React.ReactNode }

/**
 * 접근성 있는 탭: role=tablist/tab/tabpanel 연결, 방향키·Home·End 이동, 선택된 탭만 Tab 키로 들어감.
 * 좁은 화면에서는 같은 탭을 드롭다운으로도 고를 수 있다.
 */
export function Tabs({ tabs, value, onChange, idPrefix, label }: {
  tabs: TabDef[]; value: string; onChange: (id: string) => void; idPrefix: string; label: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    let n = -1;
    if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = tabs.length - 1;
    if (n < 0) return;
    e.preventDefault();
    onChange(tabs[n].id);
    refs.current[n]?.focus();
  };
  return (
    <div className="tabs-wrap">
      <div className="subtabs" role="tablist" aria-label={label}>
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => { refs.current[i] = el; }}
            role="tab"
            id={`${idPrefix}-tab-${t.id}`}
            aria-controls={`${idPrefix}-panel-${t.id}`}
            aria-selected={value === t.id}
            tabIndex={value === t.id ? 0 : -1}
            className="subtab"
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {t.label}{t.badge != null && <span className="cnt">{t.badge}</span>}
          </button>
        ))}
      </div>
      <label className="tab-select">
        <span className="sr-only">{label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {tabs.map((t) => <option key={t.id} value={t.id}>{t.label}{t.badge != null ? ` (${t.badge})` : ""}</option>)}
        </select>
      </label>
    </div>
  );
}

export function TabPanel({ idPrefix, id, children }: { idPrefix: string; id: string; children: React.ReactNode }) {
  return (
    <div role="tabpanel" id={`${idPrefix}-panel-${id}`} aria-labelledby={`${idPrefix}-tab-${id}`} tabIndex={0} className="tabpanel">
      {children}
    </div>
  );
}
