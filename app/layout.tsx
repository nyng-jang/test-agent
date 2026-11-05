import type { Metadata } from "next";
import { FlowProvider } from "@/lib/flow";
import "./globals.css";

export const metadata: Metadata = {
  title: "시험항목 누락 탐지 에이전트",
  description: "사람이 짠 시험 계획에서 빠진 시험 조건을 찾아주는 HW 평가·검증 보조 도구",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <FlowProvider>{children}</FlowProvider>
      </body>
    </html>
  );
}
