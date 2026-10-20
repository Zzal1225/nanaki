import type { Metadata } from 'next';
import ThemeToggle from '@/shared/theme/ThemeToggle';
import Button from '@/shared/ui/Button';
import Card from '@/shared/ui/Card';
import Checkbox from '@/shared/ui/Checkbox';
import FilterChip from '@/shared/ui/FilterChip';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import Switch from '@/shared/ui/Switch';
import TextField from '@/shared/ui/TextField';
import Section from './Section';
import Swatch from './Swatch';

export const metadata: Metadata = {
  title: 'nanaki 디자인 시스템',
};

const COLOR_SWATCHES = [
  { name: 'bg', className: 'bg-bg' },
  { name: 'surface', className: 'bg-surface' },
  { name: 'surface-raised', className: 'bg-surface-raised' },
  { name: 'surface-hover', className: 'bg-surface-hover' },
  { name: 'surface-pressed', className: 'bg-surface-pressed' },
  { name: 'border', className: 'bg-border' },
  { name: 'fg-primary', className: 'bg-fg-primary' },
  { name: 'fg-secondary', className: 'bg-fg-secondary' },
  { name: 'fg-disabled', className: 'bg-fg-disabled' },
  { name: 'accent', className: 'bg-accent' },
  { name: 'accent-hover', className: 'bg-accent-hover' },
  { name: 'accent-pressed', className: 'bg-accent-pressed' },
  { name: 'accent-foreground', className: 'bg-accent-foreground' },
  { name: 'success', className: 'bg-success' },
  { name: 'warning', className: 'bg-warning' },
  { name: 'danger', className: 'bg-danger' },
  { name: 'danger-hover', className: 'bg-danger-hover' },
  { name: 'danger-pressed', className: 'bg-danger-pressed' },
  { name: 'focus-ring', className: 'bg-focus-ring' },
  { name: 'overlay', className: 'bg-overlay' },
];

const TYPE_SWATCHES = [
  { name: 'type-expense', className: 'bg-type-expense' },
  { name: 'type-expense-subtle', className: 'bg-type-expense-subtle' },
  { name: 'type-review', className: 'bg-type-review' },
  { name: 'type-review-subtle', className: 'bg-type-review-subtle' },
  { name: 'type-workout', className: 'bg-type-workout' },
  { name: 'type-workout-subtle', className: 'bg-type-workout-subtle' },
  { name: 'type-routine', className: 'bg-type-routine' },
  { name: 'type-routine-subtle', className: 'bg-type-routine-subtle' },
  { name: 'type-body', className: 'bg-type-body' },
  { name: 'type-body-subtle', className: 'bg-type-body-subtle' },
];

const TEXT_STYLES = [
  {
    name: 'display (32/40, 700)',
    className: 'text-display',
    sample: '나는 나를 키운다',
  },
  {
    name: 'title-lg (24/32, 700)',
    className: 'text-title-lg',
    sample: '이번 달 기록',
  },
  { name: 'title (20/28, 600)', className: 'text-title', sample: '가계부' },
  {
    name: 'body (16/24, 400)',
    className: 'text-body',
    sample: '동네 로스터리에서 커피를 마셨다',
  },
  {
    name: 'body-sm (14/20, 400)',
    className: 'text-body-sm',
    sample: '식비 · 카페',
  },
  {
    name: 'caption (12/16, 500)',
    className: 'text-caption',
    sample: '오늘 14:30',
  },
  {
    name: 'number-lg (28/34, 700)',
    className: 'text-number-lg tabular-nums',
    sample: '1,234,500원',
  },
];

const SPACE_STEPS = [
  { name: 'space-1 (4)', className: 'w-1' },
  { name: 'space-2 (8)', className: 'w-2' },
  { name: 'space-3 (12)', className: 'w-3' },
  { name: 'space-4 (16)', className: 'w-4' },
  { name: 'space-5 (20)', className: 'w-5' },
  { name: 'space-6 (24)', className: 'w-6' },
  { name: 'space-8 (32)', className: 'w-8' },
  { name: 'space-10 (40)', className: 'w-10' },
];

