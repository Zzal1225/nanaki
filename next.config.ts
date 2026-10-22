import { withSentryConfig } from '@sentry/nextjs/config';
import { withSerwist } from '@serwist/turbopack';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

// Sentry 빌드 설정: 빌드가 끝나면 소스맵을 Sentry에 올려, 오류 위치를 압축된 코드가 아니라 원래 소스 줄로 보이게 한다.
// 올리려면 SENTRY_AUTH_TOKEN(비밀, Vercel 환경 변수에만)이 필요하다. 토큰이 없는 곳(CI, 로컬)은 올리기만 건너뛰고 빌드는 성공한다.
// 오류를 보내는 설정(DSN, 개인정보)은 여기가 아니라 src/lib/sentry/sentryOptions.ts
// withSerwist: 서비스 워커를 묶는 esbuild를 서버 번들에 넣지 않고 node_modules에서 그대로 쓰게 한다 (serverExternalPackages).
// 서비스 워커 파일 자체는 src/app/serwist/[path]/route.ts가 빌드 때 만든다
export default withSentryConfig(withSerwist(nextConfig), {
  org: 'nanaki',
  project: 'javascript-nextjs',
  // 업로드 로그는 CI에서만 보인다
  silent: !process.env.CI,
  // 앱 코드뿐 아니라 Next.js가 만든 브라우저 파일 소스맵까지 올려 스택이 끊기지 않게 (빌드가 조금 길어진다)
  widenClientFileUpload: true,
  // 오류 전송을 우리 서버 주소로 우회하는 tunnelRoute는 쓰지 않는다: proxy가 그 주소를 로그인 화면으로 보내
  // 로그인 전 오류가 사라지고, 요청마다 서버 실행 비용이 든다. 광고 차단기에 일부 오류가 막히는 것은 감수한다
});
