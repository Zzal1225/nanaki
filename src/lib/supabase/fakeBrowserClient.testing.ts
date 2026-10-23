import { vi } from 'vitest';

// 테스트 전용 가짜 Supabase 브라우저 클라이언트 (앱 코드는 import하지 않는다).
// 쿼리 사슬(.from().select().or().order()…)의 각 단계는 자기 자신을 돌려주며 호출을 기록하고,
// await하는 순간 미리 넣어 둔 응답을 차례로 하나씩 꺼내 준다.
// 저장소 함수가 "어떤 순서로 서버에 묻는지"는 응답 순서로 정하고, "무엇을 물었는지"는 calls로 확인한다

type Result = { data: unknown; error: unknown };

const CHAIN_METHODS = [
  'select',
  'insert',
  'upsert',
  'update',
  'delete',
  'eq',
  'is',
  'not',
  'or',
  'gte',
  'lte',
  'order',
  'limit',
  'single',
  'maybeSingle',
  'abortSignal',
] as const;

export type FakeCall = { table: string; method: string; args: unknown[] };

export function createFakeBrowserClient(userId: string | null) {
  const results: Result[] = [];
  const calls: FakeCall[] = [];

  function from(table: string) {
    const chain: Record<string, unknown> = {};
    for (const method of CHAIN_METHODS) {
      chain[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return chain;
      };
    }
    // await 지점: 넣어 둔 응답이 없으면 테스트가 서버 호출을 예상하지 못한 것이라 바로 알린다
    chain.then = (
      resolve: (value: Result) => void,
      reject: (reason: unknown) => void,
    ) => {
      const next = results.shift();
      if (next) resolve(next);
      else reject(new Error(`예상하지 못한 서버 호출: ${table}`));
    };
    return chain;
  }

  const client = {
    from: vi.fn(from),
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: userId ? { user: { id: userId } } : null },
        error: null,
      })),
    },
  };

  return {
    client,
    calls,
    // 다음 서버 응답들을 순서대로 넣는다
    respond(...next: Result[]) {
      results.push(...next);
    },
    // 서버 호출이 실패하는 상황(오프라인)
    failNext(message = 'Failed to fetch') {
      results.push({ data: null, error: new Error(message) });
    },
  };
}
