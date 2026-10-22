import type { Metadata, Viewport } from 'next';
import { SerwistProvider } from '@serwist/turbopack/react';
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
  // 아이폰 "홈 화면에 추가": 주소창 없이 열고, 홈 화면 이름은 nanaki. 매니페스트는 app/manifest.ts를 Next가 자동으로 연결한다
  appleWebApp: { capable: true, title: 'nanaki', statusBarStyle: 'default' },
  // 아이폰 홈 화면 아이콘은 매니페스트가 아니라 apple-touch-icon(PNG 180×180)을 읽는다. SVG는 쓰지 않는다
  icons: { apple: '/icons/nanaki-icon-180.png' },
};

// 설치한 앱의 상태 표시줄 색. 다크모드에서는 바탕색과 맞춘다 (tokens.json bg)
export const viewport: Viewport = {
  // cover: 화면을 아이폰 홈 막대 영역까지 쓰겠다고 알린다. 이게 있어야 env(safe-area-inset-bottom)이 0이 아닌
  // 실제 홈 막대 높이가 되고, 하단 탭·스피드 다이얼·토스트·저장 버튼이 그만큼 올라간다 (--tab-bar-height).
  // 없을 때는 여백이 0이라 홈 화면에 추가한 앱에서 하단 탭이 홈 막대에 가려졌다 (2026-10-22 사용자 확인)
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f7f8' },
    { media: '(prefers-color-scheme: dark)', color: '#121214' },
  ],
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
      {/* 위쪽 여백 = env(safe-area-inset-top). 상태 표시줄 뒤까지 그리는 설정(black-translucent)일 때만 0이 아니다.
          지금 설정(default)의 아이폰 홈 화면 앱에서는 0으로 재졌다(2026-10-22, iOS 18.7): 앱 화면이 상태 표시줄 아래에서 시작한다.
          스크롤하면 글자가 상태 표시줄과 겹치던 문제는 여백이 아니라 스크롤 방식으로 막는다 (globals.css display-mode: standalone) */}
      <body className='min-h-full flex flex-col pt-[env(safe-area-inset-top)]'>
        <ThemeSync />
        {/* 서비스 워커 등록 (src/sw/sw.ts).
            - 개발 서버에서는 끈다: 고친 코드가 캐시에 가려 안 보이는 일을 막는다
            - reloadOnOnline 끔: 기본값은 연결이 돌아오면 페이지를 새로 고쳐, 쓰던 폼 입력이 사라진다
            - cacheOnNavigation(기본 켬): 앱 안에서 화면을 옮길 때마다 그 주소를 저장해 둔다 → 한 번 연 화면은 오프라인에서 열린다 */}
        <SerwistProvider
          swUrl='/serwist/sw.js'
          disable={process.env.NODE_ENV === 'development'}
          reloadOnOnline={false}
        >
          {children}
        </SerwistProvider>
      </body>
    </html>
  );
}
