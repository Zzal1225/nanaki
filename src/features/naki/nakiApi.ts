import { z } from 'zod';
import {
  parseRecordType,
  type RecordType,
} from '@/features/records/schema/recordTypes';
import { isDateString } from '@/shared/date/calendar';
import { LIST_AGGREGATE, NAKI_INTENTS } from './nakiAggregate';
import { EMPTY_CUSTOM_NAMES, nakiCustomNamesSchema } from './nakiCustomNames';

// 나키 API(/api/naki)의 요청·응답 모양. 서버와 브라우저가 같은 스키마를 쓴다:
// 서버는 받은 요청을, 브라우저는 받은 응답을 이 스키마로 검사한다 (주고받는 값을 믿지 않는다)

export const NAKI_API_PATH = '/api/naki';
// 질문 글자 상한. 조건 하나를 묻기에 충분하고, 긴 글을 붙여 넣어 무료 한도를 쓰지 않게
export const MAX_NAKI_QUESTION_LENGTH = 200;

export const nakiRequestSchema = z.object({
  question: z.string().trim().min(1).max(MAX_NAKI_QUESTION_LENGTH),
  // 브라우저의 오늘 ('YYYY-MM-DD'). "지난달"을 사용자의 날짜로 계산하게 (서버는 UTC라 한국 오전 9시 전엔 어제다)
  today: z.string().refine(isDateString),
  // 켜진 타입 (설정에서 끈 타입은 묻지도 찾지도 않는다)
  types: z
    .array(z.string())
    .min(1)
    .transform((values) =>
      values.flatMap((value) => {
        const type = parseRecordType(value);
        return type ? [type] : [];
      }),
    )
    .pipe(z.array(z.custom<RecordType>()).min(1)),
  // 사용자가 만든 분류·태그 이름 (기록 내용은 없다, nakiCustomNames). 없으면 빈 목록: 예전 브라우저가 보낸 요청도 받는다
  customNames: nakiCustomNamesSchema.default(EMPTY_CUSTOM_NAMES),
});
export type NakiRequest = z.infer<typeof nakiRequestSchema>;

// 검색 조건은 SearchState 모양 그대로 돌아온다 (searchState). 브라우저에서 다시 거를 일이 없도록 서버가 이미 걸렀다
const searchStateSchema = z.object({
  keyword: z.string(),
  type: z.string().nullable(),
  sort: z.enum(['latest', 'oldest']),
  period: z
    .object({ kind: z.literal('custom'), from: z.string(), to: z.string() })
    .nullable(),
  fields: z.record(z.string(), z.unknown()),
});

export const nakiAnswerSchema = z.object({
  // null = 잘 이해하지 못했어요
  state: searchStateSchema.nullable(),
  // 34e 무엇을 계산할지 (서버가 걸렀다, nakiAggregate). 없으면 목록: 새 화면이 예전 서버 응답을 받아도 그린다
  aggregate: z
    .object({ intent: z.enum(NAKI_INTENTS), field: z.string().nullable() })
    .default(LIST_AGGREGATE),
  remaining: z.number().int(),
});

export const nakiQuotaSchema = z.object({
  remaining: z.number().int(),
  limit: z.number().int(),
  // 체험(익명) 계정인지. 한도 안내 문구가 갈린다 ("구글로 로그인 시 하루 10회")
  isGuest: z.boolean(),
});
export type NakiQuota = z.infer<typeof nakiQuotaSchema>;

// 실패 종류 (응답 본문 { error }). 화면 문구가 이것으로 갈린다
export const NAKI_ERRORS = [
  // 이 계정의 오늘 횟수를 다 씀 (429)
  'limit',
  // 서비스 전체 하루 횟수를 다 썼거나 AI 제공자가 한도로 거절함(429). 사용자 탓이 아니라 "오늘은 나키가 쉬어요"
  'rest',
  // 이 환경에 AI 키가 없음 (503)
  'unavailable',
  // AI 제공자 실패·시간 초과 (502). 횟수는 되돌렸다
  'model',
  // 로그인 세션 없음 (401)
  'signedOut',
  // 요청 모양이 틀림 (400)
  'badRequest',
] as const;
export type NakiError = (typeof NAKI_ERRORS)[number];

export const nakiErrorSchema = z.object({
  error: z.enum(NAKI_ERRORS),
  remaining: z.number().int().optional(),
  // 'limit'일 때: 체험 계정이면 로그인 계정 한도를 알려 로그인을 권한다
  isGuest: z.boolean().optional(),
  userLimit: z.number().int().optional(),
});
