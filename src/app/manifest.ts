import type { MetadataRoute } from 'next';

// 웹 앱 매니페스트 (/manifest.webmanifest). 있으면 브라우저가 "홈 화면에 추가"로 설치하게 해 주고,
// 설치한 앱은 주소창 없이 전체 화면(standalone)으로 열린다 (2026-10-22 사용자 결정: 25a에 설치 포함).
// 색은 tokens.json 라이트 값: 시작 화면 바탕 = bg, 상태 표시줄 = accent
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'nanaki',
    short_name: 'nanaki',
    description:
      '가계부·후기·운동·루틴·체형을 하나의 캘린더에 기록하는 자기관리 앱',
    lang: 'ko',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f7f7f8',
    theme_color: '#2e7d4f',
    // PNG 512(사용자가 만든 아이콘)를 먼저 둔다: 설치 화면·스플래시는 PNG를 더 넓게 지원한다.
    // SVG는 크기 무관(sizes: any) 대비책, maskable은 기기가 원·둥근 사각형으로 잘라도 그림이 남게 안쪽 80%에만 그렸다
    icons: [
      {
        src: '/icons/nanaki-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
