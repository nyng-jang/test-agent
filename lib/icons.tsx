/** 단계·섹션 아이콘 (인라인 SVG, currentColor) */
const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const S = (d: React.ReactNode) => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden {...P}>{d}</svg>;

export const ICON = {
  doc: S(<><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="M10 12h5M10 16h5" /></>),
  blocks: S(<><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M4 7.5l8 4.5 8-4.5M12 12v9" /></>),
  req: S(<><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1" /><path d="M9 10h6M9 14h6M9 18h3" /></>),
  premise: S(<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1" /></>),
  hazard: S(<><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></>),
  info: S(<><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5h.01" /></>),
  check: S(<path d="M5 12.5l4.5 4.5L19 7.5" />),
  plan: S(<><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1" /><path d="M8.5 12.5l2 2 4-4.5" /></>),
};
