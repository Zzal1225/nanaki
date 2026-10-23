import { google } from '@ai-sdk/google';
import {
  APICallError,
  generateText,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
  RetryError,
} from 'ai';
import { nakiAiOutputSchema, type NakiAiOutput } from '../nakiQuery';

// AI 제공자를 감싸는 유일한 파일 (CLAUDE.md: AI SDK는 어댑터 밖에서 import하지 않는다, eslint.config.mjs가 막는다).
// 제공자를 바꾸면 이 파일의 import와 모델 한 줄만 고친다: Vercel AI SDK가 제공자마다 같은 함수(generateText)를 준다.
// 서버(Route Handler)에서만 부른다: API 키(GOOGLE_GENERATIVE_AI_API_KEY)는 서버 환경 변수에만 있다 (NEXT_PUBLIC_이 아니라 브라우저 번들에 들어가지 않는다)
//
// 왜 Gemini + Vercel AI SDK (2026-10-23 사용자 결정):
// - Gemini 무료 등급은 카드 없이 키만으로 쓰고, JSON 스키마 구조화 출력을 지원한다
// - generateText + Output.object에 Zod 스키마를 넘기면 응답을 그 스키마로 검증까지 한다 (AI 응답을 믿지 않는 첫 단계)

// 모델은 환경 변수로 바꿀 수 있게: 무료 등급에서 쓸 수 있는 모델·한도는 Google AI Studio에서 자주 바뀐다.
// 2026-10-23 실제 키로 잰 결과 (질문 6개, 같은 지시문):
// - gemini-2.5-flash: 새 사용자에게 더 이상 열려 있지 않음 (목록에는 보이지만 호출하면 거절)
// - gemini-3.8-flash: 약 60초 (생각 단계가 기본으로 켜져 있고 minimal로 줄일 수 없음) → 채팅에 못 씀
// - gemini-3.5-flash: 2~10초, gemini-3.5-flash-lite: 약 1초. 둘 다 조건은 같게 만들었다 → 빠른 lite
const DEFAULT_MODEL_ID = 'gemini-3.5-flash-lite';
// 조건 만들기는 같은 질문에 같은 답이 나와야 한다 (창의성이 필요 없다)
const TEMPERATURE = 0;
// 실패 시 SDK가 다시 묻는 횟수. 무료 등급 한도를 아끼고 응답이 늦어지지 않게 한 번만
const MAX_RETRIES = 1;
const TOO_MANY_REQUESTS = 429;

// E2E용 가짜 모드: AI를 부르지 않고 정해진 조건을 돌려준다 (CI에는 AI 키가 없고, 실제 AI 답은 매번 달라 테스트가 흔들린다).
// 실제 서비스(Vercel Production)에서는 환경 변수가 잘못 들어가도 켜지지 않는다
function isFakeMode(): boolean {
  return (
    process.env.NAKI_FAKE_MODEL === '1' &&
    process.env.VERCEL_ENV !== 'production'
  );
}

// 가짜 답: 질문과 상관없이 "가계부 전체" (체험 계정 예시 기록에 늘 있어 결과 목록이 비지 않는다).
// 기간을 넣지 않는 이유: 서버(한국 날짜)와 브라우저(CI는 UTC)의 "이번 달"이 말일 밤에 달라져 테스트가 그날만 흔들린다
const FAKE_OUTPUT: NakiAiOutput = {
  understood: true,
  type: 'expense',
  from: null,
  to: null,
  keyword: null,
  selects: [],
  ranges: [],
  ratingMin: null,
};

export function isNakiModelConfigured(): boolean {
  return isFakeMode() || Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

export type NakiModelResult =
  // 스키마에 맞는 조건 (허용 여부는 부르는 쪽이 toSearchState로 다시 거른다)
  | { kind: 'ok'; output: NakiAiOutput }
  // 모델이 답은 했지만 스키마에 맞지 않음: 질문을 이해하지 못한 것으로 본다 (사용자에게는 "잘 이해하지 못했어요")
  | { kind: 'unreadable' }
  // AI 제공자가 한도로 거절함(429): "오늘은 나키가 쉬어요" (서비스 전체 한도와 같은 안내)
  | { kind: 'busy' };

// 429인지. 다시 시도(maxRetries) 끝에 실패하면 RetryError로 감싸져 온다
function isRateLimited(error: unknown): boolean {
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  return (
    APICallError.isInstance(cause) && cause.statusCode === TOO_MANY_REQUESTS
  );
}

// 질문 하나 → 조건. 그 밖의 제공자 장애·시간 초과는 그대로 던진다 (부르는 쪽이 횟수를 되돌린다)
export async function askNakiModel({
  question,
  instructions,
  signal,
}: {
  question: string;
  instructions: string;
  signal: AbortSignal;
}): Promise<NakiModelResult> {
  if (isFakeMode()) return { kind: 'ok', output: FAKE_OUTPUT };
  try {
    const result = await generateText({
      // || (?? 아님): .env에 NAKI_MODEL= 처럼 빈 값으로 두면 빈 이름이 아니라 기본 모델을 쓴다
      model: google(process.env.NAKI_MODEL || DEFAULT_MODEL_ID),
      system: instructions,
      prompt: question,
      output: Output.object({ schema: nakiAiOutputSchema }),
      temperature: TEMPERATURE,
      maxRetries: MAX_RETRIES,
      abortSignal: signal,
    });
    return { kind: 'ok', output: result.output };
  } catch (error) {
    if (
      NoObjectGeneratedError.isInstance(error) ||
      NoOutputGeneratedError.isInstance(error)
    ) {
      return { kind: 'unreadable' };
    }
    if (isRateLimited(error)) return { kind: 'busy' };
    throw error;
  }
}
