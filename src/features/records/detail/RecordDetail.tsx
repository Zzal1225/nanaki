'use client';

// 'use client' 이유: 기록을 브라우저에서 불러온다 (step2에서 오프라인 저장소로 바꿀 자리)
import { ChevronLeft, Pencil } from 'lucide-react';
import Link from 'next/link';
import { formatDisplayDate } from '@/shared/date/formatDisplayDate';
import Button from '@/shared/ui/Button';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { useRecord } from '../hooks/useRecord';
import { RECORD_TYPE_CONFIG } from '../schema/recordTypes';
import { formatFieldValue } from '../ui/fieldView';
import {
  getDetailKicker,
  getHeadlineField,
  getListValue,
} from '../ui/recordPresentation';
import { RECORD_TYPE_STYLE } from '../ui/recordTypeStyle';
import DetailRow from './DetailRow';

const RECORDS_PATH = '/records';

type RecordDetailProps = {
  id: string;
};

// 기록 보기 (시안 6번, PC는 목록 옆 패널). 조회는 useRecord, 글자 만들기는 recordPresentation·fieldView가 맡는다
export default function RecordDetail({ id }: RecordDetailProps) {
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
  const headlineField = getHeadlineField(entry.type);
  // 화면에 그리기 위해 이름으로 값을 꺼낸다. 이미 검증을 통과한 기록이라 읽기만 한다
  const fieldValues = entry.fields as Record<string, unknown>;

  return (
    <article className='mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pt-2 pb-6 md:px-6 lg:pt-6'>
      <div className='flex items-center gap-2'>
        {/* PC는 목록이 옆에 있어서 뒤로 버튼이 필요 없다 */}
        <Link
          href={RECORDS_PATH}
          aria-label='기록 탭으로 돌아가기'
          className='-ml-2 inline-flex size-11 items-center justify-center rounded-md text-fg-primary hover:bg-surface-hover lg:hidden'
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
          {config.label} · {getDetailKicker(entry)}
        </span>
        <Link
          href={`${RECORDS_PATH}/${entry.id}/edit`}
          className='ml-auto inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-4 text-body-sm font-semibold text-fg-primary hover:bg-surface-hover'
        >
          <Pencil
            aria-hidden='true'
            size={ICON_SIZE.sm}
            strokeWidth={ICON_STROKE_WIDTH}
          />
          수정
        </Link>
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
    </article>
  );
}
