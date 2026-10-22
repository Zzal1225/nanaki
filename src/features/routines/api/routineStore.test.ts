import { describe, expect, it, vi } from 'vitest';
import { toRoutine, toRoutineInsert } from './routineStore';

// toRoutine·toRoutineInsert는 DB를 부르지 않는 순수 변환이라 Supabase 클라이언트는 쓰이지 않는다
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
  created_at: '',
  updated_at: '',
};

describe('toRoutine', () => {
  it('DB 줄(snake_case, Json) → 검사를 통과한 루틴', () => {
    expect(toRoutine(ROW)).toEqual({
      id: ROW.id,
      name: '물 마시기',
      startDate: '2026-10-10',
      schedule: { kind: 'monthly', day: 31 },
      goal: { kind: 'check' },
      endedOn: null,
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
      toRoutine({ ...ROW, ...insert, ended_on: insert.ended_on ?? null }),
    ).toEqual(routine);
  });
});
