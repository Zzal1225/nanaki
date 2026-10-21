import type { init } from '@sentry/nextjs';

// Sentry(오류 모니터링)의 공통 설정. 브라우저·서버·엣지 세 곳의 Sentry.init이 이 함수 하나를 쓴다.
// process.env와 떼어 놓아 "언제 켜지는지, 무엇을 보내지 않는지"를 단위 테스트로 확인할 수 있게 한다

// 성능 추적(트레이스)은 요청 10개 중 1개만: 무료 플랜 한도 안에서 느린 화면을 찾기에 충분하다.
// 오류는 이 비율과 상관없이 전부 보낸다
const PRODUCTION_TRACES_SAMPLE_RATE = 0.1;

type SentryEnv = {
  // NEXT_PUBLIC_SENTRY_DSN. 브라우저도 써야 해서 NEXT_PUBLIC_ (DSN은 보낼 주소일 뿐 비밀이 아니다)
  dsn: string | undefined;
  // Vercel이 넣는 배포 종류: production / preview / development. 로컬·CI에는 없다
  vercelEnv: string | undefined;
};

// Sentry.init이 받는 옵션 타입에서 꺼내 쓴다 (손으로 쓰면 SDK가 바뀔 때 어긋난다)
type SentryOptions = NonNullable<Parameters<typeof init>[0]>;

// 개인 데이터를 보내지 않는다. Sentry v11의 dataCollection은 기본값이 "전부 수집"이라 하나씩 꺼야 한다.
// 특히 HTTP 본문: Supabase로 가는 요청·응답 본문에 기록 내용(금액·메모·후기)이 그대로 들어 있다.
// 오류를 고치는 데는 스택(어느 코드 줄)과 화면 주소면 충분하다
const NO_PERSONAL_DATA: SentryOptions['dataCollection'] = {
  // user.id·IP 등을 자동으로 붙이지 않는다
  userInfo: false,
  // 쿠키에 로그인 세션 토큰이 있다
  cookies: false,
  httpHeaders: false,
  // 빈 배열 = 요청·응답 본문을 하나도 담지 않는다
  httpBodies: [],
  // Supabase 조회 주소의 쿼리(필터 조건, step2의 검색어)에도 기록 내용이 섞일 수 있다
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  // step3 나키(AI)에 Sentry AI 연동을 붙이더라도 질문·답이 실리지 않게 미리 끈다
  genAI: { inputs: false, outputs: false },
};

export function getSentryInitOptions({
  dsn,
  vercelEnv,
}: SentryEnv): SentryOptions {
  const environment = vercelEnv ?? 'local';
  return {
    dsn,
    // DSN이 있는 곳(Vercel 배포)에서만 켠다. 로컬 개발·CI·테스트에는 DSN을 넣지 않아서 꺼진다:
    // 테스트용 빌드의 오류나 개발 중 실수가 실제 오류 목록에 섞이지 않게
    enabled: Boolean(dsn),
    // Sentry 화면에서 실제 서비스(production)와 PR 미리보기(preview) 오류를 나눠 보려고
    environment,
    tracesSampleRate:
      environment === 'production' ? PRODUCTION_TRACES_SAMPLE_RATE : 0,
    // 화면 녹화(Session Replay) 연동은 넣지 않는다: 사용자가 쓴 기록 화면이 영상에 그대로 담긴다
    dataCollection: NO_PERSONAL_DATA,
  };
}
