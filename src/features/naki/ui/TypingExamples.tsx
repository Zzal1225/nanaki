'use client';

// 'use client' 이유: 글자를 시간에 따라 하나씩 보여 주고, 동작 줄이기 설정은 브라우저에서만 안다
import { Sparkles } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ICON_STROKE_WIDTH } from '@/shared/ui/icon';

type TypingExamplesProps = {
  questions: readonly string[];
  onPick: (question: string) => void;
};

// 글자 하나가 나타나는 간격, 질문 사이 쉼 (ms). 세 질문이 2~3초 안에 다 보이게
const CHAR_INTERVAL_MS = 45;
const PAUSE_CHARS = 6;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

// useSyncExternalStore: 서버에서 미리 그릴 때는 설정을 몰라 false. 브라우저 첫 그림과 어긋나지 않게 (useToday와 같은 방식)
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

// 빈 화면의 예시 질문 (2026-10-23 사용자 결정): 타이핑하듯 차례로 나타나고, 누르면 그 질문을 바로 보낸다.
// - 동작 줄이기 설정이면 처음부터 다 보인다 (움직임에 민감한 사람)
// - 화면 읽기 프로그램은 질문 전체를 읽는다: 버튼 이름(aria-label)은 늘 완성된 문장, 타이핑 글자는 숨긴다
// - 다 나오기 전에 눌러도 완성된 질문을 보낸다
export default function TypingExamples({
  questions,
  onPick,
}: TypingExamplesProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  // 지금까지 보인 글자 수 (질문 사이 쉼도 글자 수로 센다)
  const [typed, setTyped] = useState(0);
  // 질문마다 몇 번째 글자부터 나타나는지 (앞 질문들 길이 + 쉼). 그리는 중에 바깥 변수를 바꾸지 않게 미리 계산한다
  const starts = questions.map((_, index) =>
    questions
      .slice(0, index)
      .reduce((sum, question) => sum + question.length + PAUSE_CHARS, 0),
  );
  const total = questions.reduce(
    (sum, question) => sum + question.length + PAUSE_CHARS,
    0,
  );

  // 한 글자씩: 글자가 늘 때마다 다음 타이머를 건다 (다 나오면 멈춘다). 화면을 떠나면 걸어 둔 타이머를 지운다
  useEffect(() => {
    if (prefersReducedMotion || typed >= total) return;
    const timer = window.setTimeout(
      () => setTyped((current) => current + 1),
      CHAR_INTERVAL_MS,
    );
    return () => window.clearTimeout(timer);
  }, [prefersReducedMotion, typed, total]);

  const shown = prefersReducedMotion ? total : typed;

  return (
    <ul aria-label='예시 질문' className='flex w-full flex-col gap-2'>
      {questions.map((question, index) => {
        const visible = Math.max(
          0,
          Math.min(question.length, shown - starts[index]),
        );
        // 아직 차례가 오지 않은 질문은 자리도 두지 않는다 (위에서부터 하나씩 생긴다)
        if (visible === 0) return null;
        const isTyping = visible < question.length;
        return (
          <li key={question}>
            <button
              type='button'
              aria-label={question}
              onClick={() => onPick(question)}
              className='flex min-h-12 w-full items-center gap-3 rounded-md border border-border bg-surface px-4 text-left text-body-sm text-fg-primary hover:bg-surface-hover active:bg-surface-pressed'
            >
              <Sparkles
                aria-hidden='true'
                size={16}
                strokeWidth={ICON_STROKE_WIDTH}
                className='shrink-0 text-accent'
              />
              <span aria-hidden='true'>
                {question.slice(0, visible)}
                {isTyping && (
                  <span className='ml-0.5 inline-block h-4 w-px animate-pulse bg-fg-secondary align-middle' />
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
