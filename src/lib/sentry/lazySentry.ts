import type * as SentryModule from '@sentry/nextjs';

// Sentry를 첫 화면 뒤에 켜기 위한 껍데기 (2026-10-27, Lighthouse 3단계 3-2).
// Sentry 브라우저 SDK는 압축 약 80KiB라, 앱이 시작될 때 바로 불러오면 모든 화면에서 첫 화면(LCP)보다 먼저 받는다.
// Lighthouse는 LCP 전에 시작된 요청을 느린 망에서 다시 계산하므로 이 80KiB가 그대로 LCP 추정에 더해졌다 (docs/performance.md).
// 늦게 켜면 생기는 빈틈 두 가지를 여기서 메운다:
// 1) 켜지기 전에 난 오류: 브라우저 오류 이벤트를 직접 받아 모아 두고, 켜지면 한꺼번에 보낸다
// 2) 켜지기 전 화면 이동 기록: 놓친다. 첫 화면 성능(pageload)은 Sentry가 켜질 때 브라우저의 기록(timeOrigin·버퍼된 LCP)을 읽어서 남는다
// 고르지 않은 것: Sentry의 "Loader Script"(CDN에서 받는 방식) — 다른 출처 연결이 하나 늘고, 빌드의 소스맵·설정과 따로 논다

// 이 파일이 쓰는 Sentry 기능만. 테스트에서 가짜를 넣기 쉽게 좁혀 둔다
export type SentryLike = Pick<
  typeof SentryModule,
  'captureException' | 'captureRouterTransitionStart'
>;

type EventTarget = Pick<Window, 'addEventListener' | 'removeEventListener'>;

export type LazySentry = {
  // 불러오기 + init. 여러 번 불러도 한 번만 받는다
  start: () => Promise<SentryLike>;
  captureException: (error: unknown) => void;
  captureRouterTransitionStart: SentryLike['captureRouterTransitionStart'];
};

export function createLazySentry(
  load: () => Promise<SentryLike>,
  target: EventTarget,
): LazySentry {
  let sentry: SentryLike | null = null;
  let loading: Promise<SentryLike> | null = null;
  const earlyErrors: unknown[] = [];

  // error 이벤트의 error가 비는 경우가 있다(다른 출처 스크립트는 "Script error."만 온다) → 그때는 문구라도
  const onError = (event: ErrorEvent) =>
    earlyErrors.push(event.error ?? event.message);
  const onRejection = (event: PromiseRejectionEvent) =>
    earlyErrors.push(event.reason);
  target.addEventListener('error', onError);
  target.addEventListener('unhandledrejection', onRejection);

  function start() {
    loading ??= load().then(
      (loaded) => {
        // init이 끝난 뒤부터는 Sentry가 직접 전역 오류를 받는다. 우리 수집을 떼야 같은 오류가 두 번 가지 않는다
        target.removeEventListener('error', onError);
        target.removeEventListener('unhandledrejection', onRejection);
        sentry = loaded;
        for (const error of earlyErrors.splice(0))
          loaded.captureException(error);
        return loaded;
      },
      (error: unknown) => {
        // 받기에 실패하면(오프라인 첫 방문 등) 다음 부를 때 다시 시도한다. 모아 둔 오류는 그대로 둔다
        loading = null;
        throw error;
      },
    );
    return loading;
  }

  return {
    start,
    captureException(error) {
      // 보고가 실패해도 화면에 또 다른 오류(처리 안 된 Promise)를 만들지 않는다
      start()
        .then((loaded) => loaded.captureException(error))
        .catch(() => {});
    },
    captureRouterTransitionStart(...args) {
      sentry?.captureRouterTransitionStart(...args);
    },
  };
}
