// Sentry를 나중에 받을 때(browserSentry) 이 파일을 거쳐 받는다.
// import('@sentry/nextjs')로 바로 받으면 번들러가 어떤 함수를 쓸지 몰라 패키지 전체(화면 녹화 Replay·피드백 위젯 포함)를
// 한 조각에 담는다(압축 192KiB). 여기서 쓰는 이름만 정적으로 꺼내 두면 쓰지 않는 코드는 빠진다(약 80KiB, 바꾸기 전과 같은 크기)
export {
  captureException,
  captureRouterTransitionStart,
  init,
} from '@sentry/nextjs';
