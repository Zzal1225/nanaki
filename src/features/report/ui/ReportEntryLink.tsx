import { BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { REPORT_PATH } from '../reportModel';

// 기록 탭 검색창 옆 "보고서" (시안 7번: 검색창 · 📊 보고서). step4부터 보인다 (CLAUDE.md: 미구현 기능은 숨김).
// 검색창과 같은 높이(48px)·테두리로 한 줄에 놓는다. 모바일은 아이콘만: 375px에서 글자까지 두면 검색창 안내 문구가 두 줄로 꺾였다
// (2026-10-24 확인). 글자는 sr-only로 남겨 화면 읽기 프로그램·테스트에는 늘 "보고서"로 읽힌다. 링크라서 서버 컴포넌트로 둔다
export default function ReportEntryLink() {
  return (
    <Link
      href={REPORT_PATH}
      className='inline-flex h-12 min-w-12 shrink-0 items-center justify-center gap-1.5 rounded-md border border-border bg-surface text-body-sm font-medium text-fg-primary hover:bg-surface-hover active:bg-surface-pressed md:px-3'
    >
      <BarChart3
        aria-hidden='true'
        size={ICON_SIZE.md}
        strokeWidth={ICON_STROKE_WIDTH}
      />
      <span className='sr-only md:not-sr-only'>보고서</span>
    </Link>
  );
}
