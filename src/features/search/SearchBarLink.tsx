import { Search } from 'lucide-react';
import Link from 'next/link';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { SEARCH_PLACEHOLDER } from './searchState';

// 기록 탭 맨 위의 검색창 모양 링크 (시안 7번). 진짜 입력칸이 아니라 검색 화면(/records/search)으로 가는 링크:
// 여기서 바로 치게 하면 기록 탭 화면이 검색 결과로 바뀌어야 하는데, 결과는 별도 화면에 두기로 했다 (2026-10-22 사용자 결정).
// 링크라서 서버 컴포넌트로 둔다 (상태가 없다)
export default function SearchBarLink() {
  return (
    <Link
      href='/records/search'
      className='flex h-12 items-center gap-2 rounded-md border border-border bg-surface px-4 text-body text-fg-secondary hover:bg-surface-hover active:bg-surface-pressed'
    >
      <Search
        aria-hidden='true'
        size={ICON_SIZE.md}
        strokeWidth={ICON_STROKE_WIDTH}
      />
      {/* 화면 읽기 프로그램에는 "기록 검색"으로 읽힌다 (보이는 글자는 예시) */}
      <span className='sr-only'>기록 검색</span>
      {/* 실제로 찾는 칸을 적는다 (2026-10-22 사용자 결정). 결제수단·대상·종목도 찾지만 375px 검색창에 다 들어가지 않아 "분류"로 묶었다 */}
      <span aria-hidden='true'>{SEARCH_PLACEHOLDER}</span>
    </Link>
  );
}
