import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeLocalDb } from '@/lib/db/localDb';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { createFakeBrowserClient } from '@/lib/supabase/fakeBrowserClient.testing';
import { buildSampleRecords } from '../sample/sampleRecords';
import type { RecordRow } from './recordMapper';
import {
  createRecord,
  createRecords,
  deleteRecord,
  getRecord,
  listLatestRecordsWithField,
  listRecentRecords,
  listRecords,
  restoreRecord,
  SEARCH_RESULT_LIMIT,
  searchRecords,
  type NewRecordInput,
} from './recordStore';

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

// 기록 id는 UUID여야 검증을 통과한다. 테스트에서는 이름으로 부르고 같은 이름은 같은 UUID로
const ids = new Map<string, string>();
function uid(name: string): string {
  if (!ids.has(name)) {
    ids.set(
      name,
      `00000000-0000-4000-8000-${String(ids.size).padStart(12, '0')}`,
    );
  }
  return ids.get(name)!;
}
const nameOf = (id: string) =>
  [...ids.entries()].find(([, value]) => value === id)?.[0];

// 서버 줄 (DB 칸 이름). 만든 시각은 넣은 순서대로 늘어난다
let clock = 0;
function row(partial: Partial<RecordRow> & { id: string }): RecordRow {
  clock += 1;
  const time = new Date(Date.UTC(2026, 9, 22, 0, 0, clock)).toISOString();
  return {
    user_id: 'u',
    type: 'expense',
    occurred_at: '2026-10-21',
    title: partial.id,
    memo: null,
    tags: [],
    fields: { amount: 1000, category: '식비' },
    created_at: time,
    updated_at: time,
    deleted_at: null,
    ...partial,
    id: uid(partial.id),
  };
}

// 테스트마다 다른 계정 → 다른 기기 사본(IndexedDB)과 다른 동기화 기록으로 시작한다
let userCount = 0;
let server: ReturnType<typeof createFakeBrowserClient>;
beforeEach(() => {
  userCount += 1;
  server = createFakeBrowserClient(`user-${userCount}`);
  vi.mocked(createSupabaseBrowserClient).mockReturnValue(
    server.client as never,
  );
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  closeLocalDb();
  vi.restoreAllMocks();
});

// 첫 조회의 동기화가 받을 서버 줄 (전체)
function serverHas(...rows: RecordRow[]) {
  server.respond({ data: rows, error: null });
}

describe('조회: 서버의 바뀐 줄을 받아 기기 사본에서 읽는다', () => {
  it('기간 안의 기록을 날짜 → 만든 순서로, 지운 기록은 빼고', async () => {
    serverHas(
      row({ id: 'late', occurred_at: '2026-10-20' }),
      row({ id: 'early', occurred_at: '2026-10-05' }),
      row({ id: 'gone', deleted_at: '2026-10-22T00:00:00Z' }),
      row({ id: 'november', occurred_at: '2026-11-01' }),
    );
    const entries = await listRecords('2026-10-01', '2026-10-31');
    expect(entries.map((e) => nameOf(e.id))).toEqual(['early', 'late']);
  });

  // 25a 실험: 오프라인이면 화면이 회색 자리에 멈췄다. 이제는 사본으로 바로 그린다
  it('동기화가 실패해도(오프라인) 사본에 있는 것으로 답한다', async () => {
    serverHas(row({ id: 'a' }));
    await listRecords('2026-10-01', '2026-10-31');

    // 시각만 앞으로 (5초 건너뛰기를 넘기려고). 타이머까지 멈추면 fake-indexeddb 내부가 멈춘다
    vi.useFakeTimers({ now: Date.now() + 10_000, toFake: ['Date'] });
    server.failNext();
    const entries = await listRecords('2026-10-01', '2026-10-31');
    vi.useRealTimers();
    expect(entries.map((e) => nameOf(e.id))).toEqual(['a']);
  });

  it('최근 기록: 최신 날짜부터 limit개, 루틴 체크는 뺀다', async () => {
    serverHas(
      row({ id: 'old', occurred_at: '2026-10-01' }),
      row({
        id: 'check',
        type: 'routine',
        occurred_at: '2026-10-21',
        title: '물 마시기',
        fields: {
          routineId: '11111111-1111-4111-8111-111111111111',
          count: 1,
          target: 1,
          unit: '',
        },
      }),
      row({ id: 'new', occurred_at: '2026-10-20' }),
      row({ id: 'newer', occurred_at: '2026-10-20' }),
    );
    const entries = await listRecentRecords(2);
    expect(entries.map((e) => nameOf(e.id))).toEqual(['newer', 'new']);
  });

  it('한 기록 보기: 사본에 없으면 null', async () => {
    serverHas(row({ id: 'a' }));
    expect(nameOf((await getRecord(uid('a')))!.id)).toBe('a');
    expect(await getRecord(uid('없음'))).toBeNull();
  });

  it('그 칸이 있는 최근 기록 (체중만, 허리둘레 기록은 건너뛴다)', async () => {
    serverHas(
      row({
        id: 'w1',
        type: 'body',
        occurred_at: '2026-10-10',
        title: '체중',
        fields: { weight: 69 },
      }),
      row({
        id: 'waist',
        type: 'body',
        occurred_at: '2026-10-20',
        title: '허리둘레',
        fields: { waist: 78 },
      }),
      row({
        id: 'w2',
        type: 'body',
        occurred_at: '2026-10-15',
        title: '체중',
        fields: { weight: 68.4 },
      }),
    );
    const entries = await listLatestRecordsWithField('body', 'weight', 2);
    expect(entries.map((e) => nameOf(e.id))).toEqual(['w2', 'w1']);
  });
});

