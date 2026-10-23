'use client';

// 'use client' 이유: 대화(메모리)·입력·요청 중단·연결 상태가 모두 브라우저에서 일어난다
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUp, Search, Sparkles, Square, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { RecordType } from '@/features/records/schema/recordTypes';
import type { SearchState } from '@/features/search/searchState';
import { useVisibleTypes } from '@/features/settings/hooks/useUserSettings';
import AiBadge from '@/shared/layout/AiBadge';
import { toLocalDateString } from '@/shared/date/toLocalDateString';
import { useOnlineStatus } from '@/shared/network/useOnlineStatus';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { askNaki, getNakiQuota } from '../api/nakiClient';
import {
  MAX_NAKI_QUESTION_LENGTH,
  type NakiError,
  type NakiQuota,
} from '../nakiApi';
import NakiAnswer from './NakiAnswer';
import NakiAvatar from '@/shared/ui/NakiAvatar';
import TypingExamples from './TypingExamples';

// 질문 하나와 그 답. 대화는 메모리에만 둔다 (2026-10-23 사용자 결정: 첫 PR은 저장·이어 묻기 없음, 탭을 떠나면 사라진다)
type Turn =
  | { id: number; question: string; status: 'loading' }
  | {
      id: number;
      question: string;
      status: 'answered';
      state: SearchState | null;
    }
  | {
      id: number;
      question: string;
      status: 'failed';
      error: NakiError | 'network';
      isGuest?: boolean;
      userLimit?: number;
    };

// 예시 질문 (시안: 빈 화면·이해하지 못했을 때). 그 타입이 꺼져 있으면 빼서 쓸 수 없는 질문을 권하지 않는다
const EXAMPLES: readonly { question: string; type: RecordType }[] = [
  { question: '지난달 외식비 얼마였어?', type: 'expense' },
  { question: '이번 주 운동 몇 번 했어?', type: 'workout' },
  { question: '별점 4점 이상 후기 보여줘', type: 'review' },
];

const quotaKey = ['naki', 'quota'] as const;

// 실패 안내 (2026-10-23 사용자 결정: 개인 한도 / 전체 한도·AI 제공자 한도 / 해석 실패를 구분).
// 개인 한도는 아래 limitMessage가 계정에 따라 고른다 (체험 계정에는 로그인을 권한다)
const FAILURE_MESSAGE: Record<Exclude<NakiError, 'limit'> | 'network', string> =
  {
    // 사용자 탓이 아니다: 서비스 전체 하루 횟수를 다 썼거나 AI 제공자가 한도로 거절했다
    rest: '오늘은 나키가 쉬어요, 내일 다시 시도해 주세요',
    unavailable: '지금은 나키를 쓸 수 없어요. 검색으로 찾아 주세요.',
    model:
      '답을 만들지 못했어요. 잠시 후 다시 물어봐 주세요. 이번 질문은 횟수에서 빼 두었어요.',
    signedOut: '로그인이 풀렸어요. 다시 로그인해 주세요.',
    badRequest: '질문을 보내지 못했어요. 조금 짧게 다시 써 주세요.',
    network: '연결이 끊겨 보내지 못했어요. 연결을 확인하고 다시 물어봐 주세요.',
  };

function failureMessage(turn: Extract<Turn, { status: 'failed' }>): string {
  if (turn.error !== 'limit') return FAILURE_MESSAGE[turn.error];
  // 체험 계정: 로그인하면 더 쓸 수 있다는 것을 알려 준다 (숫자는 서버 환경 변수의 로그인 계정 한도)
  return turn.isGuest && turn.userLimit
    ? `오늘 질문 횟수를 다 썼어요. 구글로 로그인 시 하루 ${turn.userLimit}회까지 사용가능해요.`
    : '오늘 질문 횟수를 다 썼어요. 내일 다시 물어봐 주세요.';
}

