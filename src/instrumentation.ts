// 서버가 시작될 때 Next.js가 한 번 부른다 (instrumentation 파일 규칙). Node 서버와 엣지(proxy)는 따로 시작한다
import * as Sentry from '@sentry/nextjs';
import { getSentryInitOptions } from '@/lib/sentry/sentryOptions';

export function register() {
  // 세 곳(브라우저·Node·엣지)이 같은 설정 함수를 써서 개인정보 설정이 어긋나지 않는다
  Sentry.init(
    getSentryInitOptions({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      vercelEnv: process.env.VERCEL_ENV,
    }),
  );
}

// 서버 컴포넌트·Route Handler·proxy에서 처리되지 않은 오류를 Sentry로 보낸다
export const onRequestError = Sentry.captureRequestError;
