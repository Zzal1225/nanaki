import { describe, expect, it } from 'vitest';
import type { RecordEntry } from '@/features/records/schema/recordEntry';
import {
  collectCustomNames,
  MAX_NAMES_PER_FIELD,
  nakiCustomNamesSchema,
} from './nakiCustomNames';

const BASE = {
  occurredAt: '2026-10-23',
  memo: '메모는 보내지 않는다',
  tags: [],
};

function expense(
  id: string,
  category: string,
  tags: string[] = [],
  paymentMethod?: string,
): RecordEntry {
  return {
    ...BASE,
    id,
    type: 'expense',
    title: `제목 ${id}`,
    tags,
    fields: {
      amount: 14900,
      category,
      ...(paymentMethod ? { paymentMethod } : {}),
    },
  };
}

describe('사용자가 만든 이름 모으기', () => {
  it('기본 선택지에 없는 칸 값과 태그 이름만, 중복 없이, 최근 것부터', () => {
    const names = collectCustomNames(
      [
        expense('1', 'Ott', ['구독']),
        expense('2', '식비', ['구독', '회사']),
        expense('3', 'Ott', [], '토스'),
        expense('4', '병원'),
      ],
      ['expense'],
    );
    expect(names).toEqual({
      fields: [
        { type: 'expense', field: 'category', values: ['Ott', '병원'] },
        { type: 'expense', field: 'paymentMethod', values: ['토스'] },
      ],
      tags: ['구독', '회사'],
    });
  });

  it('제목·메모·금액·날짜·건수는 담지 않는다 (이름 문자열만)', () => {
    const text = JSON.stringify(
      collectCustomNames([expense('1', 'Ott', ['구독'])], ['expense']),
    );
    expect(text).not.toContain('제목');
    expect(text).not.toContain('메모');
    expect(text).not.toContain('14900');
    expect(text).not.toContain('2026');
  });

  it('서버 상한을 넘는 이름은 모을 때 뺀다 (하나 때문에 요청 전체가 거절되지 않게)', () => {
    const names = collectCustomNames(
      [
        // 이름 상한 20자, 태그 상한 10자를 하나씩 넘긴다
        expense('1', '가'.repeat(21), ['나'.repeat(11)]),
      ],
      ['expense'],
    );
    expect(names).toEqual({ fields: [], tags: [] });
    expect(nakiCustomNamesSchema.safeParse(names).success).toBe(true);
  });

  it('꺼진 타입의 이름은 모으지 않는다', () => {
    expect(
      collectCustomNames([expense('1', 'Ott', ['구독'])], ['workout']),
    ).toEqual({ fields: [], tags: [] });
  });

  it('칸마다 최대 50개 (오래된 이름이 빠진다), 서버 스키마도 같은 상한', () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      expense(String(i), `분류${i}`),
    );
    const names = collectCustomNames(many, ['expense']);
    expect(names.fields[0].values).toHaveLength(MAX_NAMES_PER_FIELD);
    expect(names.fields[0].values[0]).toBe('분류0');
    expect(
      nakiCustomNamesSchema.safeParse({
        fields: [
          {
            type: 'expense',
            field: 'category',
            values: Array.from({ length: 51 }, (_, i) => `x${i}`),
          },
        ],
        tags: [],
      }).success,
    ).toBe(false);
  });
});
