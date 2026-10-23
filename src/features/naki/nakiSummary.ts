import type { RecordEntry } from '@/features/records/schema/recordEntry';
import type { RecordType } from '@/features/records/schema/recordTypes';
import { formatExpenseAmount } from '@/features/records/ui/recordPresentation';

// 답의 한 줄 (시안: "9월 외식비는 -186,400원"). 계산은 AI가 아니라 우리가 한다 (README 6: AI는 조건만).
// 가계부만 보는 질문이면 금액 합계, 그 밖에는 건수. 문장을 지어내지 않고 숫자만 정해진 틀에 넣는다

export type NakiSummary = { count: number; total: number | null };

export function summarizeNakiResults(
  entries: readonly RecordEntry[],
  type: RecordType | null,
): NakiSummary {
  if (type !== 'expense') return { count: entries.length, total: null };
  const total = entries.reduce(
    (sum, entry) =>
      entry.type === 'expense' ? sum + entry.fields.amount : sum,
    0,
  );
  return { count: entries.length, total };
}

export function formatNakiSummary({ count, total }: NakiSummary): string {
  if (count === 0) return '이 조건에 맞는 기록이 없어요';
  if (total !== null) return `합계 ${formatExpenseAmount(total)} · ${count}건`;
  return `모두 ${count}건이에요`;
}
