// 브라우저에서 앱이 시작될 때 Next.js가 한 번 부른다 (instrumentation-client 파일 규칙). Sentry 브라우저 쪽 시작.
// Sentry 본체는 첫 화면 뒤에 받는다(lib/sentry/lazySentry). 여기서는 그사이 오류를 모으기 시작하고, 받을 때를 예약만 한다
import { getBrowserSentry, startAfterLoad } from '@/lib/sentry/browserSentry';

const sentry = getBrowserSentry();
startAfterLoad(() => {
  // 실패해도 다음 오류 보고 때 다시 시도한다 (lazySentry)
  sentry.start().catch(() => {});
});

// 화면 이동을 성능 추적의 한 구간으로 기록한다 (어느 화면 전환이 느린지). Sentry가 켜지기 전 이동은 기록되지 않는다
export const onRouterTransitionStart = sentry.captureRouterTransitionStart;
