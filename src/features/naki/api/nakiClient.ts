import type { RecordType } from '@/features/records/schema/recordTypes';
import {
  parseSearchState,
  toSearchParams,
  type SearchState,
} from '@/features/search/searchState';
import {
  NAKI_API_PATH,
  nakiAnswerSchema,
  nakiErrorSchema,
  nakiQuotaSchema,
  type NakiError,
  type NakiPrevious,
  type NakiQuota,
} from '../nakiApi';
import type { NakiAggregate } from '../nakiAggregate';
import type { NakiCustomNames } from '../nakiCustomNames';
import type { NakiCompare } from '../nakiQuery';

// 브라우저에서 나키 API를 부르는 유일한 입구 (화면은 fetch를 직접 쓰지 않는다).
// 응답도 스키마로 검사한다: 서버가 바뀌거나 중간에서 응답이 망가져도 화면이 엉뚱한 값을 그리지 않게

export type NakiAskResult =
  | {
      kind: 'answer';
      state: SearchState | null;
      // 무엇을 계산할지 (34e). 계산은 화면이 기기 사본으로 한다 (nakiSummary)
      aggregate: NakiAggregate;
      // 비교할 두 번째 기간 ("지난달보다"). 계산은 화면이 두 기간을 따로 한다
      compare: NakiCompare | null;
      remaining: number;
    }
  // network = 서버에 닿지 못함 (연결 끊김). 그 밖은 서버가 알려 준 실패 (nakiApi)
  | {
      kind: 'error';
      error: NakiError | 'network';
      remaining?: number;
      // 'limit'일 때: 체험 계정이면 로그인 계정 한도로 로그인을 권한다
      isGuest?: boolean;
      userLimit?: number;
    };

// 서버가 걸러 준 조건을 주소 모양으로 바꿨다가 다시 읽는다. 검색 화면이 주소를 읽는 것과 같은 길이라
// "기록 탭에서 보기" 링크로 간 화면과 여기 결과가 늘 같은 조건이다 (틀린 칸 값도 같은 규칙으로 버려진다)
function normalizeState(state: SearchState): SearchState {
  return parseSearchState(new URLSearchParams(toSearchParams(state)));
}

export async function askNaki(
  input: {
    question: string;
    today: string;
    types: readonly RecordType[];
    // 사용자가 만든 분류·태그 이름 (기록 내용은 없다, nakiCustomNames)
    customNames: NakiCustomNames;
    // 이어 묻기: 바로 앞에 이해한 질문 (문장 + 조건, 결과는 보내지 않는다)
    previous?: NakiPrevious;
  },
  signal: AbortSignal,
): Promise<NakiAskResult> {
  let response: Response;
  try {
    response = await fetch(NAKI_API_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal,
    });
  } catch (error) {
    // 사용자가 중단한 것은 부르는 쪽이 따로 처리한다
    if (signal.aborted) throw error;
    return { kind: 'error', error: 'network' };
  }

  const body: unknown = await response.json().catch(() => null);
  if (response.ok) {
    const answer = nakiAnswerSchema.safeParse(body);
    if (!answer.success) return { kind: 'error', error: 'model' };
    return {
      kind: 'answer',
      state: answer.data.state
        ? normalizeState(answer.data.state as SearchState)
        : null,
      aggregate: answer.data.aggregate,
      compare: answer.data.compare,
      remaining: answer.data.remaining,
    };
  }
  const failure = nakiErrorSchema.safeParse(body);
  return failure.success
    ? {
        kind: 'error',
        error: failure.data.error,
        remaining: failure.data.remaining,
        isGuest: failure.data.isGuest,
        userLimit: failure.data.userLimit,
      }
    : { kind: 'error', error: 'model' };
}

export async function getNakiQuota(): Promise<NakiQuota> {
  const response = await fetch(NAKI_API_PATH);
  if (!response.ok)
    throw new Error(`나키 횟수를 받지 못함 (${response.status})`);
  return nakiQuotaSchema.parse(await response.json());
}
