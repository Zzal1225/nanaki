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
    // 앱 아이콘 = 나키 아바타 (2026-10-23 사용자 결정, 전에는 새싹 선 그림). 원본은 public/icons/naki-avatar-512.png 하나이고
    // 아래 PNG는 그것으로 만든 것: any = 원 그대로(밖은 투명), maskable·아이폰(layout.tsx) = 원 밖을 같은 초록(#2e7d4f)으로 채운 정사각형.
    // 아바타의 초록이 테마색과 같아 채운 곳과 원의 경계가 보이지 않고, 그림은 안쪽 80% 원(maskable 안전 영역) 안에 있어 기기가 잘라도 남는다.
    // 192·512 둘 다: 크롬의 설치 조건이 두 크기를 요구한다 (예전 SVG(sizes: any)가 하던 대비책을 PNG 크기로 대신)
    icons: [
      {
        src: '/icons/nanaki-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/nanaki-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/nanaki-icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
