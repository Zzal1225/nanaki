import { RECORD_TYPE_ORDER } from '@/features/records/entry/newRecordMenu';
import type { RecordEntry } from '@/features/records/schema/recordEntry';
import type { RecordType } from '@/features/records/schema/recordTypes';

// 한 달 치 기록을 날짜별로 한 번만 나눠 둔다. 칸마다 전체 목록을 filter하면 42칸 × 기록 수만큼 돈다
export function groupByDate(
  entries: RecordEntry[],
): Map<string, RecordEntry[]> {
  const byDate = new Map<string, RecordEntry[]>();
  for (const entry of entries) {
    const list = byDate.get(entry.occurredAt);
    if (list) list.push(entry);
    else byDate.set(entry.occurredAt, [entry]);
  }
  return byDate;
}

export type DayTypeGroup = {
  type: RecordType;
  entries: RecordEntry[];
};

// 하루 기록을 타입별로 묶는다. 순서는 스피드 다이얼·기록 탭과 같은 RECORD_TYPE_ORDER라서
// 칸의 점 순서와 아래 요약 줄 순서가 늘 같다. 기록이 없는 타입은 빠진다
export function groupByType(entries: RecordEntry[]): DayTypeGroup[] {
  return RECORD_TYPE_ORDER.map((type) => ({
    type,
    entries: entries.filter((entry) => entry.type === type),
  })).filter((group) => group.entries.length > 0);
}
