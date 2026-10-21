import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// 진짜 Supabase(로컬, Docker)에 붙는 통합 테스트 전용 설정. 단위 테스트(npm test)와 따로 둔 이유:
// - 단위 테스트는 가짜 DB라 어디서나 빠르게 돈다. 통합 테스트는 Supabase가 떠 있어야 하고 느리다
// - CI에서는 `supabase start`로 빈 DB를 띄워 마이그레이션을 처음부터 적용한 뒤 이것만 돌린다 (ci.yml integration)
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['tests/integration/**/*.test.ts'],
    // 실제 네트워크 요청이라 기본(5초)보다 넉넉히
    testTimeout: 20_000,
    // 파일끼리 같은 DB를 쓰므로 한 번에 하나씩. 익명 로그인 횟수 제한(시간당)도 덜 건드린다
    fileParallelism: false,
  },
});
