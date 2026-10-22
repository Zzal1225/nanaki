import { execSync } from 'node:child_process';
import { createSerwistRoute } from '@serwist/turbopack';
import { cacheLife } from 'next/cache';

// 서비스 워커 파일(/serwist/sw.js)을 내주는 Route Handler.
// Turbopack은 아직 webpack 플러그인을 쓸 수 없어서, Serwist는 이 경로에서 src/sw/sw.ts를 esbuild로 묶고
// 미리 받을 파일 목록(.next/static)을 끼워 넣는다.
//
// Serwist 문서는 [path] 동적 세그먼트 + route segment 설정(dynamic = 'force-static')을 쓰는데,
// cacheComponents에서는 그 설정을 쓸 수 없고, 빼면 요청마다 서버에서 다시 묶는 경로(ƒ)가 된다.
// 배포 서버에는 개발용 esbuild도 .next/static 원본도 없어서 실패할 수 있다 →
// 파일 이름을 고정한 경로(sw.js)로 두고, 요청을 읽지 않는 GET으로 만들어 빌드 때 한 번 미리 만든다(○)

// 오프라인 대체 화면은 빌드마다 새로 받게 커밋 해시를 버전으로 쓴다.
// Vercel은 커밋 해시를 환경 변수로 주고, 로컬·CI는 git으로 읽는다. 둘 다 없으면 무작위
function getRevision(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA;
  }
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return crypto.randomUUID();
  }
}

const serwistRoute = createSerwistRoute({
  swSrc: 'src/sw/sw.ts',
  additionalPrecacheEntries: [{ url: '/~offline', revision: getRevision() }],
  // Windows(로컬)·Linux(CI·Vercel) 모두 기본 esbuild를 쓴다. wasm판은 따로 설치해야 한다
  useNativeEsbuild: true,
});

// 'use cache': 묶은 결과를 캐시해 빌드 때 미리 만든 정적 파일로 나간다 (cacheComponents의 정적 처리 방식).
// 없으면 묶는 과정이 시각·파일을 읽어 "요청 때 실행"으로 분류된다.
// Serwist의 GET은 [path] 값을 받아 그 파일을 고른다. 여기서는 sw.js 하나뿐이라 고정해서 넘긴다
async function buildServiceWorker(): Promise<string> {
  'use cache';
  // 시간이 지나도 다시 만들지 않는다: 기본값(15분)이면 배포 서버가 요청 때 다시 묶으려 한다. 새 버전은 새 배포가 만든다
  cacheLife({ revalidate: Infinity, expire: Infinity });
  const response = await serwistRoute.GET(
    new Request('http://localhost/serwist/sw.js'),
    { params: Promise.resolve({ path: 'sw.js' }) },
  );
  return response.text();
}

export async function GET() {
  return new Response(await buildServiceWorker(), {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      // 파일은 /serwist/ 아래에 있지만 앱 전체(/)를 맡게 한다. 없으면 /serwist/ 아래 요청만 가로챌 수 있다
      'Service-Worker-Allowed': '/',
    },
  });
}
