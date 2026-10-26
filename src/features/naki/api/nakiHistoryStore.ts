import { currentLocalDb } from '@/lib/db/currentLocalDb';
import type { SearchState } from '@/features/search/searchState';
import type { NakiAggregate } from '../nakiAggregate';
import { nakiAnswerSchema } from '../nakiApi';
import type { NakiCompare } from '../nakiQuery';
import { normalizeState } from './nakiClient';

// 나키 대화 저장·읽기의 유일한 입구 (2026-10-26 사용자 결정: 이 기기에만, 최근 50개).
// 서버에 질문이 쌓이지 않게 계정별 기기 사본(IndexedDB)에 둔다 → 로그아웃·계정 삭제 때 사본과 함께 지워진다 (deviceData).
// 다른 기기에서는 보이지 않는 것은 감수한다 (서버 저장은 질문 문장이 서버에 남아 고르지 않았다)

export const MAX_NAKI_HISTORY = 50;

export type SavedNakiTurn = {
  seq: number;
  question: string;
  state: SearchState | null;
  aggregate: NakiAggregate;
  compare: NakiCompare | null;
};

// 저장 모양은 나키 API 응답 그대로라 읽을 때 같은 스키마로 검사한다: 앱이 바뀌어 예전 줄의 모양이 달라도
// 그 줄만 빼고 나머지는 보여 준다 (화면이 엉뚱한 값을 그리지 않게)
const savedSchema = nakiAnswerSchema.omit({ remaining: true });

export async function loadNakiHistory(): Promise<SavedNakiTurn[]> {
  const db = await currentLocalDb();
  const rows = await db.nakiTurns.orderBy('seq').toArray();
  return rows.flatMap((row) => {
    const parsed = savedSchema.safeParse(row);
    if (!parsed.success || row.seq === undefined) return [];
    return [
      {
        seq: row.seq,
        question: row.question,
        state: parsed.data.state
          ? normalizeState(parsed.data.state as SearchState)
          : null,
        aggregate: parsed.data.aggregate,
        compare: parsed.data.compare,
      },
    ];
  });
}

// 하나 더하고 오래된 것부터 50개를 넘는 만큼 지운다 (한 트랜잭션: 더하기와 지우기 사이에 다른 탭이 끼지 않게)
export async function saveNakiTurn(
  turn: Omit<SavedNakiTurn, 'seq'>,
  askedAt: Date = new Date(),
): Promise<void> {
  const db = await currentLocalDb();
  await db.transaction('rw', db.nakiTurns, async () => {
    await db.nakiTurns.add({ ...turn, askedAt: askedAt.toISOString() });
    const count = await db.nakiTurns.count();
    if (count > MAX_NAKI_HISTORY) {
      const oldest = await db.nakiTurns
        .orderBy('seq')
        .limit(count - MAX_NAKI_HISTORY)
        .primaryKeys();
      await db.nakiTurns.bulkDelete(oldest);
    }
  });
}

export async function clearNakiHistory(): Promise<void> {
  const db = await currentLocalDb();
  await db.nakiTurns.clear();
}
