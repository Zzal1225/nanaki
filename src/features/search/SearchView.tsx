'use client';

// 'use client' 이유: 주소(?q=&type=&sort=)를 읽고 바꾸며, 검색 결과를 브라우저에서 불러온다(TanStack Query)
import { ChevronDown, ChevronLeft, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useId, useRef, useState } from 'react';
import { SEARCH_RESULT_LIMIT } from '@/features/records/api/recordStore';
import { MAX_SEARCH_KEYWORD_LENGTH } from '@/features/records/api/searchQuery';
import { useSearchRecords } from '@/features/records/hooks/useSearchRecords';
import RecentRecordItem from '@/features/records/overview/RecentRecordItem';
import { RECORD_TYPE_CONFIG } from '@/features/records/schema/recordTypes';
import {
  getListTitle,
  getListValue,
} from '@/features/records/ui/recordPresentation';
import { useVisibleTypes } from '@/features/settings/hooks/useUserSettings';
import { formatShortDate } from '@/shared/date/formatDisplayDate';
import Button from '@/shared/ui/Button';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { countByType, filterByType } from './searchResults';
import {
  hasSearchCondition,
  parseSearchState,
  toSearchHref,
  toSearchParams,
  type SearchState,
} from './searchState';
import TypeFilterChips from './TypeFilterChips';

// 검색 화면 (시안 14a). 모바일은 /records/search 전체 화면, PC는 기록 탭 왼쪽 목록 자리(RecordsSidePanel).
// cacheComponents: 주소의 검색 조건은 요청 때만 알 수 있어서 useSearchParams를 Suspense 안에서 읽는다
export default function SearchView() {
  return (
    <Suspense fallback={<div aria-busy='true' className='h-14' />}>
      <SearchViewContent />
    </Suspense>
  );
}

function SearchViewContent() {
  const router = useRouter();
  const pathname = usePathname();
  const state = parseSearchState(useSearchParams());
  const visibleTypes = useVisibleTypes();
  // 설정에서 끈 타입이 주소에 남아 있으면(예전에 저장한 주소) 전체로 본다. 칩이 없는 타입이 골라진 채로 남지 않게
  const type =
    state.type && visibleTypes.includes(state.type) ? state.type : null;

  const isActive = hasSearchCondition({ ...state, type });
  const search = useSearchRecords(
    isActive ? { keyword: state.keyword, sort: state.sort } : null,
  );
  const entries = search.data?.entries ?? [];
  const results = filterByType(entries, type, visibleTypes);
  const detailQuery = toSearchParams({ ...state, type });

  // 모든 바꾸기는 replace: 검색어·칩을 바꿀 때마다 방문 기록이 쌓이면 뒤로 가기를 여러 번 눌러야 기록 탭에 돌아간다.
  // scroll: false: 칩을 바꿔도 화면이 맨 위로 튀지 않게
  function update(next: Partial<SearchState>) {
    router.replace(toSearchHref({ ...state, type, ...next }), {
      scroll: false,
    });
  }

  return (
    <div className='mx-auto flex w-full max-w-xl flex-col pb-6'>
      <h1 className='sr-only'>기록 검색</h1>
      <div className='flex items-center gap-1 px-1 pt-2 pb-2 md:px-3 lg:mt-4'>
        <Link
          href='/records'
          aria-label='기록 탭으로 돌아가기'
          // PC는 검색이 기록 탭 왼쪽 목록 자리에 열려서 돌아갈 곳이 따로 없다
          className='inline-flex size-11 shrink-0 items-center justify-center rounded-md text-fg-primary hover:bg-surface-hover active:bg-surface-pressed lg:hidden'
        >
          <ChevronLeft
            aria-hidden='true'
            size={ICON_SIZE.lg}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </Link>
        {/* key: 주소의 검색어가 바뀌면(뒤로 가기, 다른 탭에서 연 주소) 입력칸을 새로 만들어 그 값으로 맞춘다.
            useEffect로 값을 따라가게 하면 그리고 나서 한 번 더 그린다 */}
        <SearchForm
          key={state.keyword}
          initialKeyword={state.keyword}
          onSubmit={(keyword) => update({ keyword })}
        />
      </div>

      <TypeFilterChips
        types={visibleTypes}
        selected={type}
        counts={
          isActive && search.data ? countByType(entries, visibleTypes) : null
        }
        onSelect={(next) => update({ type: next })}
      />

      {!isActive ? (
        <p className='px-4 py-12 text-center text-body-sm text-fg-secondary md:px-6'>
          제목·메모·분류로 기록을 찾을 수 있어요
        </p>
      ) : search.isError ? (
        <div
          role='alert'
          className='mx-4 mt-6 flex flex-col items-start gap-3 md:mx-6'
        >
          <p className='text-body text-fg-primary'>
            검색하지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
          <Button variant='secondary' onClick={() => void search.refetch()}>
            다시 시도
          </Button>
        </div>
      ) : search.isPending ? (
        <div aria-busy='true' className='flex flex-col gap-2 px-4 pt-6 md:px-6'>
          <div className='h-17 animate-pulse rounded-lg bg-surface-hover' />
          <div className='h-17 animate-pulse rounded-lg bg-surface-hover' />
          <div className='h-17 animate-pulse rounded-lg bg-surface-hover' />
        </div>
      ) : (
        <>
          <div className='flex items-center justify-between px-4 pt-4 md:px-6'>
            {/* role=status: 결과 개수가 바뀌면 화면 읽기 프로그램이 읽어 준다 (화면을 보지 않아도 검색이 끝났음을 안다) */}
            <p
              role='status'
              className='text-body-sm font-semibold text-fg-primary tabular-nums'
            >
              {results.length}개
            </p>
            <SortSelect
              value={state.sort}
              onChange={(sort) => update({ sort })}
            />
          </div>

          {results.length === 0 ? (
            <p className='px-4 py-12 text-center text-body-sm text-fg-secondary md:px-6'>
              {state.keyword
                ? `'${state.keyword}'에 맞는 기록이 없어요`
                : '기록이 없어요'}
            </p>
          ) : (
            <ul
              // 검색어를 바꾸는 동안 이전 결과를 보여 준다(keepPreviousData). 그동안 "불러오는 중"을 알린다
              aria-busy={search.isPlaceholderData}
              className='flex flex-col gap-2 px-4 py-2 md:px-6'
            >
              {results.map((entry) => (
                <li key={entry.id}>
                  <RecentRecordItem
                    type={entry.type}
                    title={getListTitle(entry)}
                    subtitle={`${RECORD_TYPE_CONFIG[entry.type].label} · ${formatShortDate(entry.occurredAt)}`}
                    value={getListValue(entry)}
                    // 검색 조건을 달고 간다: PC는 왼쪽에 결과가 남고, 모바일 상세의 뒤로 버튼은 이 결과로 돌아온다
                    href={`/records/${entry.id}?${detailQuery}`}
                    isSelected={pathname === `/records/${entry.id}`}
                    highlight={state.keyword}
                  />
                </li>
              ))}
            </ul>
          )}

          {search.data?.isTruncated && (
            <p className='px-4 pt-2 text-caption text-fg-secondary md:px-6'>
              {state.sort === 'latest' ? '최근' : '오래된'}{' '}
              {SEARCH_RESULT_LIMIT}개까지만 보여요. 검색어를 더 자세히 써
              보세요.
            </p>
          )}
        </>
      )}
    </div>
  );
}