const RADIUS_STEPS = [
  { name: 'radius-sm (6)', className: 'rounded-sm' },
  { name: 'radius-md (10)', className: 'rounded-md' },
  { name: 'radius-lg (16)', className: 'rounded-lg' },
  { name: 'radius-full (9999)', className: 'rounded-full' },
];

const CALENDAR_VIEW_OPTIONS = [
  { value: 'month', label: '월' },
  { value: 'week', label: '주' },
] as const;

const PERIOD_OPTIONS = [
  { value: 'day', label: '일' },
  { value: 'week', label: '주' },
  { value: 'month', label: '월' },
] as const;

const BUTTON_VARIANTS = [
  { variant: 'primary', label: '저장' },
  { variant: 'secondary', label: '취소' },
  { variant: 'ghost', label: '편집' },
  { variant: 'danger', label: '삭제' },
] as const;

const SHADOW_STEPS = [
  { name: 'shadow-card', className: 'shadow-card' },
  { name: 'shadow-float', className: 'shadow-float' },
];

export default function DesignSystemPage() {
  return (
    <main className='mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8 md:px-8'>
      <header className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <h1 className='text-display text-fg-primary'>nanaki 디자인 시스템</h1>
        <ThemeToggle />
      </header>

      <Section title='색상'>
        <ul className='grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-5'>
          {COLOR_SWATCHES.map((swatch) => (
            <li key={swatch.name}>
              <Swatch name={swatch.name} className={swatch.className} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title='타입 색'>
        <ul className='grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-5'>
          {TYPE_SWATCHES.map((swatch) => (
            <li key={swatch.name}>
              <Swatch name={swatch.name} className={swatch.className} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title='글자 단계'>
        <ul className='flex flex-col gap-4'>
          {TEXT_STYLES.map((style) => (
            <li
              key={style.name}
              className='flex flex-col gap-1 border-b border-border pb-4'
            >
              <span className='text-caption text-fg-secondary'>
                {style.name}
              </span>
              <span className={`${style.className} text-fg-primary`}>
                {style.sample}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title='간격'>
        <ul className='flex flex-col gap-3'>
          {SPACE_STEPS.map((step) => (
            <li key={step.name} className='flex items-center gap-4'>
              <span className='w-32 text-caption text-fg-secondary'>
                {step.name}
              </span>
              {/* 너비가 곧 간격 값. Tailwind 기본 단위(1 = 4px)가 토큰과 같다 */}
              <div
                aria-hidden='true'
                className={`h-4 rounded-sm bg-accent ${step.className}`}
              />
            </li>
          ))}
        </ul>
      </Section>

      <Section title='모서리'>
        <ul className='flex flex-wrap gap-6'>
          {RADIUS_STEPS.map((step) => (
            <li key={step.name} className='flex flex-col gap-2'>
              <div
                aria-hidden='true'
                className={`h-16 w-16 border border-border bg-surface-raised ${step.className}`}
              />
              <span className='text-caption text-fg-secondary'>
                {step.name}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title='버튼'>
        <ul className='flex flex-col gap-3'>
          {BUTTON_VARIANTS.map((variant) => (
            <li
              key={variant.variant}
              className='flex flex-wrap items-center gap-3'
            >
              <span className='w-24 text-caption text-fg-secondary'>
                {variant.variant}
              </span>
              <Button variant={variant.variant}>{variant.label}</Button>
              <Button variant={variant.variant} disabled>
                {variant.label}
              </Button>
              <Button variant={variant.variant} isLoading>
                {variant.label}
              </Button>
            </li>
          ))}
        </ul>
        <p className='text-body-sm text-fg-secondary'>
          왼쪽부터 기본, 비활성, 로딩. hover와 pressed는 직접 마우스를 올리거나
          눌러서 확인한다.
        </p>
      </Section>

      <Section title='입력'>
        <div className='grid gap-5 sm:grid-cols-2'>
          <TextField label='텍스트 · 기본' placeholder='제목을 입력하세요' />
          <TextField
            label='텍스트 · 오류'
            placeholder='제목을 입력하세요'
            error='제목을 입력해 주세요'
          />
          <TextField
            label='금액'
            unit='원'
            inputMode='numeric'
            defaultValue='12,500'
          />
          <TextField
            label='몸무게'
            unit='kg'
            inputMode='decimal'
            defaultValue='68.4'
          />
        </div>
        <p className='text-body-sm text-fg-secondary'>
          포커스 모양은 입력창을 눌러서 확인한다.
        </p>
      </Section>

      <Section title='토글 · 체크박스 · 세그먼트'>
        <div className='flex flex-wrap gap-x-6'>
          <Switch label='켜짐' defaultChecked />
          <Switch label='꺼짐' />
          <Switch label='비활성' disabled />
        </div>
        <div className='flex flex-wrap gap-x-6'>
          <Checkbox label='물 2L 마시기' defaultChecked />
          <Checkbox label='스트레칭' />
          <Checkbox label='비활성' disabled />
        </div>
        <div className='flex flex-wrap gap-3'>
          <SegmentedControl
            aria-label='캘린더 보기'
            options={CALENDAR_VIEW_OPTIONS}
            defaultValue='month'
          />
          <SegmentedControl
            aria-label='기간 단위'
            options={PERIOD_OPTIONS}
            defaultValue='week'
          />
        </div>
        <p className='text-body-sm text-fg-secondary'>
          눌러서 바뀌는지, Tab과 Space·화살표 키로도 조작되는지 확인한다.
        </p>
      </Section>

      <Section title='칩'>
        <div className='flex flex-wrap gap-2'>
          <FilterChip isSelected>전체</FilterChip>
          <FilterChip isSelected={false}>이번 달</FilterChip>
          <FilterChip isSelected={false}>지난달</FilterChip>
        </div>
        <p className='text-body-sm text-fg-secondary'>
          누를 수 있는 칩은 44px. 선택 상태 전환은 쓰는 쪽(필터 화면)에서
          관리한다.
        </p>
      </Section>

      <Section title='카드'>
        <Card className='flex min-h-17 items-center gap-3 px-4 py-3'>
          <span
            aria-hidden='true'
            className='size-10 shrink-0 rounded-md bg-type-expense-subtle'
          />
          <div className='flex min-w-0 flex-1 flex-col gap-1'>
            <span className='text-body font-semibold text-fg-primary'>
              동네 로스터리
            </span>
            <span className='text-caption text-fg-secondary'>
              가계부 · 10월 19일
            </span>
          </div>
          <span className='text-body font-semibold tabular-nums text-fg-primary'>
            -4,500원
          </span>
        </Card>
        <p className='text-body-sm text-fg-secondary'>
          카드는 틀(둥근 모서리, 배경, 그림자)만 가진다. 안의 내용은 쓰는 쪽에서
          채운다.
        </p>
      </Section>

      <Section title='그림자'>
        <ul className='flex flex-wrap gap-6'>
          {SHADOW_STEPS.map((step) => (
            <li key={step.name} className='flex flex-col gap-2'>
              <div
                aria-hidden='true'
                className={`h-20 w-32 rounded-lg bg-surface-raised ${step.className}`}
              />
              <span className='text-caption text-fg-secondary'>
                {step.name}
              </span>
            </li>
          ))}
        </ul>
        <p className='text-body-sm text-fg-secondary'>
          다크 모드에서는 그림자가 없다. 대신 surface-raised가 더 밝다.
        </p>
      </Section>
    </main>
  );
}
