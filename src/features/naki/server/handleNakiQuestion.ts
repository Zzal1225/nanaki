import type { SearchState } from '@/features/search/searchState';
import { nakiRequestSchema, type NakiError } from '../nakiApi';
import {
  buildNakiInstructions,
  describeTypesForAi,
  toSearchState,
} from '../nakiQuery';
import type { NakiModelResult } from './nakiModel';

// 나키 질문 하나의 서버 처리 (Route Handler가 부른다). 바깥 일(세션·DB 함수·AI)은 넘겨받아서
// AI·Supabase 없이 순서와 실패 처리를 테스트한다 (handleNakiQuestion.test)

export type NakiQuestionDeps = {
  // 세션에서 확인한 사용자. 없으면 null (요청 본문의 id는 믿지 않는다)
  getUserId: () => Promise<string | null>;
  // 오늘 횟수 1회 쓰기. 남은 횟수, 한도면 -1 (DB 함수 use_ai_quota)
  useQuota: () => Promise<number>;
  // 1회 되돌리기 (AI 제공자 쪽 실패). 관리자 키가 없는 환경이면 아무것도 안 한다
  refundQuota: (userId: string) => Promise<void>;
  askModel: (input: {
    question: string;
    instructions: string;
  }) => Promise<NakiModelResult>;
};

export type NakiQuestionResult =
  | { status: 200; body: { state: SearchState | null; remaining: number } }
  | {
      status: 400 | 401 | 429 | 502;
      body: { error: NakiError; remaining?: number };
    };

export async function handleNakiQuestion(
  rawBody: unknown,
  deps: NakiQuestionDeps,
): Promise<NakiQuestionResult> {
  const parsed = nakiRequestSchema.safeParse(rawBody);
  if (!parsed.success) return { status: 400, body: { error: 'badRequest' } };
  const { question, today, types } = parsed.data;

  const userId = await deps.getUserId();
  if (!userId) return { status: 401, body: { error: 'signedOut' } };

  // AI를 부르기 전에 먼저 센다: 세고 나서 부르면 동시에 여러 번 보낸 요청이 모두 한도 검사를 통과한다
  const remaining = await deps.useQuota();
  if (remaining < 0) {
    return { status: 429, body: { error: 'limit', remaining: 0 } };
  }

  let result: NakiModelResult;
  try {
    result = await deps.askModel({
      question,
      instructions: buildNakiInstructions(today, describeTypesForAi(types)),
    });
  } catch (error) {
    // 제공자 장애·시간 초과·제공자 쪽 한도는 사용자 탓이 아니라 횟수를 되돌린다.
    // 원인은 서버 로그로 (질문 글은 남기지 않는다: 개인 기록에 대한 질문일 수 있다)
    console.error(
      '[naki] AI 호출 실패',
      error instanceof Error ? error.name : 'unknown',
    );
    await deps.refundQuota(userId).catch(() => undefined);
    return { status: 502, body: { error: 'model', remaining: remaining + 1 } };
  }

  // 모델이 답은 했지만 형식이 틀리면 이해하지 못한 것으로 (횟수는 쓴 것으로 둔다: 모델은 정상으로 일했다)
  const state =
    result.kind === 'ok' ? toSearchState(result.output, types) : null;
  return { status: 200, body: { state, remaining } };
}
