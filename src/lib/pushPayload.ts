// 푸시 알림 내용 (35a 서비스 워커가 읽고, 35b Edge Function이 같은 모양으로 보낸다): { title, body, url, tag }.
// 서비스 워커에 들어가는 코드라 Zod 없이 직접 검사한다 (워커 파일을 가볍게)

export type PushPayload = {
  title: string;
  body: string;
  // 알림을 누르면 열 앱 안 주소. 같은 사이트 경로만 ('/'로 시작, '//'는 다른 사이트라 막는다)
  url: string;
  // 같은 tag의 알림은 새 것이 옛 것을 바꾼다 (같은 루틴 알림이 쌓이지 않게)
  tag?: string;
};

const DEFAULT_TITLE = 'nanaki';
const MAX_TEXT_LENGTH = 200;

function readText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim()
    ? value.slice(0, MAX_TEXT_LENGTH)
    : fallback;
}

function isAppPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//')
  );
}

// 모양이 틀려도 알림은 띄운다: 받은 푸시마다 알림을 보여 주겠다고 약속했다 (userVisibleOnly, 어기면 브라우저가 구독을 끊을 수 있다)
export function parsePushPayload(value: unknown): PushPayload {
  const data =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};
  return {
    title: readText(data.title, DEFAULT_TITLE),
    body: readText(data.body, ''),
    url: isAppPath(data.url) ? data.url : '/',
    ...(typeof data.tag === 'string' && data.tag ? { tag: data.tag } : {}),
  };
}
