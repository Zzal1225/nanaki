import { currentLocalDb, syncBeforeRead } from '@/lib/db/currentLocalDb';
import type { LocalDb, SyncCursor } from '@/lib/db/localDb';
import {
  createTableSync,
  pullChanges,
  toAfterCursorFilter,
} from '@/lib/db/sync';
import type { Tables, TablesInsert } from '@/lib/supabase/database.types';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  routineSchema,
  type Routine,
  type RoutineFormValues,
} from '../schema/routine';

// 루틴 저장·조회의 유일한 입구 (recordStore와 같은 규칙: 훅·컴포넌트는 Supabase를 직접 부르지 않는다).
// 25b부터 조회는 기기 사본(IndexedDB)에서 한다 (recordStore와 같은 방식). 만들기·수정·그만두기는 온라인 전용이라
// (2026-10-22 사용자 결정) 서버에 보내고 돌려받은 줄을 사본에 넣는다.
// "내 루틴만" 조건은 쓰지 않는다. RLS가 auth.uid() = user_id를 붙인다.
// 지우는 함수는 없다: DB에도 삭제 권한이 없고, 그만두기(endRoutine)만 한다

type RoutineRow = Tables<'routines'>;
type RoutineInsert = TablesInsert<'routines'>;

// schedule·goal은 DB에서 Json(느슨한 타입)으로 온다. Zod 검사를 통과해야 Routine으로 믿는다.
// 망가진 루틴 하나 때문에 목록 전체가 안 보이면 안 되므로 그 줄만 건너뛰고 남긴다
export function toRoutine(row: RoutineRow): Routine | null {
  const result = routineSchema.safeParse({
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    schedule: row.schedule,
    goal: row.goal,
    endedOn: row.ended_on,
  });
  if (!result.success) {
    console.warn('[routines] 검증 실패로 루틴을 건너뜀', row.id);
    return null;
  }
  return result.data;
}

// user_id는 보내지 않는다 (DB 기본값 auth.uid())
export function toRoutineInsert(routine: Routine): RoutineInsert {
  return {
    id: routine.id,
    name: routine.name,
    start_date: routine.startDate,
    schedule: routine.schedule,
    goal: routine.goal,
    ended_on: routine.endedOn,
  };
}

function toRoutineOrThrow(row: RoutineRow): Routine {
  const routine = toRoutine(row);
  if (!routine) throw new Error(`저장된 루틴을 읽을 수 없음: ${row.id}`);
  return routine;
}

// ── 동기화 ──

async function fetchRoutineChanges(
  after: SyncCursor | null,
  limit: number,
): Promise<RoutineRow[]> {
  const supabase = createSupabaseBrowserClient();
  let query = supabase.from('routines').select('*');
  if (after) query = query.or(toAfterCursorFilter(after));
  const { data, error } = await query
    .order('updated_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data;
}

// 루틴은 지우지 않으므로(그만두기만) 사본에서 뺄 줄이 없다
const syncRoutines = createTableSync((db) =>
  pullChanges({
    db,
    table: 'routines',
    target: db.routines,
    fetchChanges: fetchRoutineChanges,
    isRemoved: () => false,
  }),
);

async function readyLocalDb(): Promise<LocalDb> {
  const db = await currentLocalDb();
  await syncBeforeRead('routines', () => syncRoutines(db));
  return db;
}

// 서버가 돌려준 줄을 사본에 바로 넣는다 (커서는 건드리지 않는다: recordStore의 applyServerRows와 같은 이유)
async function applyServerRows(rows: readonly RoutineRow[]): Promise<void> {
  const db = await currentLocalDb();
  await db.routines.bulkPut([...rows]);
}

// ── 조회 (기기 사본) ──

function compareByCreated(a: RoutineRow, b: RoutineRow): number {
  if (a.created_at !== b.created_at)
    return a.created_at < b.created_at ? -1 : 1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

// 그만둔 루틴도 함께: 지난 날의 체크 목록·달성률은 그 날 진행 중이던 루틴으로 계산한다.
// 만든 순서로 (같은 시각이면 id로 끝까지 정해 두어 불러올 때마다 순서가 바뀌지 않게)
export async function listRoutines(): Promise<Routine[]> {
  const db = await readyLocalDb();
  const rows = await db.routines.toArray();
  rows.sort(compareByCreated);
  return rows.map(toRoutine).filter((r): r is Routine => r !== null);
}

export async function getRoutine(id: string): Promise<Routine | null> {
  const db = await readyLocalDb();
  const row = await db.routines.get(id);
  return row ? toRoutine(row) : null;
}

// ── 쓰기 (온라인 전용, 서버 → 사본) ──

// id를 브라우저가 만든다 (오프라인에서도 만들 수 있게, recordStore와 같은 이유).
// 폼을 거치지 않은 호출도 막으려고 저장 직전에 한 번 더 검사한다
export async function createRoutine(
  values: RoutineFormValues,
): Promise<Routine> {
  const supabase = createSupabaseBrowserClient();
  const routine = routineSchema.parse({
    ...values,
    id: crypto.randomUUID(),
    endedOn: null,
  });
  const { data, error } = await supabase
    .from('routines')
    .insert(toRoutineInsert(routine))
    .select()
    .single();
  if (error) throw error;
  await applyServerRows([data]);
  return toRoutineOrThrow(data);
}

// 이름·시작일·반복·목표만 고친다. 그만둔 날은 endRoutine이 따로 맡는다.
// 반복을 바꾸면 지난 달성률도 새 규칙으로 다시 계산된다 (규칙을 버전별로 쌓지 않는다, 감수한 점)
export async function updateRoutine(
  id: string,
  values: RoutineFormValues,
): Promise<Routine> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('routines')
    .update({
      name: values.name,
      start_date: values.startDate,
      schedule: values.schedule,
      goal: values.goal,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await applyServerRows([data]);
  return toRoutineOrThrow(data);
}

// endedOn(보통 오늘)부터 일정이 없다. 오늘 이미 체크한 기록은 남는다
export async function endRoutine(id: string, endedOn: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('routines')
    .update({ ended_on: endedOn })
    .eq('id', id)
    .select();
  if (error) throw error;
  await applyServerRows(data);
}

// 여러 루틴을 한 번에 (체험하기 예시). 요청 하나라 전부 들어가거나 전부 안 들어간다 (createRecords와 같은 이유)
export async function createRoutines(routines: Routine[]): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const rows = routines.map((routine) =>
    toRoutineInsert(routineSchema.parse(routine)),
  );
  const { data, error } = await supabase.from('routines').insert(rows).select();
  if (error) throw error;
  await applyServerRows(data);
}