// 나키 탭 (시안 AI). 질문 → "이렇게 이해했어요" 칩 + 계산 한 줄 + 기록 3개 + 기록 탭에서 보기
export default function NakiScreen() {
  const isOnline = useOnlineStatus();
  const visibleTypes = useVisibleTypes();
  const queryClient = useQueryClient();
  const quota = useQuery({
    queryKey: quotaKey,
    queryFn: getNakiQuota,
    enabled: isOnline,
  });
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  // 지금 기다리는 요청. 중단 버튼과 화면을 떠날 때 끊는다
  const controllerRef = useRef<AbortController | null>(null);
  const nextIdRef = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);
  const isAsking = turns.some((turn) => turn.status === 'loading');
  const examples = EXAMPLES.filter((example) =>
    visibleTypes.includes(example.type),
  );

  // 화면을 떠나면 기다리던 요청을 끊는다 (응답이 와도 그릴 화면이 없다)
  useEffect(() => () => controllerRef.current?.abort(), []);

  // 새 질문·답이 붙으면 맨 아래가 보이게 (대화 화면의 기본 동작)
  // 처음(대화 없음)에는 움직이지 않는다: 들어오자마자 화면이 밀리면 어지럽다
  useEffect(() => {
    if (turns.length > 0) endRef.current?.scrollIntoView({ block: 'end' });
  }, [turns]);

  function updateTurn(id: number, next: Turn) {
    setTurns((current) =>
      current.map((turn) => (turn.id === id ? next : turn)),
    );
  }

  // 답에 실려 온 남은 횟수로 머리 표시를 맞춘다. 아직 처음 횟수를 못 받았으면(답이 먼저 옴) 서버 값을 다시 받는다
  function setRemaining(remaining: number | undefined) {
    if (remaining === undefined) return;
    if (!queryClient.getQueryData<NakiQuota>(quotaKey)) {
      void queryClient.invalidateQueries({ queryKey: quotaKey });
      return;
    }
    queryClient.setQueryData<NakiQuota>(quotaKey, (current) =>
      current ? { ...current, remaining } : current,
    );
  }

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || isAsking || !isOnline) return;
    const id = nextIdRef.current++;
    setTurns((current) => [
      ...current,
      { id, question: trimmed, status: 'loading' },
    ]);
    setDraft('');
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const result = await askNaki(
        {
          question: trimmed,
          // 이 함수는 버튼·Enter 처리 안에서만 불려 new Date()를 써도 된다 (렌더 중이 아니다)
          today: toLocalDateString(new Date()),
          types: visibleTypes,
        },
        controller.signal,
      );
      if (result.kind === 'answer') {
        updateTurn(id, {
          id,
          question: trimmed,
          status: 'answered',
          state: result.state,
        });
        setRemaining(result.remaining);
      } else {
        updateTurn(id, {
          id,
          question: trimmed,
          status: 'failed',
          error: result.error,
          isGuest: result.isGuest,
          userLimit: result.userLimit,
        });
        setRemaining(result.remaining);
      }
    } catch {
      // 중단: 질문을 지우고 입력칸에 되돌려 고쳐 묻게 한다
      setTurns((current) => current.filter((turn) => turn.id !== id));
      setDraft(trimmed);
    } finally {
      controllerRef.current = null;
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void ask(draft);
  }

  const limit = quota.data?.limit;
  const remaining = quota.data?.remaining;

  return (
    <div className='mx-auto flex min-h-[calc(100dvh-var(--tab-bar-height))] w-full max-w-(--chat-max-width) flex-col md:min-h-dvh'>
      <header className='sticky top-0 z-20 flex h-14 items-center gap-2 bg-bg px-4 md:px-6 lg:mt-4'>
        <h1 className='flex items-center gap-1.5 text-title text-fg-primary'>
          나키
          <AiBadge />
        </h1>
        <span className='flex-1' />
        {limit !== undefined && remaining !== undefined && (
          <span className='flex items-center gap-1 text-caption font-medium text-fg-secondary tabular-nums'>
            <Sparkles
              aria-hidden='true'
              size={14}
              strokeWidth={ICON_STROKE_WIDTH}
            />
            오늘 {Math.max(remaining, 0)}/{limit}회
          </span>
        )}
      </header>

      <div className='flex flex-1 flex-col gap-4 px-4 pt-2 pb-4 md:px-6'>
        {!isOnline ? (
          // 시안: 오프라인에서는 쓸 수 없다고 알리고 검색으로 보낸다 (검색은 기기 사본으로 오프라인에서도 된다)
          <div
            role='status'
            className='m-auto flex max-w-xs flex-col items-center gap-3 text-center'
          >
            <WifiOff
              aria-hidden='true'
              size={32}
              strokeWidth={ICON_STROKE_WIDTH}
              className='text-fg-secondary'
            />
            <p className='text-body font-semibold text-fg-primary'>
              오프라인에서는 나키를 쓸 수 없어요
            </p>
            <p className='text-body-sm text-fg-secondary'>
              연결되면 다시 물어봐 주세요. 그동안은 검색으로 찾을 수 있어요.
            </p>
            <Link
              href='/records/search'
              className='inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-4 text-body-sm font-semibold text-fg-primary hover:bg-surface-hover'
            >
              <Search
                aria-hidden='true'
                size={ICON_SIZE.sm}
                strokeWidth={ICON_STROKE_WIDTH}
              />
              검색으로 찾기
            </Link>
          </div>
        ) : turns.length === 0 ? (
          <div className='m-auto flex w-full max-w-sm flex-col items-center gap-4 text-center'>
            <NakiAvatar size={56} />
            <div className='flex flex-col gap-1'>
              <p className='text-body font-semibold text-fg-primary'>
                기록에 대해 물어보세요
              </p>
              <p className='text-body-sm text-fg-secondary'>
                nanaki에 남긴 기록만 보고 답해요
              </p>
            </div>
            <TypingExamples
              questions={examples.map((example) => example.question)}
              onPick={(question) => void ask(question)}
            />
          </div>
        ) : (
          <ol aria-label='나키와의 대화' className='flex flex-col gap-4'>
            {turns.map((turn) => (
              <li key={turn.id} className='flex flex-col gap-2'>
                <p className='max-w-[85%] self-end rounded-lg rounded-br-sm bg-accent px-4 py-2 text-body text-accent-foreground'>
                  {turn.question}
                </p>
                {/* AI가 말하는 줄: 왼쪽에 나키 아바타, 오른쪽에 답 (시안). 사용자 질문은 오른쪽 말풍선 */}
                <div className='flex items-start gap-2'>
                  <NakiAvatar size={32} />
                  <div className='min-w-0 flex-1'>
                    {turn.status === 'loading' ? (
                      <p
                        aria-live='polite'
                        className='flex items-center gap-2 rounded-lg bg-surface p-4 text-body-sm text-fg-secondary shadow-card'
                      >
                        <Sparkles
                          aria-hidden='true'
                          size={14}
                          strokeWidth={ICON_STROKE_WIDTH}
                          className='animate-pulse text-accent'
                        />
                        조건을 만들고 있어요
                      </p>
                    ) : turn.status === 'failed' ? (
                      <p
                        role='alert'
                        className='rounded-lg bg-surface p-4 text-body-sm text-fg-primary shadow-card'
                      >
                        {failureMessage(turn)}
                      </p>
                    ) : turn.state ? (
                      <NakiAnswer state={turn.state} />
                    ) : (
                      // 해석하지 못함: 탓하지 않고 물을 수 있는 모양을 보여 준다
                      <div className='flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-card'>
                        <p className='text-body-sm text-fg-primary'>
                          잘 이해하지 못했어요. 이렇게 물어봐 주세요.
                        </p>
                        <ExampleQuestions
                          examples={examples}
                          onPick={(question) => void ask(question)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
        <div ref={endRef} />
      </div>

      {/* 입력창: 하단 탭 바로 위에 붙는다. 글자를 치는 동안은 붙지 않고 제자리(맨 끝)에 (작성 폼 저장 줄과 같은 이유, globals.css) */}
      <form
        onSubmit={handleSubmit}
        data-unstick-while-typing
        className='sticky bottom-(--tab-bar-height) border-t border-border bg-bg px-4 py-3 md:bottom-0 md:px-6'
      >
        <div className='flex items-center gap-2 rounded-full border border-border bg-surface py-1 pr-1 pl-4 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent'>
          <label htmlFor='naki-question' className='sr-only'>
            나키에게 물어보기
          </label>
          <input
            id='naki-question'
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // 한글 조합 중 Enter는 무시한다: 조합을 끝내는 Enter와 보내는 Enter가 겹쳐 두 번 보내진다 (CLAUDE.md)
              if (event.key === 'Enter' && event.nativeEvent.isComposing) {
                event.preventDefault();
              }
            }}
            maxLength={MAX_NAKI_QUESTION_LENGTH}
            disabled={!isOnline}
            placeholder={
              isOnline ? '지난달 외식비 얼마였어?' : '연결되면 물어볼 수 있어요'
            }
            enterKeyHint='send'
            className='min-w-0 flex-1 bg-transparent text-body text-fg-primary outline-none placeholder:text-fg-secondary disabled:text-fg-disabled'
          />
          {isAsking ? (
            <button
              type='button'
              onClick={() => controllerRef.current?.abort()}
              aria-label='중단'
              className='flex size-11 shrink-0 items-center justify-center rounded-full bg-fg-primary text-surface'
            >
              <Square
                aria-hidden='true'
                size={14}
                strokeWidth={ICON_STROKE_WIDTH}
                fill='currentColor'
              />
            </button>
          ) : (
            <button
              type='submit'
              aria-label='보내기'
              disabled={!isOnline || draft.trim() === '' || remaining === 0}
              className='flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:bg-surface-pressed disabled:text-fg-disabled'
            >
              <ArrowUp
                aria-hidden='true'
                size={ICON_SIZE.md}
                strokeWidth={ICON_STROKE_WIDTH}
              />
            </button>
          )}
        </div>
        {/* 개인정보 안내 (2026-10-23 사용자 결정: 개인정보처리방침이 아직 없어 묻기 전에 보이는 곳에 한 줄) */}
        <p className='mt-2 text-center text-caption text-fg-secondary'>
          질문 문장만 AI 제공자(Google)에 보내요. 기록 내용은 보내지 않아요.
        </p>
      </form>
    </div>
  );
}

function ExampleQuestions({
  examples,
  onPick,
}: {
  examples: readonly { question: string }[];
  onPick: (question: string) => void;
}) {
  return (
    <ul aria-label='예시 질문' className='flex flex-col items-center gap-2'>
      {examples.map((example) => (
        <li key={example.question}>
          <button
            type='button'
            onClick={() => onPick(example.question)}
            className='inline-flex min-h-11 items-center rounded-full border border-border bg-surface px-4 text-body-sm text-fg-primary hover:bg-surface-hover active:bg-surface-pressed'
          >
            {example.question}
          </button>
        </li>
      ))}
    </ul>
  );
}
