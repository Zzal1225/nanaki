import type { SearchState } from '@/features/search/searchState';
import { nakiRequestSchema, type NakiError } from '../nakiApi';
import type { NakiLimits, QuotaResult } from '../nakiLimits';
import {
  buildNakiInstructions,
  describeTypesForAi,
  toSearchState,
} from '../nakiQuery';
import type { NakiModelResult } from './nakiModel';

// 나키 질문 하나의 서버 처리 (Route Handler가 부른다). 바깥 일(세션·DB 함수·AI·시각)은 넘겨받아서
// AI·Supabase 없이 순서와 실패 처리를 테스트한다 (handleNakiQuestion.test)

export type NakiUser = { id: string; isGuest: boolean };

export type NakiQuestionDeps = {
  // 세션에서 확인한 사용자. 없으면 null (요청 본문의 id는 믿지 않는다)
  getUser: () => Promise<NakiUser | null>;
  limits: NakiLimits;
  // 오늘(한국 날짜, nakiLimits.toKstDate)
  today: string;
  // 개인 한도 → 전체 한도 순서로 1회 쓰기 (DB 함수 use_ai_quota, 관리자 키)
  useQuota: (
    userId: string,
    day: string,
    userLimit: number,
  ) => Promise<QuotaResult>;
  // 1회 되돌리기 (개인·전체 모두). AI 제공자 쪽 실패는 사용자 탓이 아니다
  refundQuota: (userId: string, day: string) => Promise<void>;
  askModel: (input: {
    question: string;
    instructions: string;
  }) => Promise<NakiModelResult>;
};

type ErrorBody = {
  error: NakiError;
  remaining?: number;
  isGuest?: boolean;
  userLimit?: number;
};

export type NakiQuestionResult =
  | { status: 200; body: { state: SearchState | null; remaining: number } }
  | { status: 400 | 401 | 429 | 502; body: ErrorBody };

export async function handleNakiQuestion(
  rawBody: unknown,
  deps: NakiQuestionDeps,
): Promise<NakiQuestionResult> {
  const parsed = nakiRequestSchema.safeParse(rawBody);
  if (!parsed.success) return { status: 400, body: { error: 'badRequest' } };
  // 질문의 "오늘"은 브라우저 날짜(사용자 기준 "지난달"), 횟수의 "오늘"은 서버의 한국 날짜(사용자가 바꿀 수 없게)
  const { question, today: userToday, types, customNames } = parsed.data;

  const user = await deps.getUser();
  if (!user) return { status: 401, body: { error: 'signedOut' } };
  const userLimit = user.isGuest ? deps.limits.guest : deps.limits.user;

  // AI를 부르기 전에 먼저 센다: 세고 나서 부르면 동시에 여러 번 보낸 요청이 모두 한도 검사를 통과한다
  const quota = await deps.useQuota(user.id, deps.today, userLimit);
  if (quota.kind === 'userLimit') {
    return {
      status: 429,
      body: {
        error: 'limit',
        remaining: 0,
        isGuest: user.isGuest,
        userLimit: deps.limits.user,
      },
    };
  }
  if (quota.kind === 'globalLimit') {
    return { status: 429, body: { error: 'rest' } };
  }

  let result: NakiModelResult;
  try {
    result = await deps.askModel({
      question,
      instructions: buildNakiInstructions(
        userToday,
        describeTypesForAi(types, customNames),
        customNames.tags,
      ),
    });
  } catch (error) {
    // 제공자 장애·시간 초과는 사용자 탓이 아니라 횟수를 되돌린다.
    // 원인은 서버 로그로 (질문 글은 남기지 않는다: 개인 기록에 대한 질문일 수 있다)
    console.error(
      '[naki] AI 호출 실패',
      error instanceof Error ? error.name : 'unknown',
    );
    await deps.refundQuota(user.id, deps.today).catch(() => undefined);
    return {
      status: 502,
      body: { error: 'model', remaining: quota.remaining + 1 },
    };
  }

  // AI 제공자 쪽 한도(429): 서비스 전체 한도와 같은 "오늘은 나키가 쉬어요". 쓰지 못했으니 횟수를 되돌린다
  if (result.kind === 'busy') {
    await deps.refundQuota(user.id, deps.today).catch(() => undefined);
    return {
      status: 429,
      body: { error: 'rest', remaining: quota.remaining + 1 },
    };
  }

  // 모델이 답은 했지만 형식이 틀리면 이해하지 못한 것으로 (횟수는 쓴 것으로 둔다: 모델은 정상으로 일했다)
  const state =
    result.kind === 'ok' ? toSearchState(result.output, types) : null;
  return { status: 200, body: { state, remaining: quota.remaining } };
}
