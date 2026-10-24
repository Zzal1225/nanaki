import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RECORD_TYPE_ORDER } from '@/features/records/entry/newRecordMenu';
import TypeDetailFromUrl from '@/features/records/routes/TypeDetailFromUrl';

export const metadata: Metadata = {
  title: '타입별 기록',
};

// 타입은 다섯 개뿐이라 빌드 때 모두 미리 그린다(정적). 요청 때 그리는 부분이 남은 화면(◐)은
// 서비스 워커가 저장해 둔 HTML로 열면 불러오는 중에서 멈췄다 (25c-2 E2E). 다른 화면처럼 정적 한 장이어야 오프라인에서 열린다
export function generateStaticParams() {
  return RECORD_TYPE_ORDER.map((type) => ({ type }));
}

// 타입·달(?month=)은 브라우저가 주소에서 읽는다 (25c-2): 서버 HTML이 달마다 같아야
// 서비스 워커가 저장해 둔 타입 화면 한 장으로 다른 달도 오프라인에서 연다.
// 모바일·태블릿: 타입 화면 전체. PC: 타입 화면은 layout의 왼쪽 목록 자리(RecordsSidePanel)에 열리므로 오른쪽은 안내만
// (Issue #30, 시안 "타입 상세 (가계부)": 목록에서 기록을 눌러도 왼쪽 타입 목록이 남는다). 검색 화면과 같은 방식
export default function TypeDetailPage() {
  return (
    <>
      <div className='lg:hidden'>
        <Suspense fallback={<p className='sr-only'>타입별 기록을 여는 중</p>}>
          <TypeDetailFromUrl />
        </Suspense>
      </div>
      <p className='hidden h-full items-center justify-center text-body text-fg-secondary lg:flex'>
        기록을 고르면 여기에 보여요
      </p>
    </>
  );
}
