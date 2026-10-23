// 다른 사이트가 사용자 몰래(로그인 쿠키를 실어) 우리 API를 부르는 것(CSRF)을 막는 확인.
// 브라우저는 다른 출처에서 보낸 POST·DELETE에 Origin 헤더를 붙이고, 페이지 스크립트는 그 값을 바꿀 수 없다.
//
// 비교 대상은 request.url이 아니라 요청의 Host(프록시를 거치면 X-Forwarded-Host)다:
// 직접 띄운 Next(npm start)는 요청 헤더와 상관없이 request.url을 http://localhost:포트로 만든다.
// 그래서 실기기 확인용 터널(cloudflared)로 열면 Origin(https://…trycloudflare.com)과 늘 달라
// 나키 질문이 모두 "질문을 보내지 못했어요"(403)로 끝났다 (2026-10-23).
// Host 헤더도 브라우저가 정하고 스크립트가 바꿀 수 없어서, 다른 사이트의 요청은 여전히 막힌다.
// 스킴(http/https)은 보지 않는다: 프록시 뒤에서는 서버가 받는 스킴과 브라우저의 스킴이 다르다
export function isSameOrigin(headers: Headers): boolean {
  const origin = headers.get('origin');
  if (!origin) return false;
  const host = headers.get('x-forwarded-host') ?? headers.get('host');
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
