import { createLazySentry, type LazySentry } from './lazySentry';
import { getSentryInitOptions } from './sentryOptions';

// 브라우저에 하나뿐인 Sentry 입구. instrumentation-client(앱 시작)와 global-error(마지막 오류 화면)가 같이 쓴다.
// 처음 부를 때 만든다: global-error는 서버에서도 그려져서, 파일을 읽기만 해도 window를 건드리면 서버에서 깨진다
let instance: LazySentry | null = null;

export function getBrowserSentry(): LazySentry {
  instance ??= createLazySentry(
    () =>
      import('./sentryBrowserEntry').then((Sentry) => {
        // NEXT_PUBLIC_ 값은 빌드할 때 코드에 박히므로 process.env.이름 그대로 읽는다 (변수로 꺼내면 비어 있다)
        Sentry.init(
          getSentryInitOptions({
            dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
            vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
          }),
        );
        return Sentry;
      }),
    window,
  );
  return instance;
}

// 한가할 때를 못 기다리는 경우의 상한. 계속 바쁜 화면이라도 이 안에는 켠다
const IDLE_TIMEOUT_MS = 3000;
// requestIdleCallback이 없는 브라우저(사파리)에서 load 뒤 기다리는 시간
const FALLBACK_DELAY_MS = 1000;

// 첫 화면을 다 받은 뒤(load) 한가할 때 Sentry를 받는다.
// load 전에 시작하면 그 요청이 LCP 전 요청에 섞여 늦게 켜는 의미가 없다
export function startAfterLoad(start: () => void) {
  const schedule = () => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(start, { timeout: IDLE_TIMEOUT_MS });
    } else {
      setTimeout(start, FALLBACK_DELAY_MS);
    }
  };
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
}
