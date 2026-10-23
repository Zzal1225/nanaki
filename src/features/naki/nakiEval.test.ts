import { describe, expect, it } from 'vitest';
import type { RecordType } from '@/features/records/schema/recordTypes';
import type { SearchState } from '@/features/search/searchState';
import { toNakiAggregate, type NakiAggregate } from './nakiAggregate';
import type { NakiCustomNames } from './nakiCustomNames';
import {
  buildNakiInstructions,
  describeTypesForAi,
  toSearchState,
} from './nakiQuery';
import { askNakiModel } from './server/nakiModel';

// 나키 질문 묶음 확인 (34e): 지시문을 고칠 때마다 실제 AI로 같은 질문을 돌려 회귀를 잡는다.
// 실제 키가 필요하고 답이 실행마다 조금씩 흔들려서 CI에서는 돌리지 않는다: `npm run naki:eval`(scripts/naki-eval.mjs)만 켠다.
// 지금까지 지시문을 고칠 때 한 문장이 다른 질문을 깨뜨린 적이 있다("외식비 → 식비"가 검색어 "외식"이 됨, 2026-10-23)

const ALL_TYPES: readonly RecordType[] = [
  'expense',
  'review',
  'workout',
  'body',
  'routine',
];
const TODAY = '2026-10-23';
const NAMES: NakiCustomNames = {
  fields: [{ type: 'expense', field: 'category', values: ['Ott'] }],
  tags: ['회사'],
};
// 무료 등급 분당 요청 한도에 걸리지 않게 (질문 10여 개를 연달아 보내면 끝쪽이 429였다)
const GAP_MS = 4500;

type Answer = { state: SearchState | null; aggregate: NakiAggregate };
type Case = { question: string; check: (answer: Answer) => void };

const select = (answer: Answer, field: string) => {
  const filter = answer.state?.fields[field];
  return filter?.kind === 'select' ? filter.values : [];
};

const CASES: Case[] = [
  // 조건 (34a~34d)
  {
    question: '지난달 외식비 얼마였어?',
    check: (a) => {
      expect(a.state?.type).toBe('expense');
      expect(select(a, 'category')).toEqual(['식비']);
      expect(a.state?.period).toEqual({
        kind: 'custom',
        from: '2026-09-01',
        to: '2026-09-30',
      });
    },
  },
  {
    question: '별점 4점 이상 후기 보여줘',
    check: (a) => {
      expect(a.state?.type).toBe('review');
      expect(a.state?.fields.rating).toEqual({ kind: 'rating', min: 4 });
    },
  },
  {
    question: '내가 구독중인 Ott는?',
    check: (a) => expect(select(a, 'category')).toEqual(['Ott']),
  },
  {
    question: '회사 태그 붙은 지출',
    check: (a) => expect(a.state?.keyword).toBe('회사'),
  },
  { question: '안녕', check: (a) => expect(a.state).toBeNull() },
  // 집계 (34e)
  {
    question: '지난달 식비 얼마 썼어?',
    check: (a) => {
      expect(a.aggregate).toEqual({ intent: 'sum', field: 'amount' });
      expect(select(a, 'category')).toEqual(['식비']);
    },
  },
  {
    question: '이번 달 카페 몇 번 갔어?',
    check: (a) => {
      expect(a.aggregate.intent).toBe('count');
      expect(select(a, 'category')).toEqual(['카페']);
    },
  },
  {
    question: '이번 달 운동 평균 몇 분 했어?',
    check: (a) => {
      expect(a.state?.type).toBe('workout');
      expect(a.aggregate).toEqual({ intent: 'avg', field: 'minutes' });
    },
  },
  {
    question: '체중 제일 낮았던 게 언제야?',
    check: (a) => {
      expect(a.state?.type).toBe('body');
      expect(a.aggregate).toEqual({ intent: 'min', field: 'weight' });
    },
  },
  {
    question: '올해 가장 비싸게 쓴 지출은?',
    check: (a) => {
      expect(a.state?.type).toBe('expense');
      expect(a.aggregate).toEqual({ intent: 'max', field: 'amount' });
    },
  },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe.runIf(process.env.NAKI_EVAL === '1')(
  '나키 질문 묶음 (실제 AI)',
  () => {
    it(
      `질문 ${CASES.length}개`,
      async () => {
        const instructions = buildNakiInstructions(
          TODAY,
          describeTypesForAi(ALL_TYPES, NAMES),
          NAMES.tags,
        );
        const failures: string[] = [];
        for (const [index, item] of CASES.entries()) {
          if (index > 0) await sleep(GAP_MS);
          const result = await askNakiModel({
            question: item.question,
            instructions,
            signal: AbortSignal.timeout(20_000),
          });
          const state =
            result.kind === 'ok'
              ? toSearchState(result.output, ALL_TYPES)
              : null;
          const answer: Answer = {
            state,
            aggregate:
              result.kind === 'ok' && state
                ? toNakiAggregate(
                    result.output.intent,
                    result.output.metric,
                    state.type,
                  )
                : { intent: 'list', field: null },
          };
          const shown = JSON.stringify({
            kind: result.kind,
            type: state?.type,
            keyword: state?.keyword,
            period: state?.period,
            fields: state?.fields,
            aggregate: answer.aggregate,
          });
          try {
            item.check(answer);
            console.log(`✓ ${item.question} → ${shown}`);
          } catch (error) {
            failures.push(item.question);
            console.log(
              `✗ ${item.question} → ${shown}\n   ${(error as Error).message.split('\n')[0]}`,
            );
          }
        }
        console.log(`\n통과 ${CASES.length - failures.length}/${CASES.length}`);
        expect(failures).toEqual([]);
      },
      CASES.length * (GAP_MS + 20_000),
    );
  },
);
