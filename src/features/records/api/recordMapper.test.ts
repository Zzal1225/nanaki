import { describe, expect, it } from 'vitest';
import type { RecordEntry } from '../schema/recordEntry';
import { toRecordEntry, toRecordInsert, type RecordRow } from './recordMapper';

const ID = '3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b';

// DB에서 읽어 온 모양 그대로 (snake_case, 시스템 칸 포함)
const EXPENSE_ROW: RecordRow = {
  id: ID,
  user_id: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
  type: 'expense',
  occurred_at: '2026-10-20',
  title: '점심',
  memo: null,
  tags: ['회사'],
  fields: { amount: 12500, category: '식비', paymentMethod: '카드' },
  created_at: '2026-10-20T03:00:00+00:00',
  updated_at: '2026-10-20T03:00:00+00:00',
  deleted_at: null,
};

// 앱에서 쓰는 모양 (camelCase, 시스템 칸 없음)
const EXPENSE_ENTRY: RecordEntry = {
  id: ID,
  type: 'expense',
  occurredAt: '2026-10-20',
  title: '점심',
  memo: null,
  tags: ['회사'],
  fields: { amount: 12500, category: '식비', paymentMethod: '카드' },
};

describe('toRecordEntry', () => {
  it('DB 줄을 앱 값으로 바꾼다 (칸 이름 변환, 시스템 칸 제거)', () => {
    expect(toRecordEntry(EXPENSE_ROW)).toEqual(EXPENSE_ENTRY);
  });
  it('fields가 타입과 안 맞는 줄은 null', () => {
    expect(toRecordEntry({ ...EXPENSE_ROW, fields: { rating: 4 } })).toBeNull();
  });
  it("아직 없는 타입('workout') 줄은 null", () => {
    expect(toRecordEntry({ ...EXPENSE_ROW, type: 'workout' })).toBeNull();
  });
});

describe('toRecordInsert', () => {
  it('앱 값을 DB 줄로 바꾼다', () => {
    expect(toRecordInsert(EXPENSE_ENTRY)).toEqual({
      id: ID,
      type: 'expense',
      occurred_at: '2026-10-20',
      title: '점심',
      memo: null,
      tags: ['회사'],
      fields: { amount: 12500, category: '식비', paymentMethod: '카드' },
    });
  });
  // user_id를 보낼 수 있으면 남의 id를 넣는 실수도 가능하다. DB 기본값(auth.uid())에 맡긴다
  it('user_id는 보내지 않는다', () => {
    expect(toRecordInsert(EXPENSE_ENTRY)).not.toHaveProperty('user_id');
  });
  it('앱 값 → DB 줄 → 앱 값으로 돌아와도 같다', () => {
    const insert = toRecordInsert(EXPENSE_ENTRY);
    const row: RecordRow = {
      ...EXPENSE_ROW,
      ...insert,
      fields: insert.fields ?? {},
      memo: insert.memo ?? null,
      tags: insert.tags ?? [],
    };
    expect(toRecordEntry(row)).toEqual(EXPENSE_ENTRY);
  });
});
