import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '설계공모 AI - 유사 사례 검색',
  description: '설계공모 지침서를 분석하고 유사 국내 설계공모 사례를 찾아주는 AI 서비스',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
