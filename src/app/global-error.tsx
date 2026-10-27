'use client';

// 'use client' 이유: 오류 경계(error boundary)는 브라우저에서 오류를 받아 다시 그리는 컴포넌트라서
import { useEffect } from 'react';
import { getBrowserSentry } from '@/lib/sentry/browserSentry';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

// 앱 틀(root layout)까지 깨졌을 때 Next.js가 그리는 마지막 화면. 틀이 없으므로 html·body를 직접 그린다.
// 디자인 토큰(globals.css)도 못 쓸 수 있어 꾸미지 않고, 다시 시도할 길만 준다
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  // 화면 오류는 서버를 거치지 않아 onRequestError로 잡히지 않는다. 여기서 직접 보낸다.
  // Sentry를 직접 import하지 않는 이유: 그러면 이 파일 때문에 본체가 첫 화면 조각에 다시 실린다. 아직 안 켜졌으면 이때 받는다
  useEffect(() => {
    getBrowserSentry().captureException(error);
  }, [error]);

  return (
    <html lang='ko'>
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
        <h1 style={{ fontSize: 20 }}>문제가 생겼어요</h1>
        <p>잠시 후 다시 시도해 주세요. 계속되면 앱을 새로 열어 주세요.</p>
        <button type='button' onClick={reset} style={{ minHeight: 44 }}>
          다시 시도
        </button>
      </body>
    </html>
  );
}
