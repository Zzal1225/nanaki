'use client';

// 'use client' 이유: beforeSend는 함수라 서버 컴포넌트(layout)에서 props로 넘길 수 없다
import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next';
import { readAnalyticsOptOut, sanitizeAnalyticsEvent } from './analyticsEvent';

function beforeSend(event: BeforeSendEvent) {
  return sanitizeAnalyticsEvent(event, readAnalyticsOptOut());
}

// 실제 서비스에서만 켠다. 집계 스크립트(/_vercel/insights)는 Vercel 배포에만 있어서, CI·로컬 빌드에서는 404가 나
// Lighthouse "콘솔 오류" 점수를 깎는다. NEXT_PUBLIC_ 값은 빌드 때 박히므로 process.env.이름 그대로 읽는다 (browserSentry와 같음)
export default function SiteAnalytics() {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production') return null;
  return <Analytics beforeSend={beforeSend} />;
}
