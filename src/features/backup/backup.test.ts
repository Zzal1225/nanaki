import { describe, expect, it } from 'vitest';
import type { RecordEntry } from '@/features/records/schema/recordEntry';
import type { Routine } from '@/features/routines/schema/routine';
import {
  backupFileName,
  buildBackup,
  parseBackup,
  type BackupData,
} from './backupFile';
import { buildIdMap, importedId, planImport } from './importPlan';

const RECORD_ID = '0b6e4f0e-2d4c-4c84-9a0c-5a5e1c2f7a31';
const ROUTINE_ID = '1c7f5f1f-3e5d-4d95-8b1d-6b6f2d3f8b42';
const CHECK_ID = '2d8a6a2a-4f6e-4ea6-9c2e-7c7a3e4a9c53';
const USER = '9f1e2d3c-4b5a-4968-8776-655443322110';

const expense: RecordEntry = {
  id: RECORD_ID,
  type: 'expense',
  occurredAt: '2026-10-20',
  title: '점심',
  memo: null,
  tags: [],
  fields: { amount: 9800, category: '식비' },
};

const routine: Routine = {
  id: ROUTINE_ID,
  name: '물 마시기',
  startDate: '2026-10-01',
  schedule: { kind: 'weekly', days: [0, 1, 2, 3, 4, 5, 6] },
  goal: { kind: 'check' },
  endedOn: null,
  remindAt: null,
};

const check: RecordEntry = {
  id: CHECK_ID,
  type: 'routine',
  occurredAt: '2026-10-20',
  title: '물 마시기',
  memo: null,
  tags: [],
  fields: { routineId: ROUTINE_ID, count: 1, target: 1, unit: '' },
};

const DATA: BackupData = {
  records: [expense, check],
  routines: [routine],
  budgets: [{ month: '2026-10', total: 500000, categories: {} }],
  fixedExpenses: [],
};

const NONE = {
  recordIds: new Set<string>(),
  routineIds: new Set<string>(),
  fixedExpenseIds: new Set<string>(),
  budgetMonths: new Set<string>(),
};

describe('백업 파일', () => {
  it('만들고 그대로 다시 읽는다 (앱 이름·버전·내보낸 시각)', () => {
    const file = buildBackup(DATA, new Date('2026-10-24T01:00:00Z'));
    expect(file).toMatchObject({ app: 'nanaki', version: 1 });
    const parsed = parseBackup(JSON.stringify(file));
    expect(parsed).toEqual({
      ok: true,
      backup: { data: DATA, invalidCount: 0 },
    });
  });
  it('파일 이름은 날짜로', () => {
    expect(backupFileName('2026-10-24')).toBe('nanaki-backup-2026-10-24.json');
  });
  it('망가진 항목만 건너뛰고 센다', () => {
    const file = buildBackup(DATA, new Date());
    const broken = {
      ...file,
      records: [...file.records, { id: 'x', type: 'expense' }],
    };
    const parsed = parseBackup(JSON.stringify(broken));
    expect(parsed.ok && parsed.backup.invalidCount).toBe(1);
    expect(parsed.ok && parsed.backup.data.records).toHaveLength(2);
  });
  it('JSON이 아니거나, nanaki 백업이 아니거나, 더 새 버전이면 읽지 않는다', () => {
    expect(parseBackup('{oops')).toEqual({ ok: false, error: 'notJson' });
    expect(parseBackup('{"hello":1}')).toEqual({
      ok: false,
      error: 'notBackup',
    });
    expect(
      parseBackup(
        JSON.stringify({ ...buildBackup(DATA, new Date()), version: 99 }),
      ),
    ).toEqual({ ok: false, error: 'newerVersion' });
  });
});

describe('importedId (계정마다 정해지는 새 id)', () => {
  it('같은 입력이면 같은 값, 계정이 다르면 다른 값, UUID 버전 8 모양', async () => {
    const a = await importedId(USER, RECORD_ID);
    expect(await importedId(USER, RECORD_ID)).toBe(a);
    expect(await importedId('another-user', RECORD_ID)).not.toBe(a);
    expect(a).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(a).not.toBe(RECORD_ID);
  });
});

describe('planImport (없는 것만 더하기)', () => {
  it('빈 계정이면 모두 새 id로, 루틴 체크는 새 루틴 id를 따라간다', async () => {
    const idMap = await buildIdMap(USER, DATA);
    const plan = planImport(DATA, NONE, idMap);
    const newRoutineId = idMap.get(ROUTINE_ID);
    expect(plan.routines[0]?.id).toBe(newRoutineId);
    const newCheck = plan.records.find((record) => record.type === 'routine');
    expect(newCheck?.id).toBe(idMap.get(CHECK_ID));
    expect(newCheck?.type === 'routine' && newCheck.fields.routineId).toBe(
      newRoutineId,
    );
    expect(plan.budgets).toHaveLength(1);
    expect(plan.skippedCount).toBe(0);
  });

  it('지금 계정에 있는 것(원래 id·같은 달 예산)은 건너뛰고, 있는 루틴의 체크는 원래 루틴 id로', async () => {
    const idMap = await buildIdMap(USER, DATA);
    const plan = planImport(
      DATA,
      {
        recordIds: new Set([RECORD_ID]),
        routineIds: new Set([ROUTINE_ID]),
        fixedExpenseIds: new Set(),
        budgetMonths: new Set(['2026-10']),
      },
      idMap,
    );
    expect(plan.records).toHaveLength(1);
    const newCheck = plan.records[0];
    expect(newCheck?.type === 'routine' && newCheck.fields.routineId).toBe(
      ROUTINE_ID,
    );
    expect(plan.routines).toHaveLength(0);
    expect(plan.budgets).toHaveLength(0);
    // 기록 1 + 루틴 1 + 예산 1
    expect(plan.skippedCount).toBe(3);
  });
});
