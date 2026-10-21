import type { Tables, TablesInsert } from '@/lib/supabase/database.types';
import { recordEntrySchema, type RecordEntry } from '../schema/recordEntry';

// DB 타입은 database.types.ts(자동 생성)에서 가져온다. 손으로 쓰면 DB가 바뀔 때 어긋난다
export type RecordRow = Tables<'records'>;
export type RecordInsert = TablesInsert<'records'>;

// 시스템 칸(user_id, created_at, updated_at, deleted_at)은 화면에 필요 없어서 옮기지 않는다.
// 검증 실패는 null로만 알리고 경고는 부르는 쪽이 한다. 순수 함수로 두어 테스트하기 쉽게
export function toRecordEntry(row: RecordRow): RecordEntry | null {
  const candidate = {
    id: row.id,
    type: row.type,
    occurredAt: row.occurred_at,
    title: row.title,
    memo: row.memo,
    tags: row.tags,
    fields: row.fields,
  };

  // row.type은 string, row.fields는 Json이라 느슨하다. 검사를 통과해야 RecordEntry로 믿을 수 있다
  const result = recordEntrySchema.safeParse(candidate);
  return result.success ? result.data : null;
}

// user_id는 보내지 않는다. DB 기본값(auth.uid())에 맡겨야 남의 id를 넣는 실수가 원천적으로 막힌다
export function toRecordInsert(entry: RecordEntry): RecordInsert {
  return {
    id: entry.id,
    type: entry.type,
    occurred_at: entry.occurredAt,
    title: entry.title,
    memo: entry.memo,
    tags: entry.tags,
    fields: entry.fields,
  };
}