type SearchFormProps = {
  initialKeyword: string;
  onSubmit: (keyword: string) => void;
};

// 검색은 Enter(모바일 키보드의 "검색")로 한다. 글자마다 검색하지 않는 이유: 한글은 자모를 칠 때마다 값이 바뀌어
// "ㅋ", "카", "캎"… 마다 요청이 가고, 중간 결과가 깜박인다
function SearchForm({ initialKeyword, onSubmit }: SearchFormProps) {
  const [draft, setDraft] = useState(initialKeyword);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  return (
    <form
      role='search'
      className='flex h-12 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-surface pl-4 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent'
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(draft.trim());
        // 모바일: 검색 뒤 키보드를 내려 결과가 가려지지 않게
        inputRef.current?.blur();
      }}
    >
      <label htmlFor={inputId} className='sr-only'>
        검색어
      </label>
      <Search
        aria-hidden='true'
        size={ICON_SIZE.md}
        strokeWidth={ICON_STROKE_WIDTH}
        className='shrink-0 text-fg-secondary'
      />
      <input
        ref={inputRef}
        id={inputId}
        type='search'
        // 모바일 키보드의 Enter 자리에 "검색"을 띄운다
        enterKeyHint='search'
        // 처음 들어왔을 때(검색어 없음)만 바로 칠 수 있게. 결과를 보러 돌아왔을 때 키보드가 결과를 가리지 않게
        autoFocus={!initialKeyword}
        maxLength={MAX_SEARCH_KEYWORD_LENGTH}
        value={draft}
        placeholder='가계부, 후기, 운동… 검색'
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          // 한글 조합 중 Enter는 글자 확정용이다. 그대로 두면 조합이 끝난 뒤 한 번 더 제출된다 (CLAUDE.md)
          if (event.key === 'Enter' && event.nativeEvent.isComposing) {
            event.preventDefault();
          }
        }}
        // 브라우저 기본 지우기(×) 버튼은 숨긴다: 아래 버튼과 두 개가 겹쳐 보인다
        className='min-w-0 flex-1 bg-transparent text-body text-fg-primary outline-none placeholder:text-fg-secondary [&::-webkit-search-cancel-button]:appearance-none'
      />
      {draft && (
        <button
          type='button'
          aria-label='검색어 지우기'
          onClick={() => {
            setDraft('');
            // 이미 검색한 상태면 결과도 지운다 (입력칸만 비우면 결과와 입력칸이 어긋난다)
            if (initialKeyword) onSubmit('');
            inputRef.current?.focus();
          }}
          className='inline-flex size-11 shrink-0 items-center justify-center rounded-md text-fg-secondary hover:text-fg-primary'
        >
          <X
            aria-hidden='true'
            size={ICON_SIZE.md}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </button>
      )}
    </form>
  );
}

const SORT_LABEL: Record<SearchState['sort'], string> = {
  latest: '최신순',
  oldest: '오래된순',
};

// 정렬 고르기. 선택지가 둘뿐이라 직접 만든 메뉴 대신 기본 select: 키보드·화면 읽기·모바일 휠 선택을 브라우저가 맡는다
function SortSelect({
  value,
  onChange,
}: {
  value: SearchState['sort'];
  onChange: (sort: SearchState['sort']) => void;
}) {
  const selectId = useId();
  return (
    <div className='relative flex items-center text-fg-secondary'>
      <label htmlFor={selectId} className='sr-only'>
        정렬
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(event) =>
          onChange(event.target.value === 'oldest' ? 'oldest' : 'latest')
        }
        className='min-h-11 appearance-none bg-transparent pr-6 pl-2 text-body-sm text-fg-secondary'
      >
        {(Object.keys(SORT_LABEL) as SearchState['sort'][]).map((sort) => (
          <option key={sort} value={sort}>
            {SORT_LABEL[sort]}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden='true'
        size={ICON_SIZE.sm}
        strokeWidth={ICON_STROKE_WIDTH}
        className='pointer-events-none absolute right-0'
      />
    </div>
  );
}
