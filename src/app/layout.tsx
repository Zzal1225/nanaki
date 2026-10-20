import type { Metadata } from 'next';
import ThemeSync from '@/shared/theme/ThemeSync';
import { THEME_INIT_SCRIPT } from '@/shared/theme/themeInitScript';
// 동적 서브셋: 글자를 92조각으로 나눠 두고 화면에 나온 글자가 든 조각만 받는다 (전체 파일은 약 2MB).
// CDN 대신 패키지로 불러와서 우리 도메인에서 제공하고, 나중에 오프라인 캐시에도 넣을 수 있다
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './globals.css';

export const metadata: Metadata = {
  // 화면마다 title만 정하면 '기록 · nanaki'처럼 뒤에 앱 이름이 붙는다
  title: { default: 'nanaki', template: '%s · nanaki' },
  description:
    '가계부·후기·운동·루틴·체형을 하나의 캘린더에 기록하는 자기관리 앱',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang='ko'
      className='h-full antialiased'
      // 인라인 스크립트가 React보다 먼저 dark 클래스를 붙여서 서버 HTML과 달라지는 게 의도된 동작이다
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className='min-h-full flex flex-col'>
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
