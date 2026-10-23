import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // tsconfig의 paths(@/* → src/*)를 테스트에서도 똑같이 쓰기 위해 맞춘다
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // supabase/functions/_shared: Edge Function(Deno)이 쓰는 순수 함수도 앱 테스트로 검사한다 (CI에 Deno가 없다)
    include: ['src/**/*.test.{ts,tsx}', 'supabase/functions/**/*.test.ts'],
  },
});
