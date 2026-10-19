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
    include: ['src/**/*.test.{ts,tsx}'],
    // 첫 테스트를 쓰기 전에도 CI가 실패하지 않게 둔 임시 설정. 첫 테스트를 쓰면 지운다
    passWithNoTests: true,
  },
});
