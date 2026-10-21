// 브라우저에서 앱이 시작될 때 Next.js가 한 번 부른다 (instrumentation-client 파일 규칙). Sentry 브라우저 쪽 시작
import * as Sentry from '@sentry/nextjs';
import { getSentryInitOptions } from '@/lib/sentry/sentryOptions';

// NEXT_PUBLIC_ 값은 빌드할 때 코드에 박히므로 process.env.이름 그대로 읽는다 (변수로 꺼내면 비어 있다)
Sentry.init(
  getSentryInitOptions({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
  }),
);

// 화면 이동을 성능 추적의 한 구간으로 기록한다 (어느 화면 전환이 느린지)
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
