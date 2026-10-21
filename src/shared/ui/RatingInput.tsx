import { RadioGroup } from 'radix-ui';
import { Star } from 'lucide-react';
import { useId } from 'react';
import { ICON_SIZE, ICON_STROKE_WIDTH } from './icon';

type RatingInputProps = {
  label: string;
  max: number;
  value: number | undefined;
  onChange: (value: number) => void;
  error?: string;
};

// 1~max 중 하나를 고르는 것이라 의미상 라디오 그룹이다. 화살표 키로 점수를 바꾸는 건 Radix가 맡는다.
// 별 모양만 보면 스크린 리더가 몇 점인지 모르므로 각 별에 "n점" 이름을 붙인다
export default function RatingInput({
  label,
  max,
  value,
  onChange,
  error,
}: RatingInputProps) {
  const labelId = useId();
  const errorId = `${labelId}-error`;
  const hasError = Boolean(error);
  const scores = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <div className='flex flex-col gap-2'>
      <span id={labelId} className='text-body-sm font-medium text-fg-primary'>
        {label}
      </span>
      <RadioGroup.Root
        orientation='horizontal'
        value={value === undefined ? '' : String(value)}
        onValueChange={(next) => onChange(Number(next))}
        aria-labelledby={labelId}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className='flex'
      >
        {scores.map((score) => {
          const isFilled = value !== undefined && score <= value;
          return (
            <RadioGroup.Item
              key={score}
              value={String(score)}
              aria-label={`${score}점`}
              // 별 아이콘은 작아도 누르는 영역은 44px
              className={`inline-flex size-11 items-center justify-center rounded-md hover:bg-surface-hover ${
                isFilled ? 'text-type-review' : 'text-fg-disabled'
              }`}
            >
              <Star
                aria-hidden='true'
                size={ICON_SIZE.lg}
                strokeWidth={ICON_STROKE_WIDTH}
                fill={isFilled ? 'currentColor' : 'none'}
              />
            </RadioGroup.Item>
          );
        })}
      </RadioGroup.Root>
      {hasError && (
        <span id={errorId} className='text-caption text-danger'>
          {error}
        </span>
      )}
    </div>
  );
}
