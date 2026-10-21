import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { buildSampleRecords } from '../sample/sampleRecords';
import { createRecords, type NewRecordInput } from './recordStore';

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

const insert = vi.fn();

describe('createRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insert.mockResolvedValue({ error: null });
    vi.mocked(createSupabaseBrowserClient).mockReturnValue({
      from: () => ({ insert }),
    } as never);
  });

  it('여러 기록을 요청 하나로, 각자 새 id와 DB 칸 이름으로 보낸다', async () => {
    const inputs = buildSampleRecords('2026-10-21');

    await createRecords(inputs);

    expect(insert).toHaveBeenCalledTimes(1);
    const rows = insert.mock.calls[0][0];
    expect(rows).toHaveLength(inputs.length);
    expect(new Set(rows.map((row: { id: string }) => row.id)).size).toBe(
      inputs.length,
    );
    expect(rows[0]).toMatchObject({
      occurred_at: '2026-10-21',
      type: 'expense',
    });
  });

  // 하나라도 스키마에 어긋나면 아무것도 보내지 않는다 (일부만 들어가지 않게)
  it('검사에 실패한 기록이 있으면 보내지 않고 던진다', async () => {
    const [valid] = buildSampleRecords('2026-10-21');
    const invalid = { ...valid, title: '' } as NewRecordInput;

    await expect(createRecords([valid, invalid])).rejects.toThrow();
    expect(insert).not.toHaveBeenCalled();
  });

  it('DB 오류는 그대로 던진다', async () => {
    const dbError = new Error('네트워크 오류');
    insert.mockResolvedValue({ error: dbError });

    await expect(createRecords(buildSampleRecords('2026-10-21'))).rejects.toBe(
      dbError,
    );
  });
});
