import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { closeLocalDb } from '@/lib/db/localDb';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { createFakeBrowserClient } from '@/lib/supabase/fakeBrowserClient.testing';
import {
  endRoutine,
  getRoutine,
  listRoutines,
  toRoutine,
  toRoutineInsert,
} from './routineStore';

// 변환 테스트는 서버를 부르지 않는다. 조회·쓰기 테스트만 아래에서 가짜 클라이언트를 넣는다
vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

const ROW = {
  id: '3f0e3f5a-8f6f-4c2b-9a51-0d7b2f9e6c11',
  user_id: 'u',
  name: '물 마시기',
  start_date: '2026-10-10',
  schedule: { kind: 'monthly', day: 31 },
  goal: { kind: 'check' },
  ended_on: null,
  remind_at: null,
  created_at: '',
  updated_at: '',
};

describe('toRoutine', () => {
  it('알림 시각: DB time "21:30:00" → "21:30", 칸이 없는 옛 사본 줄은 알림 없음', () => {
    expect(toRoutine({ ...ROW, remind_at: '21:30:00' })?.remindAt).toBe(
      '21:30',
    );
    const oldRow: Partial<typeof ROW> = { ...ROW };
    delete oldRow.remind_at;
    expect(toRoutine(oldRow as typeof ROW)?.remindAt).toBeNull();
  });
  it('DB 줄(snake_case, Json) → 검사를 통과한 루틴', () => {
    expect(toRoutine(ROW)).toEqual({
      id: ROW.id,
      name: '물 마시기',
      startDate: '2026-10-10',
      schedule: { kind: 'monthly', day: 31 },
      goal: { kind: 'check' },
      endedOn: null,
      remindAt: null,
    });
  });
  it('모양이 틀린 반복(DB는 종류만 검사)은 null로 건너뛴다', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(toRoutine({ ...ROW, schedule: { kind: 'monthly', day: 40 } })).toBe(
      null,
    );
  });
  it('되돌리기(왕복): 루틴 → insert 줄 → 루틴', () => {
    const routine = toRoutine(ROW)!;
    const insert = toRoutineInsert(routine);
    expect(insert).not.toHaveProperty('user_id');
    expect(
      toRoutine({
        ...ROW,
        ...insert,
        ended_on: insert.ended_on ?? null,
        remind_at: insert.remind_at ?? null,
      }),
    ).toEqual(routine);
  });
});

describe('기기 사본', () => {
  afterEach(() => closeLocalDb());

  const WATER = '11111111-1111-4111-8111-111111111111';
  const STRETCH = '22222222-2222-4222-8222-222222222222';

  it('서버의 루틴을 받아 만든 순서로 읽고, 그만두기는 돌려받은 줄로 사본을 고친다', async () => {
    const server = createFakeBrowserClient('routine-user');
    vi.mocked(createSupabaseBrowserClient).mockReturnValue(
      server.client as never,
    );
    const stretch = {
      ...ROW,
      id: STRETCH,
      name: '스트레칭',
      created_at: '2026-10-02T00:00:00Z',
      updated_at: '2026-10-02T00:00:00Z',
    };
    const water = {
      ...ROW,
      id: WATER,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    };
    server.respond({ data: [stretch, water], error: null });

    expect((await listRoutines()).map((r) => r.name)).toEqual([
      '물 마시기',
      '스트레칭',
    ]);

    server.respond({
      data: [{ ...water, ended_on: '2026-10-21' }],
      error: null,
    });
    await endRoutine(WATER, '2026-10-21');
    expect((await getRoutine(WATER))?.endedOn).toBe('2026-10-21');
  });
});
