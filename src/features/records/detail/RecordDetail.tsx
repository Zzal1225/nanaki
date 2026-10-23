'use client';

// 'use client' 이유: 기록을 브라우저에서 불러온다 (step2에서 오프라인 저장소로 바꿀 자리)
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { formatDisplayDate } from '@/shared/date/formatDisplayDate';
import RecordPhotos from '@/features/photos/ui/RecordPhotos';
import Button from '@/shared/ui/Button';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { useRecord } from '../hooks/useRecord';
import {
  getPhotoKinds,
  isEditableType,
  RECORD_TYPE_CONFIG,
} from '../schema/recordTypes';
import { formatFieldValue } from '../ui/fieldView';
import { getHeadlineField, getListValue } from '../ui/recordPresentation';
import { RECORD_TYPE_STYLE } from '../ui/recordTypeStyle';
import DetailRow from './DetailRow';
import RecordActions from './RecordActions';
import { detailBackTarget, type DetailOrigin } from '../routes/detailOrigin';

const RECORDS_PATH = '/records';

type RecordDetailProps = {
  id: string;
  // 들어온 곳. 모바일 뒤로 버튼이 그곳으로 간다 (검색 결과·타입 화면·홈·기록 탭, detailOrigin)
  origin?: DetailOrigin;
  // 수정 화면으로 넘길 같은 조건 (수정 뒤 돌아와도 뒤로 버튼이 그대로)
  originQuery?: string;
};

const DEFAULT_ORIGIN: DetailOrigin = { kind: 'records' };

// 기록 보기 (시안 6번, PC는 목록 옆 패널). 조회는 useRecord, 글자 만들기는 recordPresentation·fieldView, 수정·삭제는 RecordActions가 맡는다
export default function RecordDetail({
  id,
  origin = DEFAULT_ORIGIN,
  originQuery = '',
}: RecordDetailProps) {
  const { data: entry, isPending, isError, refetch } = useRecord(id);

  if (isPending) {
    return (
      <div aria-busy='true' className='flex flex-col gap-4 px-4 py-6 md:px-6'>
        <div className='h-7 w-32 animate-pulse rounded-full bg-surface-hover' />
        <div className='h-8 w-48 animate-pulse rounded-md bg-surface-hover' />
        <div className='h-40 animate-pulse rounded-lg bg-surface-hover' />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role='alert'
        className='flex flex-col items-start gap-3 px-4 py-6 md:px-6'
      >
        <p className='text-body text-fg-primary'>
          기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
        <Button variant='secondary' onClick={() => void refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }

  // 지운 기록이거나 다른 사람의 기록(RLS가 막아서 0줄)이면 null
  if (!entry) {
    return (
      <div className='flex flex-col items-start gap-3 px-4 py-6 md:px-6'>
        <p className='text-body text-fg-primary'>기록을 찾을 수 없어요.</p>
        <Link
          href={RECORDS_PATH}
          className='text-body-sm font-semibold text-accent underline underline-offset-4'
        >
          기록 탭으로
        </Link>
      </div>
    );
  }

  const config = RECORD_TYPE_CONFIG[entry.type];
  const style = RECORD_TYPE_STYLE[entry.type];
  const TypeIcon = style.icon;
  const headlineField = getHeadlineField(entry);
  // 화면에 그리기 위해 이름으로 값을 꺼낸다. 이미 검증을 통과한 기록이라 읽기만 한다
  const fieldValues = entry.fields as Record<string, unknown>;
  const back = detailBackTarget(origin, entry.type);
  const photoKinds = getPhotoKinds(entry.type);

  return (
    <article className='mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pt-2 pb-6 md:px-6 lg:pt-6'>
      {/* 스크롤해도 머리 줄(뒤로·닫기)이 맨 위에 붙어 있다 (2026-10-22 사용자 요청: 긴 화면에서 뒤로 가려고 다시 올라가기 불편). bg-bg: 밑으로 지나가는 내용이 비치지 않게, z-20: 떠 있는 + 버튼·메뉴(z-40) 아래 */}
      <div className='sticky top-0 z-20 -mx-4 flex items-center gap-2 bg-bg px-4 md:-mx-6 md:px-6'>
        {/* PC는 목록이 옆에 있어서 뒤로 버튼이 필요 없다 */}
        <Link
          href={back.href}
          aria-label={back.label}
          className='-ml-2 inline-flex size-11 items-center justify-center rounded-md text-fg-primary hover:bg-surface-hover active:bg-surface-pressed lg:hidden'
        >
          <ChevronLeft
            aria-hidden='true'
            size={ICON_SIZE.lg}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </Link>
        <span
          className={`inline-flex h-7 items-center gap-2 rounded-full pr-3 pl-2 text-body-sm font-semibold ${style.subtleBgClass} ${style.textClass}`}
        >
          <TypeIcon
            aria-hidden='true'
            size={ICON_SIZE.sm}
            strokeWidth={ICON_STROKE_WIDTH}
          />
          {/* 타입 이름만 (2026-10-22 사용자 결정: "가계부 · 교통"처럼 항목까지 붙이면 어색하다) */}
          {config.label}
        </span>
        <RecordActions
          id={entry.id}
          canEdit={isEditableType(entry.type)}
          originQuery={originQuery}
        />
      </div>

      <div className='flex flex-col gap-1'>
        <h1 className='text-title-lg break-words text-fg-primary'>
          {entry.title}
        </h1>
        <p className='text-[28px] leading-[34px] font-bold tracking-[-0.01em] text-fg-primary tabular-nums'>
          {getListValue(entry)}
        </p>
      </div>

      <dl className='overflow-hidden rounded-lg border border-border bg-surface'>
        <DetailRow label='날짜'>
          <span className='tabular-nums'>
            {formatDisplayDate(entry.occurredAt)}
          </span>
        </DetailRow>
        {config.fields.map((field) => {
          // 크게 보여 준 값(금액·별점)은 표에서 빼고, 비운 선택 칸은 줄을 그리지 않는다
          if (field.name === headlineField) return null;
          const text = formatFieldValue(field, fieldValues[field.name]);
          return text === null ? null : (
            <DetailRow key={field.name} label={field.label}>
              {text}
            </DetailRow>
          );
        })}
        {entry.tags.length > 0 && (
          <DetailRow label='태그'>
            <ul className='flex flex-wrap gap-2'>
              {entry.tags.map((tag) => (
                <li
                  key={tag}
                  className='inline-flex h-7 items-center rounded-full bg-surface-pressed px-3 text-body-sm'
                >
                  #{tag}
                </li>
              ))}
            </ul>
          </DetailRow>
        )}
        {entry.memo && (
          <DetailRow label='메모'>
            {/* 메모의 줄바꿈을 그대로 보여 준다 */}
            <span className='break-words whitespace-pre-wrap'>
              {entry.memo}
            </span>
          </DetailRow>
        )}
      </dl>

      {/* 사진 칸은 타입 설정이 정한다 (체형 = 정면·측면, step4). 사진이 없는 타입은 그리지 않는다 */}
      {photoKinds.length > 0 && (
        <RecordPhotos recordId={entry.id} kinds={photoKinds} />
      )}
    </article>
  );
}
