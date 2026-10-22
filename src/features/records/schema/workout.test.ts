import { describe, expect, it } from 'vitest';
import { recordEntrySchema, workoutFormSchema } from './recordEntry';
import { MAX_WORKOUT_DISTANCE_KM, MAX_WORKOUT_MINUTES } from './workout';

const VALID_WORKOUT = {
  id: '6f1c6c84-6f4b-4a8c-9d64-7c8f2a6f0e11',
  type: 'workout',
  occurredAt: '2026-10-21',
  title: '한강 러닝',
  memo: null,
  tags: [],
  fields: { activity: '러닝', minutes: 30, distance: 5.2 },
};

function isValid(value: unknown) {
  return recordEntrySchema.safeParse(value).success;
}

describe('운동 기록 스키마', () => {
  it('종목·시간·거리(소수 한 자리)를 통과', () => {
    expect(isValid(VALID_WORKOUT)).toBe(true);
  });
  it('거리는 선택 칸 (종목과 시간만으로 기록할 수 있다)', () => {
    expect(
      isValid({ ...VALID_WORKOUT, fields: { activity: '요가', minutes: 40 } }),
    ).toBe(true);
  });
  it('목록에 없는 종목도 직접 입력으로 통과', () => {
    expect(
      isValid({
        ...VALID_WORKOUT,
        fields: { activity: '클라이밍', minutes: 90 },
      }),
    ).toBe(true);
  });
  it('시간은 필수, 하루(1440분)를 넘으면 실패', () => {
    expect(isValid({ ...VALID_WORKOUT, fields: { activity: '러닝' } })).toBe(
      false,
    );
    expect(
      isValid({
        ...VALID_WORKOUT,
        fields: { activity: '러닝', minutes: MAX_WORKOUT_MINUTES + 1 },
      }),
    ).toBe(false);
  });
  it('거리는 소수 한 자리·상한까지', () => {
    const withDistance = (distance: number) => ({
      ...VALID_WORKOUT,
      fields: { activity: '러닝', minutes: 30, distance },
    });
    expect(isValid(withDistance(5.25))).toBe(false);
    expect(isValid(withDistance(MAX_WORKOUT_DISTANCE_KM + 1))).toBe(false);
  });
});

describe('운동 작성 폼 스키마 (제목 칸 없음)', () => {
  // 작성 폼은 id 없이 받는다
  const input = { ...VALID_WORKOUT, id: undefined };

  it("제목은 늘 종목 이름 (폼에 제목 칸이 없어 ''로 온다)", () => {
    const result = workoutFormSchema.parse({ ...input, title: '' });
    expect(result.title).toBe('러닝');
  });
  // 예전에 제목 칸이 있던 때 쓴 제목("하체 데이")이 있는 기록을 고쳐 저장하면 종목 이름으로 바뀐다 (감수한 점)
  it('예전 제목이 들어와도 종목 이름으로 바꾼다', () => {
    const result = workoutFormSchema.parse({ ...input, title: '하체 데이' });
    expect(result.title).toBe('러닝');
  });
  it('폼을 통과한 값은 저장된 기록 스키마(제목 필수)도 통과한다', () => {
    const result = workoutFormSchema.parse({ ...input, title: '' });
    expect(isValid({ ...result, id: VALID_WORKOUT.id })).toBe(true);
  });
});
