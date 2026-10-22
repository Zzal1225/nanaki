import Link from 'next/link';
import { splitByKeyword } from '@/features/search/searchResults';
import { ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import type { RecordType } from '../schema/recordTypes';
import PendingBadge from '../ui/PendingBadge';
import { RECORD_TYPE_STYLE } from '../ui/recordTypeStyle';

// 시안 규격: 목록 아이콘 22px (일반 규격 20·24 사이)
const LIST_ICON_SIZE = 22;

type RecentRecordItemProps = {
  type: RecordType;
  title: string;
  // "가계부 · 10.19 (월)"
  subtitle: string;
  value: string;
  href: string;
  // PC에서 오른쪽 패널에 열려 있는 기록 (시안: 캘린더 선택 날짜와 같은 2px fg-primary 테두리)
  isSelected: boolean;
  // 검색 결과에서 제목 안의 검색어를 타입 옅은 색으로 강조한다 (시안 14a)
  highlight?: string;
  // 아직 서버에 보내지 않은 기록 (시안 15a: 날짜 옆 구름 + "저장 대기"). 온라인에서 보내지면 사라진다
  isPending?: boolean;
};

// 기록 객체 전체 대신 화면에 쓰는 값만 받는다 (CLAUDE.md: props는 필요한 것만). 한 줄 전체가 상세로 가는 링크
export default function RecentRecordItem({
  type,
  title,
  subtitle,
  value,
  href,
  isSelected,
  highlight = '',
  isPending = false,
}: RecentRecordItemProps) {
  const style = RECORD_TYPE_STYLE[type];
  const Icon = style.icon;

  return (
    <Link
      href={href}
      // 화면 읽기 프로그램에 "지금 열린 기록"임을 알린다
      aria-current={isSelected ? 'page' : undefined}
      // 테두리 대신 안쪽 링: 선택해도 칸 크기가 변하지 않아 목록이 흔들리지 않는다
      className={`flex min-h-17 items-center gap-3 rounded-lg bg-surface px-4 py-3 shadow-card hover:bg-surface-hover active:bg-surface-pressed ${
        isSelected ? 'ring-2 ring-fg-primary ring-inset' : ''
      }`}
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-md ${style.subtleBgClass} ${style.textClass}`}
      >
        <Icon
          aria-hidden='true'
          size={LIST_ICON_SIZE}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      </span>
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        {/* 제목이 길면 한 줄로 자른다. min-w-0이 없으면 flex 자식이 줄어들지 않아 잘리지 않는다 */}
        <span className='truncate text-body font-semibold text-fg-primary'>
          {/* <mark>: 화면 읽기 프로그램이 "강조된 글자"로 알 수 있다. 색은 기본 노랑 대신 그 타입의 옅은 색 */}
          {splitByKeyword(title, highlight).map((part, index) =>
            part.isMatch ? (
              <mark
                key={index}
                className={`rounded-sm px-0.5 text-inherit ${style.subtleBgClass}`}
              >
                {part.text}
              </mark>
            ) : (
              part.text
            ),
          )}
        </span>
        <span className='flex items-center gap-1 text-caption font-medium text-fg-secondary tabular-nums'>
          {subtitle}
          {isPending && <PendingBadge />}
        </span>
      </div>
      <span className='text-body font-semibold whitespace-nowrap text-fg-primary tabular-nums'>
        {value}
      </span>
    </Link>
  );
}
