import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createAdminClient,
  deleteGuests,
  hasTestSupabase,
  signInAsNewGuest,
  type TestGuest,
} from './testSupabase';

const INSUFFICIENT_PRIVILEGE = '42501';

// AI 나키 하루 횟수 (step3, 2026-10-23 사용자 결정: 로그인 10 · 체험 3 · 전체 200, 숫자는 서버 환경 변수).
// 세기·되돌리기·조회는 관리자 키(서버)로만: 한도 숫자를 인자로 받는 함수라 사용자에게 열면 우회할 수 있다.
// 전체 줄('global')은 날짜마다 하나라 다른 테스트와 섞이지 않게, 실행마다 다른 먼 미래 날짜를 쓴다.
// 키는 사용자 표와 잇지 않아서 실제 계정 없이 아무 UUID로 센다 (사용자 권한 검사에만 체험 계정을 쓴다)
const RUN_DAY = `2099-${String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}`;

function newKey(): string {
  return crypto.randomUUID();
}

async function consumeQuota(
  key: string,
  day: string,
  userLimit: number,
  globalLimit: number,
) {
  const { data, error } = await createAdminClient().rpc('use_ai_quota', {
    p_user_key: key,
    p_day: day,
    p_user_limit: userLimit,
    p_global_limit: globalLimit,
  });
  if (error) throw error;
  return data;
}

async function usageOf(key: string, day: string) {
  const { data, error } = await createAdminClient().rpc('get_ai_usage', {
    p_user_key: key,
    p_day: day,
  });
  if (error) throw error;
  return data;
}

describe.skipIf(!hasTestSupabase)('ai_usage: 하루 횟수', () => {
  let guest: TestGuest;

  beforeAll(async () => {
    guest = await signInAsNewGuest();
  });
  afterAll(() => deleteGuests(guest));

  it('사용자 키로는 세기·되돌리기·조회를 부를 수 없고, 표도 읽을 수 없다 (한도 우회 막기)', async () => {
    const use = await guest.client.rpc('use_ai_quota', {
      p_user_key: guest.userId,
      p_day: RUN_DAY,
      p_user_limit: 1_000_000,
      p_global_limit: 1_000_000,
    });
    expect(use.error?.code).toBe(INSUFFICIENT_PRIVILEGE);

    const refund = await guest.client.rpc('refund_ai_quota', {
      p_user_key: guest.userId,
      p_day: RUN_DAY,
    });
    expect(refund.error?.code).toBe(INSUFFICIENT_PRIVILEGE);

    const usage = await guest.client.rpc('get_ai_usage', {
      p_user_key: guest.userId,
      p_day: RUN_DAY,
    });
    expect(usage.error?.code).toBe(INSUFFICIENT_PRIVILEGE);

    const read = await guest.client.from('ai_usage').select('count');
    expect(read.data ?? []).toEqual([]);
  });

  it('개인 한도(체험 3회)까지 남은 횟수가 줄고, 넘으면 user_limit (더 늘지 않는다)', async () => {
    const key = newKey();
    const results = [];
    for (let i = 0; i < 4; i += 1) {
      results.push(await consumeQuota(key, RUN_DAY, 3, 1_000));
    }
    expect(results).toEqual(['ok:2', 'ok:1', 'ok:0', 'user_limit']);
    expect(await usageOf(key, RUN_DAY)).toBe(3);
  });

  it('전체 한도에 걸리면 global_limit이고, 방금 늘린 개인 횟수는 되돌린다', async () => {
    // 이 테스트만의 날짜: 전체 줄을 처음부터 센다
    const day = '2098-12-31';
    const [a, b, c] = [newKey(), newKey(), newKey()];
    await createAdminClient().from('ai_usage').delete().eq('day', day);

    expect(await consumeQuota(a, day, 10, 2)).toBe('ok:9');
    expect(await consumeQuota(b, day, 10, 2)).toBe('ok:9');
    expect(await consumeQuota(c, day, 10, 2)).toBe('global_limit');
    // 쓰지 못한 질문이 개인 횟수를 먹지 않는다
    expect(await usageOf(c, day)).toBe(0);
  });

  it('되돌리기는 개인·전체 모두 1 내린다 (AI 제공자 쪽 실패)', async () => {
    const day = '2098-12-30';
    const key = newKey();
    await createAdminClient().from('ai_usage').delete().eq('day', day);
    await consumeQuota(key, day, 10, 5);
    await consumeQuota(key, day, 10, 5);

    const { error } = await createAdminClient().rpc('refund_ai_quota', {
      p_user_key: key,
      p_day: day,
    });
    expect(error).toBeNull();
    expect(await usageOf(key, day)).toBe(1);
    const { data } = await createAdminClient()
      .from('ai_usage')
      .select('count')
      .eq('key', 'global')
      .eq('day', day)
      .single();
    expect(data?.count).toBe(1);
  });

  it('키는 사용자 id 모양 또는 global만', async () => {
    const { error } = await createAdminClient()
      .from('ai_usage')
      .insert({ key: 'anything', day: RUN_DAY });
    expect(error?.code).toBe('23514');
  });
});