describe('검색 (기기 사본)', () => {
  it('검색어·기간으로 찾고 정렬한다', async () => {
    serverHas(
      row({ id: 'coffee', title: '커피', occurred_at: '2026-10-10' }),
      row({
        id: 'cafe',
        title: '케이크',
        occurred_at: '2026-10-12',
        fields: { amount: 6000, category: '카페' },
      }),
      row({ id: 'sept', title: '커피', occurred_at: '2026-09-30' }),
    );
    const result = await searchRecords({
      keyword: '커피',
      sort: 'oldest',
      range: { from: '2026-10-01', to: '2026-10-31' },
    });
    expect(result.entries.map((e) => nameOf(e.id))).toEqual(['coffee']);

    const byCategory = await searchRecords({
      keyword: '카페',
      sort: 'latest',
      range: null,
    });
    expect(byCategory.entries.map((e) => nameOf(e.id))).toEqual(['cafe']);
  });

  it('한도를 넘으면 잘라 내고 알린다', async () => {
    serverHas(
      ...Array.from({ length: SEARCH_RESULT_LIMIT + 1 }, (_, i) =>
        row({ id: `r${i}` }),
      ),
    );
    const result = await searchRecords({
      keyword: '',
      sort: 'latest',
      range: null,
    });
    expect(result.entries).toHaveLength(SEARCH_RESULT_LIMIT);
    expect(result.isTruncated).toBe(true);
  });
});

describe('쓰기: 서버에 보내고, 돌려받은 줄을 사본에 바로 넣는다', () => {
  const LUNCH: NewRecordInput = {
    type: 'expense',
    occurredAt: '2026-10-21',
    title: '점심',
    memo: null,
    tags: [],
    fields: { amount: 9800, category: '식비' },
  };

  it('새 기록은 다음 동기화를 기다리지 않고 목록에 보인다', async () => {
    serverHas();
    await listRecords('2026-10-01', '2026-10-31');

    server.respond({ data: row({ id: 'lunch', title: '점심' }), error: null });
    await createRecord(LUNCH);

    // 방금 동기화했으므로(5초 안) 서버에 다시 묻지 않고 사본에서 읽는다
    const entries = await listRecords('2026-10-01', '2026-10-31');
    expect(entries.map((e) => e.title)).toEqual(['점심']);
  });

  it('지우면 사본에서 빠지고, 되돌리면 다시 들어온다', async () => {
    const lunch = row({ id: 'lunch' });
    serverHas(lunch);
    await listRecords('2026-10-01', '2026-10-31');

    server.respond({
      data: [{ ...lunch, deleted_at: '2026-10-22T01:00:00Z' }],
      error: null,
    });
    await deleteRecord(uid('lunch'));
    expect(await getRecord(uid('lunch'))).toBeNull();

    server.respond({ data: [lunch], error: null });
    await restoreRecord(uid('lunch'));
    expect(await getRecord(uid('lunch'))).not.toBeNull();
  });

  // 대시보드에서 줄을 아예 지운 경우 등: 오류 없이 0줄이 바뀐다. 성공으로 알리면 안 된다
  it('되돌릴 줄이 없으면 실패로 알린다', async () => {
    server.respond({ data: [], error: null });
    await expect(restoreRecord('gone')).rejects.toThrow('되돌릴 기록이 없음');
  });

  it('여러 기록을 요청 하나로, 각자 새 id와 DB 칸 이름으로 보낸다', async () => {
    const inputs = buildSampleRecords('2026-10-21');
    server.respond({ data: [], error: null });

    await createRecords(inputs);

    const inserts = server.calls.filter((call) => call.method === 'insert');
    expect(inserts).toHaveLength(1);
    const rows = inserts[0].args[0] as { id: string; occurred_at: string }[];
    expect(rows).toHaveLength(inputs.length);
    expect(new Set(rows.map((r) => r.id)).size).toBe(inputs.length);
  });

  // 하나라도 스키마에 어긋나면 아무것도 보내지 않는다 (일부만 들어가지 않게)
  it('검사에 실패한 기록이 있으면 보내지 않고 던진다', async () => {
    const [valid] = buildSampleRecords('2026-10-21');
    const invalid = { ...valid, title: '' } as NewRecordInput;

    await expect(createRecords([valid, invalid])).rejects.toThrow();
    expect(server.calls.some((call) => call.method === 'insert')).toBe(false);
  });

  it('DB 오류는 그대로 던진다', async () => {
    const dbError = new Error('네트워크 오류');
    server.respond({ data: null, error: dbError });
    await expect(createRecord(LUNCH)).rejects.toBe(dbError);
  });
});
