'use client';

// 'use client' 이유: 누르면 브라우저 날짜 선택기를 여는 showPicker()가 브라우저 API다
import { Calendar, ChevronDown } from 'lucide-react';
import { useId, type ComponentProps } from 'react';
import { formatDisplayDate } from '@/shared/date/formatDisplayDate';
import FieldError from './FieldError';
import { ICON_SIZE, ICON_STROKE_WIDTH } from './icon';

type DateFieldProps = Omit<ComponentProps<'input'>, 'type' | 'value'> & {
  label: string;
  // 'YYYY-MM-DD'
  value: string;
  error?: string;
};

// 시안 모양("2026. 10. 16 (금)" + 달력 아이콘)은 우리가 그리고, 그 위에 투명한 기본 date 입력을 겹친다.
// 직접 만든 달력 대신 기본 입력을 쓰는 이유: 모바일 기기 달력·키보드 조작·스크린 리더 지원이 그대로 따라온다
// (직접 만든 달력은 홈 캘린더에서 date-fns로 만든다)
export default function DateField({
  label,
  value,
  error,
  onClick,
  ...rest
}: DateFieldProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const hasError = Boolean(error);

  return (
    <div className='flex flex-col gap-2'>
      <label
        htmlFor={inputId}
        className='text-body-sm font-medium text-fg-primary'
      >
        {label}
      </label>
      <div
        className={`relative flex h-12 items-center gap-2 rounded-md border bg-surface px-4 ${
          hasError
            ? 'border-danger ring-1 ring-danger'
            : 'border-border focus-within:border-accent focus-within:ring-1 focus-within:ring-accent'
        }`}
      >
        <Calendar
          aria-hidden='true'
          size={ICON_SIZE.md}
          strokeWidth={ICON_STROKE_WIDTH}
          className='text-fg-secondary'
        />
        {/* 보이는 글자는 장식. 스크린 리더는 아래 실제 입력칸의 값을 읽는다 */}
        <span
          aria-hidden='true'
          className='flex-1 text-body text-fg-primary tabular-nums'
        >
          {formatDisplayDate(value) || '날짜를 고르세요'}
        </span>
        <ChevronDown
          aria-hidden='true'
          size={ICON_SIZE.md}
          strokeWidth={ICON_STROKE_WIDTH}
          className='text-fg-secondary'
        />
        <input
          id={inputId}
          type='date'
          value={value}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          onClick={(e) => {
            // PC 크롬은 기본 date 입력의 글자 부분을 누르면 달력 대신 연·월·일 칸 편집이 된다.
            // 칸 전체를 눌러도 달력이 뜨게 연다 (지원하지 않는 브라우저는 기본 동작 그대로)
            e.currentTarget.showPicker?.();
            onClick?.(e);
          }}
          // 칸 전체를 덮어 어디를 눌러도 이 입력이 눌린다. 투명해도 포커스·키보드 입력은 그대로 된다
          className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
          {...rest}
        />
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  );
}
